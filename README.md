# PostPilot Brand Studio / 品牌运营作品生成器

把一句社媒选题自动转换为脚本，再生成社媒图片或视频。图片通过 Ark Seedream 生成并自动下载到本地；视频可调用 Ark/Fal Seedance，或用通用适配器连接即梦/企业网关。

## 运行

要求 Node.js 20+。

```bash
cp .env.example .env
npm start
```

打开 `http://localhost:8787`。测试：

```bash
npm test
```

Node 不会自动加载 `.env`；本地可用 `node --env-file=.env src/server.js`，或由部署平台注入环境变量。

## 一键调用

```bash
curl -X POST http://localhost:8787/api/workflows \
  -H 'content-type: application/json' \
  -d '{"brief":"给便携咖啡杯做一条种草视频，突出不漏水和易清洗","platform":"小红书","targetSeconds":20}'
```

返回 `id` 后读取 `GET /api/workflows/:id`。任务数据保存在 `.data/workflows.json`。

## 状态机

```text
received → scripting → storyboarding → generating → quality_check → completed
                                           ↑              │
                                           └── retrying ←─┘
                         任一不可恢复错误 ───────────────→ failed
```

- 脚本：默认本地生成；设置 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 后使用 OpenAI-compatible chat completions。
- Prompt 预检：必须包含主体、场景、声音、镜头；禁止时间戳、BGM；最多 8 个镜头；固定首轮 720p。
- 生成后质检：检查 provider 状态和视频 URL。失败会精简/修复 Prompt，按 `MAX_RETRIES` 重试。
- 更高级的画面质检可在 `src/quality.js` 的 `outputCheck` 接入视觉模型，检查人物一致性、畸变、字幕/水印和动作完成度。

## Provider 层

选择 `provider: mock | ark | fal | generic`：

- `mock`：完整模拟成功链路。
- `ark`：火山方舟原生异步视频 API。设置 `ARK_API_KEY` 和 `ARK_MODEL`（已开通的模型 ID 或 `ep-...` Endpoint ID），自动提交并轮询 Seedance 任务。`ModelNotOpen`、鉴权和参数错误会立即停止，不做无效重试。
- `fal`：服务端调用 Seedance。设 `FAL_KEY`；有主体或场景参考 URL 时自动走 image-to-video，否则走 text-to-video。模型 ID 可通过环境变量替换。
- `generic`：POST 到 `GENERIC_VIDEO_SUBMIT_URL`，适合接即梦签名网关或其他供应商。同步返回 `{videoUrl,id?}`；异步返回 `{id}` 后，程序轮询 `GENERIC_VIDEO_STATUS_URL`（其中 `{id}` 为占位符），直到 `{status:"completed",videoUrl:"..."}`。

即梦火山引擎接口需要服务端 AK/SK 签名，建议在企业网关完成签名后接 `generic`，避免凭证进入浏览器。所有 key 都只由服务端读取。

## Prompt 契约

正式 JSON Schema 位于 `schemas/video-prompt.schema.json`。渲染给视频模型时固定为：

```text
主体：<角色资产或一句主体描述>
场景：<场景资产或一句环境描述>
声音：只生成环境音和拟音，不要BGM
镜头01：<景别>，<动作>
镜头02：<景别>，<动作>
约束：无字幕、无水印、不生成BGM。
```

参考图表达过的外观与环境不会在文字里重复；时长主要由镜头数量控制，不写 `[0-3秒]`；首轮固定 720p，4K 放大属于后处理扩展点。

## 生产化下一步

当前持久化适合单机演示。多实例部署时，把 `src/store.js` 换成数据库/队列，并把 `run(job)` 放入 worker；provider 回调可替代轮询。真实视频内容质检、Topaz/云端超分和自动发布应作为独立状态接在 `completed` 之前。

## Render 公网部署

仓库包含 `render.yaml`。在 Render 连接 GitHub 仓库并创建 Blueprint，然后设置服务端密钥 `ARK_API_KEY` 和 `LLM_API_KEY`。不要把 `.env` 提交到 GitHub。
