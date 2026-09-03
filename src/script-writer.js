function buildLocalContentPackage(req) {
  const isPearlCommute = /珍珠|项链/.test(req.brief) && /通勤|都市女性|搭配/.test(req.brief);
  if (isPearlCommute) return {
    title: "通勤穿搭总差一点？原来是一条珍珠项链✨",
    caption: "以前总觉得珍珠项链太正式，像是只有参加宴会、穿礼服时才用得上。\n\n直到最近开始尝试把它戴进日常通勤穿搭里，才发现珍珠真正好看的地方，不是“贵气”，而是它能让普通衣服瞬间多一点精致感。\n\n早上赶时间，一件白衬衫配西装裤，戴上它以后，整个人看起来会利落很多；周末换成针织衫或简单的黑色连衣裙，又会显得温柔、有气质。它不会抢走整套穿搭的注意力，但会让人觉得：今天好像认真打扮过。\n\n我很喜欢这种恰到好处的存在感。珍珠的光泽不是特别夸张的亮，而是靠近皮肤时很柔和，阳光下会有自然的层次。长度落在锁骨附近，对圆领、V 领和衬衫都比较友好，也不用为了配它专门买新衣服。\n\n如果你平时的衣柜以黑、白、灰、米色为主，又总觉得通勤造型容易显得单调，可以试试从一条珍珠项链开始。它不是只能戴一次的“仪式感单品”，而是一件可以反复进入日常生活的小配饰。",
    cta: "你更喜欢珍珠搭衬衫还是针织衫？留言告诉我，也可以先收藏这份通勤搭配灵感。",
    tags: ["#通勤穿搭", "#珍珠项链", "#首饰分享", "#气质穿搭", "#职场穿搭", "#日常配饰", "#小众首饰"]
  };
  const topic = req.brief.replace(/[。！？].*$/s, "").slice(0, 18);
  return {
    title: `${topic}，真正影响体验的是这一点✨`,
    caption: `以前选这类产品时，我也很容易被参数和漂亮图片带着走。真正放进日常生活以后才发现，好不好用往往藏在一个很具体的场景里。\n\n这次我把重点放在“${req.brief}”上，没有刻意堆砌卖点，而是从真实使用动作、材质近看效果和搭配难度去判断。最打动我的不是它看起来多夸张，而是使用时足够自然，不需要为了它改变原本的生活习惯。\n\n如果你也在做类似选择，建议先想清楚自己最高频的使用场景，再看这个产品能不能真正减少麻烦、带来可感知的变化。适合自己的东西，不一定第一眼最张扬，但通常会成为反复使用的那一个。`,
    cta: "你选这类产品时最在意什么？欢迎留言交流，也可以先收藏，做决定前再回来看看。",
    tags: ["#好物分享", "#真实体验", "#生活方式", "#选购建议", "#日常灵感", `#${req.platform}`]
  };
}

function localScript(req) {
  const brand = {
    summary: req.brandContext?.status === "read" ? `从公开页面的信息密度、视觉主题与产品表达来看，品牌适合以真实使用情境建立信任，再通过一个高度可感知的产品利益点形成记忆。内容不应只是陈列产品，而要让用户看到产品如何进入具体生活、解决具体问题，并保持主体、色彩和语言的一致性。` : "当前链接公开信息有限，现阶段以商家诉求、平台内容语境和产品使用场景建立初步判断。建议后续补充品牌核心人群、价格带、代表产品、视觉规范与历史高互动内容，以进一步提高策略确定性。",
    tone: "表达克制但不冷淡，画面真实而有设计感；先用用户熟悉的生活情境降低理解成本，再用明确利益点、材质细节和情绪价值构成品牌记忆。",
    audience: req.audience,
    viralDirection: `${req.platform}方向采用“第一眼钩子 - 用户问题 - 单一卖点 - 场景证明 - 轻量行动引导”的内容结构。标题负责制造具体好奇，素材负责给出证据，正文补充体验与选择理由，避免泛泛赞美。`,
    materialAdvice: req.outputType === "image" ? "优先制作单主体强视觉主图：主体占据明确视觉权重，用场景和光线补充品牌情绪，以材质、动作或使用痕迹提供真实证据；不要同时堆叠多个卖点。" : "开场两到三个镜头必须完成注意力捕获、问题建立和核心卖点露出；中段用动作及细节证明，结尾形成品牌记忆。控制镜头数量，保持人物、产品、场景比例和视觉连续性。"
  };
  const contentPackage = buildLocalContentPackage(req);
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
  const common = `必须额外输出 brandAnalysis 和 contentPackage。brandAnalysis包含summary,tone,audience,viralDirection,materialAdvice，必须基于抓取到的页面标题、描述与正文证据进行专业推断，区分事实与推断；信息不足时明确说明，不得虚构粉丝数、销量或品牌事实。策略需要具体解释平台用户为什么停留、为什么相信、为什么互动，给出可执行的素材取舍。

contentPackage必须是一篇可直接发布的${req.platform}原生内容，包含title,caption,cta,tags，并遵守：
1. 标题使用“真实困扰/反差发现 + 具体品类或收益”的口语钩子，可用1个自然emoji，不写品牌公关标题。例如珠宝通勤场景可写“通勤穿搭总差一点？原来是一条珍珠项链✨”。
2. 正文300-600字，以第一人称真实体验开场；第二段写认知变化；中段用2-3个具体生活场景、搭配或使用细节证明单一核心卖点；结尾给出有帮助的选择建议。保持短段落和自然口语，避免“赋能、匠心、品质之选、闭眼入”等广告腔，不虚构购买经历、功效、销量或身份。
3. cta是与内容直接相关、容易回答的问题或收藏理由，不使用生硬购买催促。
4. tags为5-8个真正用于发布的标签，覆盖品类、场景、人群和风格；禁止出现“平台运营、品牌内容、电商视觉”等幕后制作标签。
5. 标题、正文和tags必须围绕brandAnalysis.viralDirection同一个内容钩子，并与本次生成的图片/视频场景一致。
输出文字中不要出现任何网址。脚本必须与viralDirection和materialAdvice逐项呼应，专业、详细，避免空泛形容词。`;
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
