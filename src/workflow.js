import crypto from "node:crypto";
import { STATES, renderVideoPrompt, renderImagePrompt, editableScript as composeEditableScript } from "./schema.js";
import { writeScript } from "./script-writer.js";
import { getProvider, getImageProvider } from "./providers.js";
import { preflight, outputCheck, repairPrompt } from "./quality.js";
import { save } from "./store.js";
import { readBrand } from "./brand-reader.js";

function event(job, state, message) {
  job.state = state; job.updatedAt = new Date().toISOString();
  job.events.push({ at: job.updatedAt, state, message });
  return save(job);
}

export function createJob(request) {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), state: STATES.RECEIVED, request, script: null, result: null, quality: [], attempts: 0, error: null, createdAt: now, updatedAt: now, events: [{ at: now, state: STATES.RECEIVED, message: "已接收自然语言需求" }] };
}

export async function prepare(job) {
  try {
    await event(job, STATES.SCRIPTING, "生成社媒脚本");
    job.brandContext = await readBrand(job.request.brandUrl);
    job.request.brandContext = job.brandContext;
    job.script = await writeScript(job.request);
    await event(job, STATES.STORYBOARDING, "整理四段式视频提示词");
    const check = job.request.outputType === "image" ? { passed: true, score: 100, issues: [] } : preflight(job.script, job.request);
    job.quality.push({ stage: "preflight", ...check });
    if (!check.passed) job.script = repairPrompt(job.script, check.issues);
    job.editableScript = composeEditableScript(job.script, job.request.outputType);
    await event(job, STATES.AWAITING_CONFIRMATION, "脚本已完成，等待用户选择生图或视频");
  } catch (e) {
    job.error = e.message;
    await event(job, STATES.FAILED, e.message);
  }
}

export async function refineImage(job, instruction) {
  try {
    if (job.state !== STATES.COMPLETED || job.request.outputType !== "image") throw new Error("只有已完成的图片任务可以继续优化");
    if (typeof instruction !== "string" || instruction.trim().length < 3) throw new Error("请填写具体的调整方向");
    job.revisions ||= [];
    if (job.result?.imageUrl) job.revisions.push({ at: new Date().toISOString(), instruction: instruction.trim(), imageUrl: job.result.imageUrl });
    await event(job, STATES.GENERATING, "根据商家反馈优化图片");
    const provider = getImageProvider(job.request.provider);
    const prompt = `${job.editableScript}\n\n本轮调整要求：${instruction.trim()}\n保持未提及部分不变，输出优化后的完整画面。`;
    job.result = await provider.generate({ prompt, aspectRatio: job.request.aspectRatio });
    const check = outputCheck(job.result); job.quality.push({ stage: "refinement", attempt: job.revisions.length, ...check });
    if (!check.passed) throw new Error(check.issues.join("；"));
    await event(job, STATES.COMPLETED, "图片优化完成");
  } catch (error) { job.error = error.message; await event(job, STATES.FAILED, error.message); }
}

export async function generate(job, outputType, editedScript) {
  try {
    if (job.state !== STATES.AWAITING_CONFIRMATION) throw new Error("当前任务不在待确认状态");
    if (!["image", "video"].includes(outputType)) throw new Error("请选择生成图片或视频");
    job.request.outputType = outputType;
    if (typeof editedScript === "string" && editedScript.trim().length >= 10) job.editableScript = editedScript.trim();
    const isImage = job.request.outputType === "image";
    let check;
    const provider = isImage ? getImageProvider(job.request.provider) : getProvider(job.request.provider);
    const max = Math.max(0, Number(process.env.MAX_RETRIES) || 2);
    for (let attempt = 0; attempt <= max; attempt++) {
      job.attempts = attempt + 1;
      await event(job, attempt ? STATES.RETRYING : STATES.GENERATING, attempt ? `第 ${attempt} 次自动重试` : `通过 ${provider.name} 生成${isImage ? "图片" : "720p视频"}`);
      try {
        const generatedPrompt = job.editableScript || (isImage ? renderImagePrompt(job.script, job.request) : renderVideoPrompt(job.script.prompt));
        job.result = await provider.generate({ prompt: generatedPrompt, aspectRatio: job.request.aspectRatio, resolution: "720p", duration: Math.max(4, Math.min(15, Math.round(job.request.targetSeconds))), subjectRef: job.request.subjectRef, sceneRef: job.request.sceneRef });
        await event(job, STATES.QUALITY_CHECK, "检查生成结果完整性");
        check = outputCheck(job.result); job.quality.push({ stage: "output", attempt: attempt + 1, ...check });
        if (check.passed) { await event(job, STATES.COMPLETED, "工作流完成"); return; }
        job.script = repairPrompt(job.script, check.issues);
      } catch (e) {
        job.quality.push({ stage: "provider", attempt: attempt + 1, passed: false, score: 0, issues: [e.message] });
        if (e.retryable === false || attempt === max) throw e;
      }
    }
    throw new Error("质检未通过，已用尽重试次数");
  } catch (e) {
    job.error = e.message;
    await event(job, STATES.FAILED, e.message);
  }
}

// Convenience entry point used by tests and non-interactive callers.
export async function run(job) {
  const requested = job.request.outputType || "video";
  await prepare(job);
  if (job.state === STATES.AWAITING_CONFIRMATION) await generate(job, requested);
}
