import dns from "node:dns/promises";
import net from "node:net";

function privateIp(ip) {
  return ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[01])\./.test(ip) || ip.startsWith("169.254.") || ip.startsWith("fc") || ip.startsWith("fd");
}
function clean(html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "";
  const desc = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']*)/i)?.[1] || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["'](?:description|og:description)["']/i)?.[1] || "";
  const text = html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
  return { title: title.replace(/<[^>]+>/g,"").trim(), description: desc.trim(), excerpt: text.slice(0, 6000) };
}
export async function readBrand(url) {
  if (!url) return { status: "not_provided", sourceUrl: null, title: "", description: "", excerpt: "" };
  const parsed = new URL(url); if (!["http:","https:"].includes(parsed.protocol)) throw new Error("品牌链接仅支持 http/https");
  const addresses = await dns.lookup(parsed.hostname, { all: true }); if (!addresses.length || addresses.some(a => privateIp(a.address))) throw new Error("品牌链接地址不安全");
  try {
    const response = await fetch(parsed, { redirect: "follow", signal: AbortSignal.timeout(10000), headers: { "user-agent": "Mozilla/5.0 PostPilotBrandReader/1.0", accept: "text/html" } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const type = response.headers.get("content-type") || ""; if (!type.includes("text/html")) throw new Error("链接不是网页");
    const html = (await response.text()).slice(0, 500000);
    return { status: "read", sourceUrl: url, finalUrl: response.url, ...clean(html) };
  } catch (error) {
    return { status: "limited", sourceUrl: url, title: parsed.hostname, description: "页面受登录或反爬限制，仅能基于链接域名与商家诉求分析。", excerpt: "", error: error.message };
  }
}
