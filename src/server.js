import "./env.js";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRequest } from "./schema.js";
import { createJob, prepare, generate, refineImage } from "./workflow.js";
import { save, get, list } from "./store.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
const send = (res, status, body, type = "application/json; charset=utf-8") => { res.writeHead(status, { "content-type": type, "cache-control": "no-store" }); res.end(type.startsWith("application/json") ? JSON.stringify(body) : body); };
async function body(req) { const chunks = []; for await (const c of req) chunks.push(c); return JSON.parse(Buffer.concat(chunks).toString() || "{}"); }

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/api/workflows") {
      const job = createJob(validateRequest(await body(req))); await save(job); void prepare(job);
      return send(res, 202, job);
    }
    if (req.method === "GET" && url.pathname === "/api/workflows") return send(res, 200, await list());
    const match = url.pathname.match(/^\/api\/workflows\/([\w-]+)$/);
    if (req.method === "GET" && match) { const job = await get(match[1]); return send(res, job ? 200 : 404, job || { error: "未找到任务" }); }
    const confirm = url.pathname.match(/^\/api\/workflows\/([\w-]+)\/confirm$/);
    if (req.method === "POST" && confirm) {
      const job = await get(confirm[1]); if (!job) return send(res, 404, { error: "未找到任务" });
      if (job.state !== "awaiting_confirmation") return send(res, 409, { error: "脚本尚未完成或任务已确认，请等待页面显示确认按钮" });
      const input = await body(req); if (!["image", "video"].includes(input.outputType)) return send(res, 400, { error: "请选择图片或视频" });
      void generate(job, input.outputType, input.editedScript); return send(res, 202, job);
    }
    const refine = url.pathname.match(/^\/api\/workflows\/([\w-]+)\/refine$/);
    if (req.method === "POST" && refine) {
      const job = await get(refine[1]); if (!job) return send(res, 404, { error: "未找到任务" });
      const input = await body(req); void refineImage(job, input.instruction); return send(res, 202, job);
    }
    if (req.method === "GET" && ["/", "/index.html", "/app.js", "/style.css", "/flow.css", "/brand.css", "/method.css"].includes(url.pathname)) {
      const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
      const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
      return send(res, 200, await fs.readFile(path.join(root, name), "utf8"), types[path.extname(name)]);
    }
    if (req.method === "GET" && url.pathname.startsWith("/outputs/generated/")) {
      const name = path.basename(url.pathname); const data = await fs.readFile(path.resolve("outputs", "generated", name));
      res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" }); return res.end(data);
    }
    send(res, 404, { error: "Not found" });
  } catch (e) { send(res, 400, { error: e.message }); }
});
const port = Number(process.env.PORT) || 8787;
const host = process.env.HOST || "127.0.0.1";
server.listen(port, host, () => console.log(`PostPilot Video Flow: http://${host}:${port}`));
