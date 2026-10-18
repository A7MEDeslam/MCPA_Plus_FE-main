import { Injectable } from '@angular/core';
import html2pdf from 'html2pdf.js';

@Injectable({ providedIn: 'root' })
export class PdfExport {
  export(element: HTMLElement, filename: string): Promise<void> {
    const opt = {
      margin: 10,
      filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    };
    return html2pdf().set(opt).from(element).save();
  }
}
