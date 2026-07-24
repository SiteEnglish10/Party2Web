import * as pdfjsLib from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfDoc = pdfjsLib.PDFDocumentProxy;

export async function loadPdf(data: ArrayBuffer): Promise<PdfDoc> {
  // pdf.js 会 transfer/detach 传入的 buffer，复制一份避免影响调用方
  return pdfjsLib.getDocument({ data: data.slice(0) }).promise;
}

/** 把某一页渲染为 PNG dataURL，targetWidth 为目标像素宽度 */
export async function renderPageToDataUrl(
  pdf: PdfDoc,
  pageNum: number,
  targetWidth: number,
): Promise<string> {
  const page = await pdf.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  const scale = targetWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/png");
}
