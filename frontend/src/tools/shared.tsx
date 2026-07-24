import { InboxOutlined } from "@ant-design/icons";
import { Upload } from "antd";
import { useState } from "react";

const { Dragger } = Upload;

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// 通用文件选择 Hook（beforeUpload 返回 false 以拦截自动上传）
export function useFiles(multiple = false) {
  const [files, setFiles] = useState<File[]>([]);
  const props = {
    multiple,
    beforeUpload: (file: File) => {
      setFiles((prev) => (multiple ? [...prev, file] : [file]));
      return false;
    },
    onRemove: (file: any) => {
      setFiles((prev) => prev.filter((_, i) => String(i) !== file.uid));
    },
    fileList: files.map((f, i) => ({ uid: String(i), name: f.name, status: "done" as const })),
  };
  return { files, setFiles, props };
}

export function Dropper({ hint, ...props }: any) {
  return (
    <Dragger {...props} style={{ padding: 8 }}>
      <p style={{ margin: 0 }}>
        <InboxOutlined style={{ fontSize: 28, color: "#2f6db0" }} />
      </p>
      <p style={{ margin: "6px 0 0", color: "#888" }}>{hint}</p>
    </Dragger>
  );
}
