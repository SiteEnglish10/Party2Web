import { fetchFile } from "@ffmpeg/util";
import { Alert, Button, Progress, Select, Space, message } from "antd";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { getFFmpeg } from "../lib/ffmpeg";
import PdfMerge from "./PdfMerge";
import PdfSplit from "./PdfSplit";
import { download, Dropper, useFiles } from "./shared";
import type { RunnerProps } from "./types";

// ---------- 基于 ffmpeg 的运行器 ----------
function FfmpegRunner({
  accept,
  onSuccess,
  buildArgs,
  outName,
  outMime,
  extraControls,
}: {
  accept: string;
  onSuccess: () => void;
  buildArgs: (inName: string, outName: string) => string[];
  outName: (inName: string) => string;
  outMime: string;
  extraControls?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { files, props } = useFiles(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const run = async () => {
    if (!files[0]) return message.warning(t("tools.selectFiles"));
    setBusy(true);
    setProgress(0);
    try {
      const ff = await getFFmpeg((r) => setProgress(Math.round(r * 100)));
      const inName = "input" + files[0].name.slice(files[0].name.lastIndexOf("."));
      const out = outName(inName);
      await ff.writeFile(inName, await fetchFile(files[0]));
      await ff.exec(buildArgs(inName, out));
      const data = (await ff.readFile(out)) as Uint8Array;
      download(new Blob([data as BlobPart], { type: outMime }), out);
      onSuccess();
      message.success(t("tools.done"));
    } catch (e: any) {
      message.error(`${t("tools.failed")}: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Dropper hint={t("tools.dropHint")} {...props} accept={accept} />
      {extraControls}
      {busy && <Progress percent={progress} status="active" />}
      <Button type="primary" block loading={busy} onClick={run}>
        {t("tools.start")}
      </Button>
    </Space>
  );
}

// ---------- 音频转换 ----------
function AudioConvert({ onSuccess }: RunnerProps) {
  const [fmt, setFmt] = useState("mp3");
  return (
    <FfmpegRunner
      accept="audio/*"
      onSuccess={onSuccess}
      outMime={`audio/${fmt}`}
      outName={() => `output.${fmt}`}
      buildArgs={(inN, outN) => ["-i", inN, outN]}
      extraControls={
        <Select
          value={fmt}
          onChange={setFmt}
          style={{ width: "100%" }}
          options={["mp3", "wav", "ogg", "m4a", "flac", "aac"].map((v) => ({ value: v, label: v.toUpperCase() }))}
        />
      }
    />
  );
}

// ---------- MP4 转 GIF ----------
function Mp4ToGif({ onSuccess }: RunnerProps) {
  const [fps, setFps] = useState(10);
  const [width, setWidth] = useState(480);
  return (
    <FfmpegRunner
      accept="video/*"
      onSuccess={onSuccess}
      outMime="image/gif"
      outName={() => "output.gif"}
      buildArgs={(inN, outN) => ["-i", inN, "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos`, outN]}
      extraControls={
        <Space>
          <span>FPS</span>
          <Select value={fps} onChange={setFps} options={[5, 10, 15, 24].map((v) => ({ value: v, label: v }))} />
          <span>Width</span>
          <Select value={width} onChange={setWidth} options={[320, 480, 640].map((v) => ({ value: v, label: v }))} />
        </Space>
      }
    />
  );
}

// ---------- MP4 转 MP3 ----------
function Mp4ToMp3({ onSuccess }: RunnerProps) {
  return (
    <FfmpegRunner
      accept="video/*"
      onSuccess={onSuccess}
      outMime="audio/mp3"
      outName={() => "output.mp3"}
      buildArgs={(inN, outN) => ["-i", inN, "-vn", "-q:a", "2", outN]}
    />
  );
}

// ---------- 后端转换（Office → PDF） ----------
function BackendConvert({ tool, onSuccess }: RunnerProps) {
  const { t } = useTranslation();
  const { files, props } = useFiles(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("");

  const run = async () => {
    if (!files[0]) return message.warning(t("tools.selectFiles"));
    setBusy(true);
    setProgress(0);
    setStatus("");
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch(`/api/convert/${tool.tool_type}`, { method: "POST", body: fd });
      if (!res.ok) throw new Error((await res.json()).detail || "提交失败");
      const { job_id } = await res.json();
      const poll = async (): Promise<void> => {
        const s = await fetch(`/api/convert/jobs/${job_id}`).then((r) => r.json());
        setProgress(s.progress);
        setStatus(s.status);
        if (s.status === "done") {
          window.location.href = `/api/convert/jobs/${job_id}/download`;
          onSuccess();
          message.success(t("tools.done"));
          setBusy(false);
          return;
        }
        if (s.status === "error") {
          message.error(`${t("tools.failed")}: ${s.error}`);
          setBusy(false);
          return;
        }
        setTimeout(poll, 1000);
      };
      poll();
    } catch (e: any) {
      message.error(`${t("tools.failed")}: ${e.message || e}`);
      setBusy(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Alert type="warning" showIcon message={t("tools.runBackend")} />
      <Dropper hint={t("tools.dropHint")} {...props} />
      {busy && <Progress percent={progress} status={status === "error" ? "exception" : "active"} />}
      <Button type="primary" block loading={busy} onClick={run}>
        {t("tools.start")}
      </Button>
    </Space>
  );
}

export const RUNNERS: Record<string, React.ComponentType<RunnerProps>> = {
  "pdf-merge": PdfMerge,
  "pdf-split": PdfSplit,
  "audio-convert": AudioConvert,
  "mp4-to-gif": Mp4ToGif,
  "mp4-to-mp3": Mp4ToMp3,
  "word-to-pdf": BackendConvert,
  "ppt-to-pdf": BackendConvert,
  "excel-to-pdf": BackendConvert,
};
