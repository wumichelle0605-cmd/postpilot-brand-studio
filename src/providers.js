import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const delay = ms => new Promise(r => setTimeout(r, ms));

class MockProvider {
  name = "mock";
  async generate(input) {
    await delay(500);
    return { externalId: `mock_${crypto.randomUUID()}`, status: "completed", videoUrl: null, metadata: { simulated: true, prompt: input.prompt } };
  }
}

class MockImageProvider {
  name = "mock-image";
  async generate(input) { await delay(300); return { externalId: `mock_img_${crypto.randomUUID()}`, status: "completed", imageUrl: null, metadata: { simulated: true, prompt: input.prompt } }; }
}

class ArkImageProvider {
  name = "ark-image";
  async generate(input) {
    const apiKey = process.env.ARK_API_KEY;
    const model = process.env.ARK_IMAGE_MODEL || "doubao-seedream-5-0-pro-260628";
    if (!apiKey) throw new Error("缺少 ARK_API_KEY");
    const base = (process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const size = "2K";
    const res = await fetch(`${base}/images/generations`, { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ model, prompt: input.prompt, response_format: "url", size, stream: false, watermark: true }) });
    const raw = await res.text();
    if (!res.ok) {
      let detail; try { detail = JSON.parse(raw); } catch { detail = null; }
      const error = new Error(`方舟图片生成失败 ${res.status}: ${detail?.error?.message || raw.slice(0, 300)}`);
      error.code = detail?.error?.code; error.retryable = !["ModelNotOpen", "AuthenticationError", "InvalidParameter", "AccessDenied", "SetLimitExceeded"].includes(error.code); throw error;
    }
    const data = JSON.parse(raw); const remote = data.data?.[0]?.url;
    if (!remote) throw new Error("图片接口未返回 URL");
    const image = await fetch(remote); if (!image.ok) throw new Error(`图片下载失败 ${image.status}`);
    const filename = `${crypto.randomUUID()}.jpeg`; const outputDir = path.resolve("outputs", "generated");
    await fs.mkdir(outputDir, { recursive: true }); await fs.writeFile(path.join(outputDir, filename), Buffer.from(await image.arrayBuffer()));
    return { externalId: data.id || filename, status: "completed", imageUrl: `/outputs/generated/${filename}`, metadata: { model, remoteExpires: "24h" } };
  }
}

class FalProvider {
  name = "fal";
  async generate(input) {
    if (!process.env.FAL_KEY) throw new Error("缺少 FAL_KEY");
    const imageMode = Boolean(input.subjectRef || input.sceneRef);
    const model = imageMode ? (process.env.FAL_MODEL_IMAGE || "bytedance/seedance-2.0/image-to-video") : (process.env.FAL_MODEL_TEXT || "bytedance/seedance-2.0/text-to-video");
    const body = { prompt: input.prompt, resolution: "720p", aspect_ratio: input.aspectRatio, generate_audio: true };
    if (imageMode) body.image_url = input.subjectRef || input.sceneRef;
    const res = await fetch(`https://fal.run/${model}`, { method: "POST", headers: { authorization: `Key ${process.env.FAL_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`fal 返回 ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return { externalId: data.request_id || crypto.randomUUID(), status: "completed", videoUrl: data.video?.url, metadata: { seed: data.seed, model } };
  }
}

class ArkProvider {
  name = "ark";
  async generate(input) {
    const apiKey = process.env.ARK_API_KEY;
    const model = process.env.ARK_MODEL;
    if (!apiKey || !model) throw new Error("缺少 ARK_API_KEY 或 ARK_MODEL");
    const base = (process.env.ARK_BASE_URL || "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    const content = [{ type: "text", text: input.prompt }];
    // Ark accepts reference images as image_url content items.
    for (const url of [input.subjectRef, input.sceneRef].filter(Boolean)) content.push({ type: "image_url", image_url: { url } });
    const res = await fetch(`${base}/contents/generations/tasks`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ model, content, ratio: input.aspectRatio, duration: Math.max(4, Math.min(15, input.duration || 5)), resolution: "720p", watermark: false })
    });
    if (!res.ok) {
      const raw = (await res.text()).slice(0, 600);
      let detail;
      try { detail = JSON.parse(raw); } catch { detail = null; }
      const error = new Error(`方舟提交失败 ${res.status}: ${detail?.error?.message || raw}`);
      error.code = detail?.error?.code;
      error.retryable = !["ModelNotOpen", "AuthenticationError", "InvalidParameter", "AccessDenied"].includes(error.code);
      throw error;
    }
    const created = await res.json();
    if (!created.id) throw new Error("方舟未返回任务 ID");
    for (let i = 0; i < 120; i++) {
      await delay(5000);
      const statusRes = await fetch(`${base}/contents/generations/tasks/${encodeURIComponent(created.id)}`, { headers: { authorization: `Bearer ${apiKey}` } });
      if (!statusRes.ok) throw new Error(`方舟查询失败 ${statusRes.status}`);
      const status = await statusRes.json();
      if (["failed", "error", "cancelled", "canceled"].includes(status.status)) throw new Error(status.error?.message || status.error || "方舟生成失败");
      const videoUrl = status.content?.video_url || status.video_url || status.output?.video_url;
      if (["succeeded", "completed"].includes(status.status) && videoUrl) return { externalId: created.id, status: "completed", videoUrl, metadata: { model, usage: status.usage } };
    }
    throw new Error("方舟生成等待超时");
  }
}

class GenericProvider {
  name = "generic";
  async generate(input) {
    if (!process.env.GENERIC_VIDEO_SUBMIT_URL) throw new Error("缺少 GENERIC_VIDEO_SUBMIT_URL");
    const headers = { "content-type": "application/json" };
    if (process.env.GENERIC_VIDEO_TOKEN) headers.authorization = `Bearer ${process.env.GENERIC_VIDEO_TOKEN}`;
    const res = await fetch(process.env.GENERIC_VIDEO_SUBMIT_URL, { method: "POST", headers, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(`通用 provider 返回 ${res.status}`);
    const data = await res.json();
    if (data.videoUrl || data.video_url) return { externalId: data.id, status: "completed", videoUrl: data.videoUrl || data.video_url, metadata: data };
    if (!data.id || !process.env.GENERIC_VIDEO_STATUS_URL) throw new Error("异步 provider 必须返回 id 并配置状态 URL");
    for (let i = 0; i < 60; i++) {
      await delay(5000);
      const statusRes = await fetch(process.env.GENERIC_VIDEO_STATUS_URL.replace("{id}", encodeURIComponent(data.id)), { headers });
      const status = await statusRes.json();
      if (["failed", "error"].includes(status.status)) throw new Error(status.error || "provider 生成失败");
      if (["completed", "succeeded"].includes(status.status)) return { externalId: data.id, status: "completed", videoUrl: status.videoUrl || status.video_url, metadata: status };
    }
    throw new Error("provider 等待超时");
  }
}

export function getProvider(name) {
  if (name === "mock") return new MockProvider();
  if (name === "fal") return new FalProvider();
  if (name === "ark") return new ArkProvider();
  if (name === "generic") return new GenericProvider();
  throw new Error(`未知 provider: ${name}`);
}

export function getImageProvider(name) {
  if (name === "mock") return new MockImageProvider();
  if (["ark", "ark-image"].includes(name)) return new ArkImageProvider();
  throw new Error(`图片模式不支持 provider: ${name}`);
}
