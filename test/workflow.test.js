import test from "node:test";
import assert from "node:assert/strict";
import { validateRequest, validatePrompt, renderVideoPrompt } from "../src/schema.js";
import { createJob, run, prepare, generate, refineImage } from "../src/workflow.js";
import { writeScript } from "../src/script-writer.js";

test("request defaults to vertical 720p", () => {
  const r = validateRequest({ brief: "做一条咖啡产品视频" });
  assert.equal(r.aspectRatio, "9:16"); assert.equal(r.resolution, "720p");
});
test("prompt rejects timestamps and BGM", () => {
  const errors = validatePrompt({ subject:"人",scene:"房间",sound:"加入BGM",shots:[{framing:"近景",action:"[0-3秒]抬头"}] });
  assert.equal(errors.length, 2);
});
test("renderer uses numbered shots without timestamps", () => {
  const text = renderVideoPrompt({ subject:"人",scene:"房间",sound:"只要环境音",shots:[{framing:"近景",action:"抬头"}] });
  assert.match(text, /镜头01/); assert.doesNotMatch(text, /0-3秒/);
});
test("mock workflow reaches completed", async () => {
  const job = createJob(validateRequest({ brief:"测试一键视频流程", provider:"mock" }));
  await run(job); assert.equal(job.state, "completed"); assert.equal(job.quality.at(-1).passed, true);
});
test("mock image workflow reaches completed", async () => {
  const job = createJob(validateRequest({ brief:"制作一张咖啡杯社媒主图", outputType:"image", provider:"mock" }));
  await run(job); assert.equal(job.state, "completed"); assert.equal(job.request.outputType, "image");
});
test("interactive workflow waits for confirmation", async () => {
  const job = createJob(validateRequest({ brief:"先审阅再生成", outputType:"image", provider:"mock" }));
  await prepare(job); assert.equal(job.state, "awaiting_confirmation"); assert.equal(job.attempts, 0);
  assert.match(job.editableScript, /构图/); assert.doesNotMatch(job.editableScript, /口播文案/);
  await generate(job, "image", "这是商家修改后的完整图片制作稿"); assert.equal(job.state, "completed"); assert.equal(job.request.outputType, "image");
  assert.equal(job.result.metadata.prompt, "这是商家修改后的完整图片制作稿");
  await refineImage(job, "背景更明亮，主体放大"); assert.equal(job.state, "completed");
  assert.match(job.result.metadata.prompt, /背景更明亮/);
});
test("publishing kit uses platform-native pearl commute copy", async () => {
  const old = { url: process.env.LLM_BASE_URL, key: process.env.LLM_API_KEY, model: process.env.LLM_MODEL };
  delete process.env.LLM_BASE_URL; delete process.env.LLM_API_KEY; delete process.env.LLM_MODEL;
  const script = await writeScript(validateRequest({ brief:"为通勤都市女性制作珍珠项链种草图，突出日常好搭配", platform:"小红书", outputType:"image" }));
  assert.equal(script.contentPackage.title, "通勤穿搭总差一点？原来是一条珍珠项链✨");
  assert.match(script.contentPackage.caption, /白衬衫/);
  assert.doesNotMatch(script.contentPackage.tags.join(" "), /平台运营|品牌内容|电商视觉/);
  if (old.url) process.env.LLM_BASE_URL = old.url; if (old.key) process.env.LLM_API_KEY = old.key; if (old.model) process.env.LLM_MODEL = old.model;
});
