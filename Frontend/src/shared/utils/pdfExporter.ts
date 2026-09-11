/**
 * pdfExporter.ts
 * Enterprise PDF generation & document export utilities.
 * Utilizes html2canvas and jsPDF to capture specific DOM documents
 * and save them directly as high-resolution A3 or A4 PDF files.
 */

import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface PdfOptions {
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'a3';
  scale?: number;
  margin?: number; // Page margin in mm
  backgroundColor?: string;
}

/**
 * Pure math conversion from OKLAB color space to sRGB.
 */
function oklabToRgb(L: number, a: number, b: number, alpha = 1): string {
  const lPrime = L + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = L - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = L - 0.0894841775 * a - 1.291485548 * b;

  const l = Math.pow(lPrime, 3);
  const m = Math.pow(mPrime, 3);
  const s = Math.pow(sPrime, 3);

  const rLin = 4.0767434036 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055);

  const R = Math.round(Math.max(0, Math.min(255, gamma(rLin) * 255)));
  const G = Math.round(Math.max(0, Math.min(255, gamma(gLin) * 255)));
  const B = Math.round(Math.max(0, Math.min(255, gamma(bLin) * 255)));

  return alpha < 1 ? `rgba(${R}, ${G}, ${B}, ${alpha})` : `rgb(${R}, ${G}, ${B})`;
}

/**
 * Pure math conversion from OKLCH color space to sRGB.
 * Resolves Tailwind CSS v4 OKLCH definitions into standard rgb/rgba format.
 */
function oklchToRgb(L: number, C: number, H: number, alpha = 1): string {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  return oklabToRgb(L, a, b, alpha);
}

/**
 * Native Canvas 2D color parser fallback for modern browsers.
 */
function nativeBrowserColorToRgb(colorStr: string): string | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#00000000';
    ctx.fillStyle = colorStr;
    const style = ctx.fillStyle;
    if (style && !style.includes('oklch') && !style.includes('oklab')) {
      return style;
    }
  } catch {
    // Ignore error and fall back to mathematical conversion
  }
  return null;
}

/**
 * Replace all OKLCH and OKLAB color notations in any CSS string or value with sRGB equivalents.
 */
export function convertColorStringToRgb(cssText: string): string {
  if (!cssText || (!cssText.includes('oklch') && !cssText.includes('oklab'))) return cssText;

  let result = cssText;

  // 1. Replace oklch(...)
  result = result.replace(/oklch\(([^)]+)\)/gi, (match, inner) => {
    const native = nativeBrowserColorToRgb(match);
    if (native) return native;

    try {
      const parts = inner.split('/');
      const comps = parts[0].trim().split(/[\s,]+/).filter(Boolean);
      if (comps.length < 3) return match;

      const L = comps[0].endsWith('%') ? parseFloat(comps[0]) / 100 : parseFloat(comps[0]);
      const C = parseFloat(comps[1]);
      const H = parseFloat(comps[2]);
      let alpha = 1;
      if (parts[1] && parts[1].trim() !== 'none') {
        const aStr = parts[1].trim();
        alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      }

      if (isNaN(L) || isNaN(C) || isNaN(H)) return match;
      return oklchToRgb(L, C, H, isNaN(alpha) ? 1 : alpha);
    } catch {
      return match;
    }
  });

  // 2. Replace oklab(...)
  result = result.replace(/oklab\(([^)]+)\)/gi, (match, inner) => {
    const native = nativeBrowserColorToRgb(match);
    if (native) return native;

    try {
      const parts = inner.split('/');
      const comps = parts[0].trim().split(/[\s,]+/).filter(Boolean);
      if (comps.length < 3) return match;

      const L = comps[0].endsWith('%') ? parseFloat(comps[0]) / 100 : parseFloat(comps[0]);
      const a = parseFloat(comps[1]);
      const b = parseFloat(comps[2]);
      let alpha = 1;
      if (parts[1] && parts[1].trim() !== 'none') {
        const aStr = parts[1].trim();
        alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);
      }

      if (isNaN(L) || isNaN(a) || isNaN(b)) return match;
      return oklabToRgb(L, a, b, isNaN(alpha) ? 1 : alpha);
    } catch {
      return match;
    }
  });

  return result;
}

/**
 * Pre-convert an image to base64 Data URL or same-origin URL to prevent CORS taint.
 */
async function inlineImage(img: HTMLImageElement): Promise<void> {
  const src = img.getAttribute('src');
  if (!src || src.startsWith('data:')) return;

  // Rewrite localhost:8000/media or 127.0.0.1:8000/media to /media proxy
  let normalizedSrc = src;
  if (normalizedSrc.includes(':8000/media/')) {
    normalizedSrc = normalizedSrc.substring(normalizedSrc.indexOf('/media/'));
    img.src = normalizedSrc;
  }

  // Attempt to pre-fetch into base64
  try {
    const res = await fetch(normalizedSrc, { mode: 'cors' });
    if (res.ok) {
      const blob = await res.blob();
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === 'string') {
            img.src = reader.result;
          }
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(blob);
      });
    }
  } catch (e) {
    console.warn(`[pdfExporter] Could not inline image ${src}, keeping original:`, e);
  }
}

/**
 * Capture a specific DOM element by ID and save it directly as a high-quality PDF.
 */
export async function downloadElementAsPdf(
  elementId: string,
  options: PdfOptions = {}
): Promise<boolean> {
  const {
    filename = 'document.pdf',
    orientation = 'landscape',
    format = 'a3',
    scale = 2,
    margin = 6,
    backgroundColor = '#ffffff'
  } = options;

  const el = document.getElementById(elementId);
  if (!el) {
    console.error(`[pdfExporter] Target element #${elementId} not found.`);
    alert(`Could not find document #${elementId} to export.`);
    return false;
  }

  try {
    // Pre-process any images inside target element to avoid CORS issues
    const images = Array.from(el.querySelectorAll('img'));
    await Promise.all(images.map((img) => inlineImage(img)));

    // Render target DOM element to high-res canvas
    const canvas = await html2canvas(el, {
      scale: scale,
      useCORS: true,
      allowTaint: false, // Prevents toDataURL from throwing SecurityError
      backgroundColor: backgroundColor,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      windowWidth: el.scrollWidth > 1200 ? el.scrollWidth : 1200,
      onclone: (clonedDoc) => {
        // 1. Sanitize all stylesheet color definitions in the cloned iframe
        const styleEls = clonedDoc.querySelectorAll('style');
        styleEls.forEach((styleEl) => {
          if (styleEl.textContent) {
            styleEl.textContent = convertColorStringToRgb(styleEl.textContent);
          }
        });

        // 2. Adjust target layout and normalize colors to sRGB across all nodes
        const target = clonedDoc.getElementById(elementId);
        if (target) {
          target.style.overflow = 'visible';
          target.style.maxHeight = 'none';
          target.style.height = 'auto';
          target.style.boxShadow = 'none';

          // Hide non-printable controls inside target
          const noPrintEls = target.querySelectorAll('.no-print, .print\\:hidden');
          noPrintEls.forEach((item) => {
            (item as HTMLElement).style.display = 'none';
          });

          // Normalize computed colors on every descendant node to explicit inline rgb/rgba
          const view = clonedDoc.defaultView || window;
          const allNodes = target.querySelectorAll('*');
          const colorProps = [
            'color',
            'background-color',
            'border-top-color',
            'border-right-color',
            'border-bottom-color',
            'border-left-color',
            'outline-color',
            'fill',
            'stroke',
            'text-decoration-color'
          ];

          allNodes.forEach((node) => {
            if (node instanceof HTMLElement || node instanceof SVGElement) {
              const comp = view.getComputedStyle(node);
              for (const prop of colorProps) {
                const val = comp.getPropertyValue(prop);
                if (val && (val.includes('oklch') || val.includes('oklab'))) {
                  node.style.setProperty(prop, convertColorStringToRgb(val), 'important');
                }
              }
              const bgImg = comp.getPropertyValue('background-image');
              if (bgImg && (bgImg.includes('oklch') || bgImg.includes('oklab'))) {
                node.style.setProperty('background-image', convertColorStringToRgb(bgImg), 'important');
              }
              const shadow = comp.getPropertyValue('box-shadow');
              if (shadow && (shadow.includes('oklch') || shadow.includes('oklab'))) {
                node.style.setProperty('box-shadow', convertColorStringToRgb(shadow), 'important');
              }
            }
          });
        }
      }
    });

    // Initialize jsPDF with specified format and orientation
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format,
      compress: true,
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const printableWidth = pageWidth - (margin * 2);
    const printableHeight = pageHeight - (margin * 2);

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const canvasRatio = canvasWidth / canvasHeight;
    const printableRatio = printableWidth / printableHeight;

    let imgWidth: number;
    let imgHeight: number;
    let x: number;
    let y: number;

    if (canvasRatio >= printableRatio) {
      imgWidth = printableWidth;
      imgHeight = printableWidth / canvasRatio;
      x = margin;
      y = margin + Math.max(0, (printableHeight - imgHeight) / 2);
    } else {
      imgHeight = printableHeight;
      imgWidth = printableHeight * canvasRatio;
      y = margin;
      x = margin + Math.max(0, (printableWidth - imgWidth) / 2);
    }

    const imgData = canvas.toDataURL('image/jpeg', 0.96);
    pdf.addImage(imgData, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST');

    const cleanFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
    return true;
  } catch (error: any) {
    console.error('[pdfExporter] Failed to export PDF:', error);
    alert(`Failed to generate PDF: ${error?.message || 'Unknown error'}`);
    return false;
  }
}

/**
 * Trigger save/download for A4 format
 */
export async function triggerA4Print(
  elementId?: string,
  title?: string,
  orientation: 'portrait' | 'landscape' = 'portrait'
): Promise<void> {
  if (elementId) {
    const filename = `${(title || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_')}_A4.pdf`;
    await downloadElementAsPdf(elementId, {
      filename,
      orientation,
      format: 'a4',
      scale: 2
    });
  } else {
    window.print();
  }
}

/**
 * Trigger save/download for A3 format
 */
export async function triggerA3Print(
  elementId?: string,
  title?: string
): Promise<void> {
  if (elementId) {
    const filename = `${(title || 'Kaizen_Sheet').replace(/[^a-zA-Z0-9_-]/g, '_')}_A3.pdf`;
    await downloadElementAsPdf(elementId, {
      filename,
      orientation: 'landscape',
      format: 'a3',
      scale: 2
    });
  } else {
    window.print();
  }
}
