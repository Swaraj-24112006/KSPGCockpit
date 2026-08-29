/**
 * pdfExporter.ts
 * PDF / Print utility functions for PPSR documents.
 * Provides downloadElementAsPdf, triggerA4Print, triggerA3Print.
 */

export interface PdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3';
}

/**
 * Download the DOM element identified by `elementId` as a PDF.
 * Uses the browser's built-in print-to-PDF pipeline so no external
 * dependency is required.  The element is temporarily styled for
 * printing before the dialog is opened.
 */
export async function downloadElementAsPdf(
  elementId: string,
  options: PdfOptions = {}
): Promise<void> {
  const { filename = 'document.pdf', orientation = 'portrait', format = 'a4' } = options;

  const el = document.getElementById(elementId);
  if (!el) {
    console.warn(`[pdfExporter] Element #${elementId} not found.`);
    return;
  }

  // Inject a temporary <title> so the browser uses it as the default PDF filename
  const prevTitle = document.title;
  document.title = filename.replace(/\.pdf$/i, '');

  // Inject a temporary <style> that hides everything except the target element
  const styleTag = document.createElement('style');
  styleTag.id = '__ppsr_print_style__';
  styleTag.textContent = `
    @media print {
      @page {
        size: ${format.toUpperCase()} ${orientation};
        margin: 10mm;
      }
      body > *:not(#${elementId}) {
        display: none !important;
      }
      #${elementId} {
        display: block !important;
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
      }
    }
  `;
  document.head.appendChild(styleTag);

  // Small delay to let React re-render before printing
  await new Promise<void>((resolve) => setTimeout(resolve, 150));

  window.print();

  // Cleanup
  document.title = prevTitle;
  const injected = document.getElementById('__ppsr_print_style__');
  if (injected) injected.remove();
}

/**
 * Trigger a browser print dialog configured for A4 paper.
 * @param elementId - Optional ID of the element to isolate for printing.
 * @param title     - Optional title to set on the document for the print dialog.
 */
export function triggerA4Print(elementId?: string, title?: string): void {
  const prevTitle = document.title;
  if (title) document.title = title;

  const styleTag = document.createElement('style');
  styleTag.id = '__ppsr_a4_print_style__';
  styleTag.textContent = `
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      ${elementId
        ? `
        body > *:not(#${elementId}) { display: none !important; }
        #${elementId} { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        `
        : ''}
    }
  `;
  document.head.appendChild(styleTag);

  window.print();

  document.title = prevTitle;
  const injected = document.getElementById('__ppsr_a4_print_style__');
  if (injected) injected.remove();
}

/**
 * Trigger a browser print dialog configured for A3 paper (landscape).
 * @param elementId - Optional ID of the element to isolate for printing.
 * @param title     - Optional title to set on the document for the print dialog.
 */
export function triggerA3Print(elementId?: string, title?: string): void {
  const prevTitle = document.title;
  if (title) document.title = title;

  const styleTag = document.createElement('style');
  styleTag.id = '__ppsr_a3_print_style__';
  styleTag.textContent = `
    @media print {
      @page { size: A3 landscape; margin: 8mm; }
      ${elementId
        ? `
        body > *:not(#${elementId}) { display: none !important; }
        #${elementId} { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        `
        : ''}
    }
  `;
  document.head.appendChild(styleTag);

  window.print();

  document.title = prevTitle;
  const injected = document.getElementById('__ppsr_a3_print_style__');
  if (injected) injected.remove();
}
