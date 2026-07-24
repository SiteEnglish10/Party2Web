import {
  AppstoreOutlined,
  AudioOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileTextOutlined,
  FileWordOutlined,
  FolderOutlined,
  ScissorOutlined,
  ToolOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import React from "react";

const MAP: Record<string, React.ComponentType> = {
  "file-pdf": FilePdfOutlined,
  "file-word": FileWordOutlined,
  "file-ppt": FilePptOutlined,
  "file-excel": FileExcelOutlined,
  "file-text": FileTextOutlined,
  audio: AudioOutlined,
  gif: FileImageOutlined,
  "video-camera": VideoCameraOutlined,
  scissor: ScissorOutlined,
  folder: FolderOutlined,
  appstore: AppstoreOutlined,
  tool: ToolOutlined,
};

export function ToolIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = MAP[name] || ToolOutlined;
  return (
    <span className={className}>
      <Cmp />
    </span>
  );
}

export const ICON_OPTIONS = Object.keys(MAP);
