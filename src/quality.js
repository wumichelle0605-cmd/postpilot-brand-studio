import { validatePrompt } from "./schema.js";

export function preflight(script, request) {
  const issues = validatePrompt(script.prompt);
  if (request.resolution !== "720p") issues.push("首轮生成必须使用720p");
  if (request.subjectRef && !script.prompt.subject.includes(request.subjectRef)) issues.push("主体参考资产未被引用");
  return { passed: issues.length === 0, score: Math.max(0, 100 - issues.length * 25), issues };
}

export function outputCheck(result) {
  const issues = [];
  if (result.status !== "completed") issues.push("provider 未完成");
  if (!result.videoUrl && !result.imageUrl && !result.metadata?.simulated) issues.push("缺少生成结果地址");
  return { passed: issues.length === 0, score: issues.length ? 40 : 100, issues };
}

export function repairPrompt(script, issues) {
  const next = structuredClone(script);
  next.prompt.sound = "仅环境音与动作拟音；绝对不要BGM";
  next.prompt.shots = next.prompt.shots.slice(0, 6).map(s => ({ framing: s.framing || "中景", action: String(s.action).replace(/\[?\d+\s*[-~至]\s*\d+\s*秒\]?/g, "").trim() }));
  next.repairNotes = issues;
  return next;
}
