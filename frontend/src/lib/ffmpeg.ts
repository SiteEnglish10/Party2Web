import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

// 自托管 ffmpeg core（单线程 UMD 版）：由 scripts/copy-ffmpeg.mjs 复制到 public/ffmpeg/，
// 构建后随前端一起托管在本站同源路径 /ffmpeg/，不依赖 unpkg 等国外 CDN
//（否则会报 "failed to import ffmpeg-core.js"）。
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
    // toBlobURL 把同源资源转成 blob URL，供内部 worker 加载
    await inst.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = inst;
    return inst;
  })();

  return loading;
}
