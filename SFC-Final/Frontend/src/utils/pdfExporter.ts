import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PdfExportOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a3' | 'a4';
  margin?: number;
}

/**
 * Captures an HTML element and downloads it directly as a high-quality PDF.
 */
export async function downloadElementAsPdf(
  elementIdOrRef: string | HTMLElement,
  options: PdfExportOptions = {}
): Promise<boolean> {
  const {
    filename = 'Document.pdf',
    orientation = 'landscape',
    format = 'a4',
    margin = 5
  } = options;

  let element: HTMLElement | null = null;
  if (typeof elementIdOrRef === 'string') {
    element = document.getElementById(elementIdOrRef);
  } else {
    element = elementIdOrRef;
  }

  if (!element) {
    console.error(`Element for PDF export not found:`, elementIdOrRef);
    alert('Could not locate document element for PDF download.');
    return false;
  }

  try {
    element.classList.add('pdf-capture-mode');

    const canvas = await html2canvas(element, {
      scale: 2, // High DPI capture for crisp text
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    element.classList.remove('pdf-capture-mode');

    const imgData = canvas.toDataURL('image/png', 1.0);

    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
      compress: true
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const printableWidth = pdfWidth - (margin * 2);
    const printableHeight = pdfHeight - (margin * 2);

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(printableWidth / imgWidth, printableHeight / imgHeight);

    const renderedWidth = imgWidth * ratio;
    const renderedHeight = imgHeight * ratio;

    const xPos = (pdfWidth - renderedWidth) / 2;
    const yPos = (pdfHeight - renderedHeight) / 2;

    pdf.addImage(imgData, 'PNG', xPos, yPos, renderedWidth, renderedHeight, undefined, 'FAST');
    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);

    return true;
  } catch (err) {
    console.error('Failed to generate PDF:', err);
    alert('Generating PDF... Launching fallback print dialog.');
    window.print();
    return false;
  }
}

/**
 * Triggers clean print pop-up specifically formatted for A4 documents.
 */
export function triggerA4Print(elementId: string, title: string = 'A4 Kaizen Document', orientation: 'landscape' | 'portrait' = 'landscape') {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A4 ${orientation};
            margin: 6mm;
          }
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .a4-container {
              width: 100% !important;
              max-width: none !important;
              box-shadow: none !important;
              border-radius: 0 !important;
            }
          }
          body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 12px;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: #ffffff; font-weight: 800; border-radius: 8px; cursor: pointer; border: none;">
            🖨️ Print A4 Document Now
          </button>
        </div>
        <div class="a4-container">
          ${element.outerHTML}
        </div>
        <script>
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Triggers clean print pop-up specifically formatted for A3 / A4 documents.
 */
export function triggerA3Print(elementId: string, title: string = 'A3 Sheet Document') {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return;
  }

  const printWindow = window.open('', '_blank', 'width=1200,height=900');
  if (!printWindow) {
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8" />
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @page {
            size: A3 landscape;
            margin: 8mm;
          }
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 16px;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #0f172a; color: #ffffff; font-weight: 800; border-radius: 8px; cursor: pointer; border: none;">
            🖨️ Print A3 Sheet Now
          </button>
        </div>
        ${element.outerHTML}
        <script>
          setTimeout(() => {
            window.print();
          }, 500);
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
