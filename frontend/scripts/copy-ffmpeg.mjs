// 把 @ffmpeg/core 的核心文件复制到 public/ffmpeg/，
// 这样构建后它们随前端一起托管在本站（同源），无需依赖国外 CDN。
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// 必须用 ESM 版核心：@ffmpeg/ffmpeg 0.12 的 worker 是 module 类型，
// 通过 `await import(coreURL)` 加载核心，需要 ESM 的 `export default`（UMD 版会报 failed to import）。
const srcDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "esm");
const outDir = join(root, "public", "ffmpeg");

mkdirSync(outDir, { recursive: true });

for (const f of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
  const src = join(srcDir, f);
  if (!existsSync(src)) {
    console.error(`[copy-ffmpeg] 缺少 ${src}，请先 npm install`);
    process.exit(1);
  }
  copyFileSync(src, join(outDir, f));
  console.log(`[copy-ffmpeg] copied ${f}`);
}
