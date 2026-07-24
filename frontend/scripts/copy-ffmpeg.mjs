// 把 @ffmpeg/core 的核心文件复制到 public/ffmpeg/，
// 这样构建后它们随前端一起托管在本站（同源），无需依赖国外 CDN。
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
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
