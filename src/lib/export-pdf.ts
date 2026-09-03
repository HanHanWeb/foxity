"use client";

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

interface ExportOptions {
  userName: string;
  teamName: string;
}

/**
 * 导出画像页面为 PDF
 * 将传入的 DOM 元素列表逐一渲染到 PDF 中
 * 注意：所有中文内容必须走 canvas 渲染（HTML 截图），jsPDF 内置字体不支持中文
 */
export async function exportProfileToPDF(
  sections: HTMLElement[],
  options: ExportOptions
): Promise<void> {
  const { userName } = options;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const maxPageHeight = pageHeight - margin * 2;

  let currentY = margin;
  let pageHasContent = false;

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const isCover = section.hasAttribute("data-export-cover");

    // 剩余空间不够时换页
    if (
      pageHasContent &&
      currentY + imgHeight > pageHeight - margin
    ) {
      pdf.addPage();
      currentY = margin;
      pageHasContent = false;
    }

    if (imgHeight > maxPageHeight) {
      // 超高内容：从新页开始，按页切片
      if (pageHasContent) {
        pdf.addPage();
        pageHasContent = false;
      }
      // 每页对应的源图像素高度
      const sliceSrcHeight = Math.ceil(
        (canvas.height * maxPageHeight) / imgHeight
      );
      let srcY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(sliceSrcHeight, canvas.height - srcY);
        const tmpCanvas = document.createElement("canvas");
        tmpCanvas.width = canvas.width;
        tmpCanvas.height = sliceH;
        const tmpCtx = tmpCanvas.getContext("2d");
        if (tmpCtx) {
          tmpCtx.drawImage(
            canvas,
            0,
            srcY,
            canvas.width,
            sliceH,
            0,
            0,
            canvas.width,
            sliceH
          );
          pdf.addImage(
            tmpCanvas.toDataURL("image/png"),
            "PNG",
            margin,
            margin,
            imgWidth,
            (sliceH * imgWidth) / canvas.width
          );
        }
        srcY += sliceH;
        pageHasContent = true;
        if (srcY < canvas.height) pdf.addPage();
      }
      currentY = pageHeight;
    } else {
      pdf.addImage(imgData, "PNG", margin, currentY, imgWidth, imgHeight);
      currentY += imgHeight + 6;
      pageHasContent = true;
    }

    // 封面独占一页
    if (isCover) {
      pdf.addPage();
      currentY = margin;
      pageHasContent = false;
    }
  }

  // 页脚（纯 ASCII，jsPDF 内置字体安全）
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Foxity · ${i} / ${pageCount}`, pageWidth / 2, pageHeight - 5, {
      align: "center",
    });
  }

  const fileName = `${userName}_Foxity画像报告.pdf`;
  pdf.save(fileName);
}
