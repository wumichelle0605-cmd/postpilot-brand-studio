function localScript(req) {
  const brand = {
    summary: req.brandContext?.status === "read" ? `从公开页面的信息密度、视觉主题与产品表达来看，品牌适合以真实使用情境建立信任，再通过一个高度可感知的产品利益点形成记忆。内容不应只是陈列产品，而要让用户看到产品如何进入具体生活、解决具体问题，并保持主体、色彩和语言的一致性。` : "当前链接公开信息有限，现阶段以商家诉求、平台内容语境和产品使用场景建立初步判断。建议后续补充品牌核心人群、价格带、代表产品、视觉规范与历史高互动内容，以进一步提高策略确定性。",
    tone: "表达克制但不冷淡，画面真实而有设计感；先用用户熟悉的生活情境降低理解成本，再用明确利益点、材质细节和情绪价值构成品牌记忆。",
    audience: req.audience,
    viralDirection: `${req.platform}方向采用“第一眼钩子 - 用户问题 - 单一卖点 - 场景证明 - 轻量行动引导”的内容结构。标题负责制造具体好奇，素材负责给出证据，正文补充体验与选择理由，避免泛泛赞美。`,
    materialAdvice: req.outputType === "image" ? "优先制作单主体强视觉主图：主体占据明确视觉权重，用场景和光线补充品牌情绪，以材质、动作或使用痕迹提供真实证据；不要同时堆叠多个卖点。" : "开场两到三个镜头必须完成注意力捕获、问题建立和核心卖点露出；中段用动作及细节证明，结尾形成品牌记忆。控制镜头数量，保持人物、产品、场景比例和视觉连续性。"
  };
  const contentPackage = { title: `${req.brief.slice(0, 18)}｜原来关键在这里`, caption: `最近认真研究了这个使用场景，真正影响体验的往往不是参数越多越好，而是一个产品能否在真实生活里减少麻烦。\n\n这次把重点放在最容易被忽略的细节上：使用是否顺手、材质是否经得起近看、核心卖点能不能被直观验证。没有堆砌夸张形容词，而是用场景、动作和细节让产品自己说话。\n\n如果你也在做类似选择，可以先看自己最常使用的场景，再判断这个卖点是不是刚需。`, cta: "先收藏，购买前回来对照；也欢迎留言说说你最在意的使用细节。", tags: [`#${req.platform}运营`, "#品牌内容", "#好物分享", "#电商视觉", "#真实体验"] };
  if (req.outputType === "image") return {
    brandAnalysis: brand, contentPackage,
    title: req.brief.slice(0, 32),
    concept: `围绕“${req.brief}”设计一张具有停留感的${req.platform}主视觉。`,
    prompt: {
      subject: req.subjectRef ? `使用主体参考资产 ${req.subjectRef}` : "产品或核心主体清晰突出，细节真实",
      scene: req.sceneRef ? `使用场景参考资产 ${req.sceneRef}` : "与主题匹配的简洁生活方式场景",
      composition: `${req.aspectRatio}构图，主体位于视觉中心，前后景层次清晰，留出自然呼吸空间`,
      lighting: "柔和电影光线，自然高光与阴影，色彩协调",
      style: `${req.tone}，高级商业摄影，真实材质，不要文字和品牌水印`
    }
  };
  const count = Math.max(2, Math.min(6, Math.round(req.targetSeconds / 5)));
  const beats = [
    ["近景", `用一个反常识画面提出问题：${req.brief}`],
    ["中景", "主体快速展示痛点，动作自然明确"],
    ["特写", "展示关键方法或产品细节"],
    ["中近景", "给出前后变化或可验证结果"],
    ["近景", "主体做出总结并引导评论或收藏"],
    ["全景", "以干净的品牌记忆画面收尾"]
  ].slice(0, count);
  return {
    brandAnalysis: brand, contentPackage,
    title: req.brief.slice(0, 32),
    hook: `你可能一直低估了：${req.brief}`,
    narration: beats.map((_, i) => `第${i + 1}步，把重点讲清楚。`).join(" "),
    cta: "收藏这条，下一次直接照着做。",
    prompt: {
      subject: req.subjectRef ? `使用已上传主体参考资产 ${req.subjectRef}` : "固定同一位自然出镜的社媒创作者，人物外观全片一致",
      scene: req.sceneRef ? `使用场景参考资产 ${req.sceneRef}` : "简洁真实的创作空间，主体与环境比例自然",
      sound: "只生成动作对应的环境音和拟音，不要BGM",
      shots: beats.map(([framing, action]) => ({ framing, action }))
    }
  };
}

export async function writeScript(req) {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) return localScript(req);
  const common = `必须额外输出 brandAnalysis 和 contentPackage。brandAnalysis包含summary,tone,audience,viralDirection,materialAdvice，必须基于抓取到的页面标题、描述与正文证据进行专业推断，区分事实与推断；信息不足时明确说明，不得虚构粉丝数、销量或品牌事实。策略需要具体解释平台用户为什么停留、为什么相信、为什么互动，给出可执行的素材取舍。contentPackage包含title,caption,cta,tags：标题有具体利益或情绪钩子但不标题党；正文300-600字，具有自然口语感、段落节奏、真实体验和平台网感；tags为5-8个，包含品类词、场景词和人群词。输出文字中不要出现任何网址。脚本必须与viralDirection和materialAdvice逐项呼应，专业、详细，避免空泛形容词。`;
  const system = req.outputType === "image"
    ? `你是 PostPilot 社媒品牌策略师和视觉总监。只输出JSON，字段为brandAnalysis,contentPackage,title,concept,prompt；prompt包含subject,scene,composition,lighting,style。为单张社媒图片写视觉制作稿，不要口播、声音、时间线或镜头列表，不要在画面内生成文字。${common}`
    : `你是 PostPilot 社媒品牌策略师和短视频导演。只输出JSON，字段为brandAnalysis,contentPackage,title,hook,narration,cta,prompt。prompt包含subject,scene,sound,shots；shots元素只有framing和action。镜头不用时间戳；声音仅环境音/拟音，禁止BGM。${common}`;
  let response;
  try {
    response = await fetch(`${process.env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${process.env.LLM_API_KEY}` }, signal: AbortSignal.timeout(12000),
      body: JSON.stringify({ model: process.env.LLM_MODEL, temperature: 0.5, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify(req) }] })
    });
  } catch (error) {
    const fallback = localScript(req); fallback.generationWarning = `脚本模型连接超时，已切换本地脚本：${error.message}`; return fallback;
  }
  if (!response.ok) {
    const raw = await response.text();
    let detail; try { detail = JSON.parse(raw); } catch { detail = null; }
    const fallback = localScript(req);
    fallback.generationWarning = `脚本模型不可用，已切换本地脚本：${detail?.error?.message || `HTTP ${response.status}`}`;
    return fallback;
  }
  const data = await response.json();
  const content = data.choices[0].message.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(content);
}
