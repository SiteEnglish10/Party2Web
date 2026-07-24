import { ReloadOutlined, ScissorOutlined } from "@ant-design/icons";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button, Dropdown, Input, Modal, Space, Spin, Tag, message } from "antd";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { loadPdf, renderPageToDataUrl, type PdfDoc } from "../lib/pdfRender";
import { download, Dropper } from "./shared";
import type { RunnerProps } from "./types";

interface Page {
  id: string;
  orig: number; // 原始页号（1-based）
  thumb: string;
}

const THUMB_W = 190;

function SortablePage({
  page,
  isSplit,
  onMenu,
  onPreview,
}: {
  page: Page;
  isSplit: boolean;
  onMenu: (key: string, page: Page) => void;
  onPreview: (page: Page) => void;
}) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id });

  const menuItems = [
    { key: "del", label: t("pdf.deletePage"), danger: true },
    { key: "before", label: t("pdf.splitBefore") },
    { key: "after", label: t("pdf.splitAfter") },
    ...(isSplit ? [{ key: "unsplit", label: t("pdf.cancelSplit") }] : []),
  ];

  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      <Dropdown trigger={["contextMenu"]} menu={{ items: menuItems, onClick: ({ key }) => onMenu(key, page) }}>
        <div
          onDoubleClick={() => onPreview(page)}
          style={{
            width: THUMB_W,
            border: isSplit ? "2px solid #eb5c5c" : "1px solid #d9d9d9",
            borderRadius: 8,
            padding: 6,
            background: "#fff",
            cursor: "grab",
            position: "relative",
            userSelect: "none",
          }}
          {...attributes}
          {...listeners}
        >
          <img
            src={page.thumb}
            alt={`page ${page.orig}`}
            style={{ width: "100%", display: "block", borderRadius: 4, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
            draggable={false}
          />
          <div style={{ textAlign: "center", fontSize: 12, color: "#666", marginTop: 4 }}>
            {t("pdf.pageNo", { n: page.orig })}
          </div>
          {isSplit && (
            <Tag color="red" style={{ position: "absolute", top: 4, right: 4, margin: 0 }}>
              <ScissorOutlined />
            </Tag>
          )}
        </div>
      </Dropdown>
    </div>
  );
}

export default function PdfSplit({ onSuccess }: RunnerProps) {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [splitAfter, setSplitAfter] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quickDel, setQuickDel] = useState("");
  const [preview, setPreview] = useState<{ orig: number; url?: string } | null>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadFile = async (f: File) => {
    setFile(f);
    setLoading(true);
    setPages([]);
    setSplitAfter(new Set());
    try {
      const doc = await loadPdf(await f.arrayBuffer());
      docRef.current = doc;
      const acc: Page[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const thumb = await renderPageToDataUrl(doc, i, THUMB_W * 2); // 2x 供清晰显示
        acc.push({ id: crypto.randomUUID(), orig: i, thumb });
        setPages([...acc]); // 渐进显示
      }
    } catch (e: any) {
      message.error(`${t("pdf.cannotRead")}: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
    return false;
  };

  const reset = () => {
    if (file) loadFile(file);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setPages((prev) => {
        const from = prev.findIndex((p) => p.id === active.id);
        const to = prev.findIndex((p) => p.id === over.id);
        return arrayMove(prev, from, to);
      });
    }
  };

  const onMenu = (key: string, page: Page) => {
    if (key === "del") {
      setPages((prev) => prev.filter((p) => p.id !== page.id));
      setSplitAfter((prev) => {
        const n = new Set(prev);
        n.delete(page.id);
        return n;
      });
    } else if (key === "after") {
      setSplitAfter((prev) => new Set(prev).add(page.id));
    } else if (key === "before") {
      const idx = pages.findIndex((p) => p.id === page.id);
      if (idx > 0) setSplitAfter((prev) => new Set(prev).add(pages[idx - 1].id));
      else message.info(t("pdf.cannotSplitFirst"));
    } else if (key === "unsplit") {
      setSplitAfter((prev) => {
        const n = new Set(prev);
        n.delete(page.id);
        return n;
      });
    }
  };

  const applyQuickDelete = () => {
    const set = new Set<number>();
    for (const part of quickDel.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (part.includes("-")) {
        const [a, b] = part.split("-").map((x) => parseInt(x, 10));
        for (let i = a; i <= b; i++) set.add(i);
      } else {
        const n = parseInt(part, 10);
        if (!Number.isNaN(n)) set.add(n);
      }
    }
    setPages((prev) => prev.filter((p) => !set.has(p.orig)));
    setQuickDel("");
  };

  const openPreview = async (page: Page) => {
    setPreview({ orig: page.orig });
    if (docRef.current) {
      const url = await renderPageToDataUrl(docRef.current, page.orig, 900);
      setPreview({ orig: page.orig, url });
    }
  };

  // 计算分段
  const segments: Page[][] = [];
  let cur: Page[] = [];
  pages.forEach((p) => {
    cur.push(p);
    if (splitAfter.has(p.id)) {
      segments.push(cur);
      cur = [];
    }
  });
  if (cur.length) segments.push(cur);

  const run = async () => {
    if (!file || pages.length === 0) return message.warning(t("tools.selectFiles"));
    setBusy(true);
    try {
      const srcDoc = await PDFDocument.load(await file.arrayBuffer());
      const buildSeg = async (seg: Page[]) => {
        const out = await PDFDocument.create();
        const copied = await out.copyPages(srcDoc, seg.map((p) => p.orig - 1));
        copied.forEach((pg) => out.addPage(pg));
        return await out.save();
      };
      if (segments.length <= 1) {
        const bytes = await buildSeg(segments[0] || pages);
        download(new Blob([bytes as BlobPart], { type: "application/pdf" }), "output.pdf");
      } else {
        const zip = new JSZip();
        for (let i = 0; i < segments.length; i++) {
          const bytes = await buildSeg(segments[i]);
          zip.file(`output-${i + 1}.pdf`, bytes as Uint8Array);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        download(blob, "split-output.zip");
      }
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
      <Dropper hint={t("tools.dropHint")} accept=".pdf" beforeUpload={loadFile} showUploadList={false} />

      {file && (
        <>
          <div style={{ fontSize: 12, color: "#888" }}>{t("pdf.splitHint")}</div>

          <Space wrap>
            <Input
              placeholder={t("pdf.quickDelPlaceholder")}
              value={quickDel}
              onChange={(e) => setQuickDel(e.target.value)}
              style={{ width: 200 }}
              onPressEnter={applyQuickDelete}
            />
            <Button onClick={applyQuickDelete}>{t("pdf.quickDelApply")}</Button>
            <Button icon={<ReloadOutlined />} onClick={reset}>
              {t("pdf.reset")}
            </Button>
            <span style={{ color: "#999", fontSize: 12 }}>
              {t("pdf.summary", { pages: pages.length, files: segments.length })}
            </span>
          </Space>

          {loading && pages.length === 0 ? (
            <Spin style={{ display: "block", margin: "24px auto" }} tip={t("pdf.rendering")} />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={pages.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {segments.map((seg, si) => (
                    <div key={si}>
                      {segments.length > 1 && (
                        <div style={{ fontSize: 12, color: "#2f6db0", fontWeight: 600, marginBottom: 6 }}>
                          <ScissorOutlined /> {t("pdf.outputFile", { n: si + 1 })}
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                        {seg.map((p) => (
                          <SortablePage
                            key={p.id}
                            page={p}
                            isSplit={splitAfter.has(p.id)}
                            onMenu={onMenu}
                            onPreview={openPreview}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <Button type="primary" block loading={busy} onClick={run} disabled={pages.length === 0}>
            {t("tools.start")}
          </Button>
        </>
      )}

      <Modal
        open={!!preview}
        title={preview ? t("pdf.pageNo", { n: preview.orig }) : ""}
        footer={null}
        onCancel={() => setPreview(null)}
        width={760}
      >
        {preview?.url ? (
          <img src={preview.url} alt="preview" style={{ width: "100%" }} />
        ) : (
          <Spin style={{ display: "block", margin: "40px auto" }} />
        )}
      </Modal>
    </Space>
  );
}
