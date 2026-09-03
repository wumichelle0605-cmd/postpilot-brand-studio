import fs from "node:fs/promises";
import path from "node:path";

const dir = path.resolve(".data");
const file = path.join(dir, "workflows.json");

async function readAll() {
  try { return JSON.parse(await fs.readFile(file, "utf8")); } catch (e) { if (e.code === "ENOENT") return {}; throw e; }
}
export async function save(job) {
  await fs.mkdir(dir, { recursive: true });
  const all = await readAll(); all[job.id] = job;
  await fs.writeFile(file, JSON.stringify(all, null, 2));
}
export async function get(id) { return (await readAll())[id] || null; }
export async function list() { return Object.values(await readAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30); }
