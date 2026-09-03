export const STATES = Object.freeze({
  RECEIVED: "received",
  SCRIPTING: "scripting",
  STORYBOARDING: "storyboarding",
  AWAITING_CONFIRMATION: "awaiting_confirmation",
  GENERATING: "generating",
  QUALITY_CHECK: "quality_check",
  RETRYING: "retrying",
  COMPLETED: "completed",
  FAILED: "failed"
});

export const terminalStates = new Set([STATES.COMPLETED, STATES.FAILED]);

export function validateRequest(input) {
  const brief = input?.creativeRequest || input?.brief;
  if (!input || typeof brief !== "string" || brief.trim().length < 4) {
    throw new Error("素材诉求至少需要 4 个字符");
  }
  const platform = input.platform || "抖音";
  const aspectRatio = input.aspectRatio || (platform === "抖音" || platform === "小红书" ? "9:16" : "16:9");
  if (!["9:16", "16:9", "1:1", "3:4"].includes(aspectRatio)) throw new Error("不支持的画面比例");
  return {
    brief: brief.trim(), creativeRequest: brief.trim(), brandUrl: String(input.brandUrl || "").trim() || null, platform, aspectRatio,
    outputType: ["image", "video"].includes(input.outputType) ? input.outputType : null,
    audience: String(input.audience || "泛兴趣用户"),
    tone: String(input.tone || "清晰、有节奏、可信"),
    targetSeconds: Math.max(5, Math.min(90, Number(input.targetSeconds) || 20)),
    subjectRef: input.subjectRef || null,
    sceneRef: input.sceneRef || null,
    provider: input.provider || process.env.VIDEO_PROVIDER || "mock",
    resolution: "720p"
  };
}

export function validatePrompt(prompt) {
  const errors = [];
  for (const key of ["subject", "scene", "sound", "shots"]) if (!prompt[key]) errors.push(`缺少 ${key}`);
  if (!Array.isArray(prompt.shots) || !prompt.shots.length) errors.push("至少需要一个镜头");
  if (/\[?\d+\s*[-~至]\s*\d+\s*秒\]?/.test(JSON.stringify(prompt.shots))) errors.push("镜头不能使用时间戳");
  if (/bgm|背景音乐/i.test(prompt.sound) && !/不要|无|不生成/.test(prompt.sound)) errors.push("不允许生成 BGM");
  if (prompt.shots?.length > 8) errors.push("镜头过多");
  return errors;
}

export function renderVideoPrompt(p) {
  return [
    `主体：${p.subject}`,
    `场景：${p.scene}`,
    `声音：${p.sound}`,
    ...p.shots.map((s, i) => `镜头${String(i + 1).padStart(2, "0")}：${s.framing}，${s.action}`),
    "约束：无字幕、无水印、不生成BGM。"
  ].join("\n");
}

export function renderImagePrompt(script, request) {
  const p = script.prompt;
  return [
    `${request.platform}社交媒体视觉主图，${request.aspectRatio}构图。`,
    `主题：${script.title}。`,
    `主体：${p.subject}。`,
    `场景：${p.scene}。`,
    `构图：${p.composition}。`, `光线与色彩：${p.lighting}。`, `风格：${p.style}。`
  ].join("");
}

export function editableScript(script, outputType) {
  const p = script.prompt;
  if (outputType === "image") return [`视觉主题：${script.title}`, `创意说明：${script.concept}`, `主体：${p.subject}`, `场景：${p.scene}`, `构图：${p.composition}`, `光线与色彩：${p.lighting}`, `风格与约束：${p.style}`].join("\n\n");
  return [`标题：${script.title}`, `开场钩子：${script.hook}`, `口播文案：${script.narration}`, `行动引导：${script.cta}`, `主体：${p.subject}`, `场景：${p.scene}`, `声音：${p.sound}`, ...p.shots.map((s,i)=>`镜头${String(i+1).padStart(2,"0")}：${s.framing}，${s.action}`), "约束：无字幕、无水印、不生成BGM。"].join("\n\n");
}
