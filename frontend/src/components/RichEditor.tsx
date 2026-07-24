import { message } from "antd";
import { useMemo, useRef } from "react";
import ReactQuill from "react-quill";

import { api } from "../api";

export default function RichEditor({
  value = "",
  onChange,
  placeholder,
}: {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) {
  const quillRef = useRef<ReactQuill>(null);

  const imageHandler = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const { url } = await api.uploadImage(file);
        const editor = quillRef.current?.getEditor();
        const range = editor?.getSelection(true);
        editor?.insertEmbed(range?.index ?? 0, "image", url);
      } catch (e: any) {
        message.error(e?.response?.data?.detail || "上传失败");
      }
    };
    input.click();
  };

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["link", "image", "video"],
          ["clean"],
        ],
        handlers: { image: imageHandler },
      },
    }),
    [],
  );

  return (
    <ReactQuill
      ref={quillRef}
      theme="snow"
      value={value}
      onChange={onChange}
      modules={modules}
      placeholder={placeholder}
    />
  );
}
