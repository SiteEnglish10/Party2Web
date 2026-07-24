import { DeleteOutlined, FilePdfOutlined, HolderOutlined } from "@ant-design/icons";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Space, message } from "antd";
import { PDFDocument } from "pdf-lib";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { download, Dropper } from "./shared";
import type { RunnerProps } from "./types";

interface Item {
  id: string;
  file: File;
  pages: number;
}

function SortableFile({ item, index, onRemove }: { item: Item; index: number; onRemove: (id: string) => void }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
        width: 130,
        border: "1px solid var(--ant-color-border, #d9d9d9)",
        borderRadius: 8,
        padding: "12px 8px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        background: "var(--ant-color-bg-container, #fff)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -8,
          left: -8,
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#2f6db0",
          color: "#fff",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 600,
        }}
      >
        {index + 1}
      </div>
      <FilePdfOutlined style={{ fontSize: 30, color: "#c0392b" }} />
      <div style={{ fontSize: 12, textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={item.file.name}>
        {item.file.name}
      </div>
      <div style={{ fontSize: 11, color: "#999" }}>{item.pages} {t("pdf.pages")}</div>
      <div style={{ display: "flex", gap: 2 }}>
        <Button size="small" type="text" icon={<HolderOutlined />} style={{ cursor: "grab" }} {...attributes} {...listeners} />
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemove(item.id)} />
      </div>
    </div>
  );
}

export default function PdfMerge({ onSuccess }: RunnerProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addFile = async (file: File) => {
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      setItems((prev) => [...prev, { id: crypto.randomUUID(), file, pages: doc.getPageCount() }]);
    } catch {
      message.error(`${file.name}: ${t("pdf.cannotRead")}`);
    }
    return false;
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const from = prev.findIndex((i) => i.id === active.id);
        const to = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  };

  const run = async () => {
    if (items.length < 2) return message.warning(t("pdf.needTwo"));
    setBusy(true);
    try {
      const out = await PDFDocument.create();
      for (const it of items) {
        const src = await PDFDocument.load(await it.file.arrayBuffer());
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      }
      const bytes = await out.save();
      download(new Blob([bytes as BlobPart], { type: "application/pdf" }), "merged.pdf");
      onSuccess();
      message.success(t("tools.done"));
    } catch (e: any) {
      message.error(`${t("tools.failed")}: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="middle">
      <Dropper hint={t("tools.dropHint")} multiple accept=".pdf" beforeUpload={addFile} showUploadList={false} />

      {items.length > 0 && (
        <div style={{ border: "1px dashed #d9d9d9", borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 13, color: "#666", marginBottom: 10 }}>
            {t("pdf.mergePreview")}
          </div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                {items.map((it, idx) => (
                  <SortableFile key={it.id} item={it} index={idx} onRemove={(id) => setItems((p) => p.filter((x) => x.id !== id))} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <Button type="primary" block loading={busy} onClick={run} disabled={items.length < 2}>
        {t("tools.start")} ({items.length})
      </Button>
    </Space>
  );
}
