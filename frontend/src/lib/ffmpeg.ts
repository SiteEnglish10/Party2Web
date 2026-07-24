import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL } from "@ffmpeg/util";

let ffmpeg: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";

export async function getFFmpeg(onProgress?: (ratio: number) => void): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg;
  if (loading) return loading;

  loading = (async () => {
    const inst = new FFmpeg();
    if (onProgress) {
      inst.on("progress", ({ progress }) => onProgress(Math.min(1, progress)));
    }
    await inst.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = inst;
    return inst;
  })();

  return loading;
}
