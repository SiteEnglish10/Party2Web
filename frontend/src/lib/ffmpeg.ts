import { FFmpeg } from "@ffmpeg/ffmpeg";

// 自托管 ffmpeg core（ESM 单线程版）：由 scripts/copy-ffmpeg.mjs 复制到 public/ffmpeg/，
// 构建后随前端一起托管在本站同源路径 /ffmpeg/，不依赖 unpkg 等国外 CDN。
// 注意：@ffmpeg/ffmpeg 0.12 的 worker 是 module 类型，会用 `await import(coreURL)` 加载核心，
// 因此必须是 ESM 版核心，且直接用同源 URL 引入（无需 toBlobURL）。
const CORE_BASE = "/ffmpeg";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

export async function getFFmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loading) return loading;

  loading = (async () => {
    const inst = new FFmpeg();
    if (onProgress) {
      inst.on("progress", ({ progress }) => onProgress(Math.min(1, progress)));
    }
    await inst.load({
      coreURL: `${CORE_BASE}/ffmpeg-core.js`,
      wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
    });
    ffmpeg = inst;
    return inst;
  })();

  return loading;
}
