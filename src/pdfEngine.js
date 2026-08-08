  import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { A4_HEIGHT, A4_WIDTH, MAP_OFFSET, resolveFieldCoords, validateCoordinates } from './pdfCoords.js';

let cachedFontBytes = null;
let lastFontInfo = { loaded: false, name: null, supportsDevanagari: false };

const DEVANAGARI_RE = /[\u0900-\u097F]/;
const SHOW_FIELD_BOUNDING_BOXES = false;

async function loadDevanagariFont(pdfDoc) {
  if (!pdfDoc) return null;

  if (cachedFontBytes && lastFontInfo.loaded) {
    try {
      const f = await pdfDoc.embedFont(cachedFontBytes);
      return f;
    } catch {}
  }

  const fontUrls = [
    '/fonts/NotoSansDevanagari-Regular.ttf',
    '/NotoSansDevanagari-Regular.ttf',
    './fonts/NotoSansDevanagari-Regular.ttf',
  ];

  let bytes = null;
  let usedUrl = null;
  for (const url of fontUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        bytes = await res.arrayBuffer();
        usedUrl = url;
        if (bytes && bytes.byteLength > 10000) break;
      }
    } catch {}
  }

  if (!bytes || bytes.byteLength < 10000) {
    console.error('❌ DEVANAGARI FONT NOT FOUND. Tried URLs:', fontUrls,
      '\nWithout this font, Marathi/Hindi text WILL BE INVISIBLE on the PDF.',
      '\nExpected file: public/fonts/NotoSansDevanagari-Regular.ttf');
    lastFontInfo = { loaded: false, name: 'NONE', supportsDevanagari: false };
    return null;
  }

  cachedFontBytes = bytes;
  console.log(`✅ Devanagari font loaded from: ${usedUrl} (${(bytes.byteLength / 1024).toFixed(1)} KB)`);

  try {
    const embeddedFont = await pdfDoc.embedFont(cachedFontBytes);
    lastFontInfo = { loaded: true, name: 'NotoSansDevanagari-Regular', supportsDevanagari: true };
    return embeddedFont;
  } catch (embedErr) {
    console.error('❌ Font bytes loaded but EMBED FAILED:', embedErr?.message || embedErr);
    lastFontInfo = { loaded: false, name: 'EMBED_FAILED', supportsDevanagari: false };
    return null;
  }
}

function hasDevanagari(text) {
  return DEVANAGARI_RE.test(String(text || ''));
}

function splitGraphemes(text) {
  const str = String(text || '');
  if (!str) return [];

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
      return Array.from(seg.segment(str)).map(s => s.segment);
    } catch {}
  }

  const result = [];
  const re = /(\P{M}\p{M}*)/gu;
  let m;
  while ((m = re.exec(str)) !== null) {
    result.push(m[0]);
  }
  return result.length > 0 ? result : str.split('');
}

function splitIntoLines(text, maxWidthPx, fontSize, font) {
  const graphemes = splitGraphemes(text);
  if (graphemes.length === 0) return [''];

  const charWidth = Math.max(fontSize * 0.45, 5);
  const spaceWidth = Math.max(fontSize * 0.3, 4);
  const useFontMetric = font && typeof font.widthOfTextAtSize === 'function';

  const lines = [];
  let currentLine = '';
  let currentWidth = 0;
  let currentCluster = '';

  const flush = () => {
    if (currentLine || lines.length === 0) {
      lines.push(currentLine);
    }
    currentLine = '';
    currentWidth = 0;
  };

  for (let i = 0; i < graphemes.length; i++) {
    const g = graphemes[i];
    const isWhitespace = /\s/.test(g);
    const isNewline = g === '\n' || g === '\r';

    if (isNewline) {
      if (currentCluster) {
        currentLine += currentCluster;
        currentCluster = '';
      }
      flush();
      continue;
    }

    if (isWhitespace && currentCluster) {
      currentLine += currentCluster;
      currentCluster = '';
    }

    let pieceWidth;
    if (useFontMetric) {
      try {
        pieceWidth = font.widthOfTextAtSize(g, fontSize);
        if (!pieceWidth || pieceWidth < 0) pieceWidth = charWidth;
      } catch {
        pieceWidth = charWidth;
      }
    } else {
      pieceWidth = hasDevanagari(g) ? charWidth * 1.1 : charWidth;
    }

    if (isWhitespace) pieceWidth = spaceWidth;

    if (currentWidth + pieceWidth > maxWidthPx && currentLine.length > 0) {
      if (!isWhitespace) {
        const combined = currentLine + currentCluster;
        if (useFontMetric) {
          try {
            const combinedW = font.widthOfTextAtSize(combined, fontSize);
            if (combinedW <= maxWidthPx) {
              currentCluster += g;
              currentWidth += pieceWidth;
              continue;
            }
          } catch {}
        }
      }
      if (currentCluster) {
        currentLine += currentCluster;
        currentCluster = '';
      }
      flush();
      if (isWhitespace) {
        continue;
      }
    }

    if (isWhitespace) {
      currentLine += g;
    } else {
      currentCluster += g;
    }
    currentWidth += pieceWidth;
  }

  if (currentCluster) currentLine += currentCluster;
  flush();
  return lines.filter((l, i) => i === 0 || l !== '' || lines[i - 1] !== '');
}

function drawTextSafe(targetPage, text, opts) {
  if (!text) return;
  try {
    targetPage.drawText(text, opts);
    return true;
  } catch (e) {
    console.warn('drawText safe-catch:', e?.message || e, 'text=', text.substring(0, 30));
    return false;
  }
}

function drawTextLinesRobust(targetPage, lines, baseX, baseY, fontSize, font, color, lineHeight, maxWidth, pageHeight) {
  let charsDrawn = 0;
  const safeBaseY = Math.max(fontSize + 10, baseY);
  const useFontMetric = font && typeof font.widthOfTextAtSize === 'function';
  const charWidth = Math.max(fontSize * 0.45, 5);
  const safeMaxWidth = Math.max(fontSize * 3, maxWidth);

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (line === '' || line === undefined || line === null) continue;
    const y = safeBaseY - (lineIdx * lineHeight);
    if (y < fontSize + 5) break;

    const opts = { x: baseX, y, size: fontSize, font, color, maxWidth: safeMaxWidth, lineHeight: lineHeight };
    if (drawTextSafe(targetPage, line, opts)) {
      charsDrawn += line.length;
      continue;
    }

    let cx = baseX;
    const graphemes = splitGraphemes(line);
    for (const g of graphemes) {
      if (cx - baseX > safeMaxWidth - fontSize) break;
      if (drawTextSafe(targetPage, g, { x: cx, y, size: fontSize, font, color })) {
        charsDrawn += g.length;
      }
      let w = charWidth;
      if (useFontMetric) {
        try { w = font.widthOfTextAtSize(g, fontSize) || charWidth; } catch {}
      }
      cx += Math.max(2, Math.min(fontSize * 2, w));
    }
  }

  return charsDrawn;
}

function drawFieldBoundingBox(targetPage, x, y, w, h, pageHeight, fieldKey) {
  try {
    targetPage.drawRectangle({
      x,
      y,
      width: w,
      height: h,
      borderColor: rgb(0.0, 0.5, 0.8),
      borderWidth: 0.7,
    });
    const label = `[${fieldKey}]`;
    try {
      targetPage.drawText(label, {
        x: x + 2,
        y: y + h - 6,
        size: 5,
        color: rgb(0.0, 0.5, 0.8),
      });
    } catch {}
  } catch (e) {
    console.warn('Could not draw bounding box:', e?.message);
  }
}

export async function generateFormPDF(scheme, questions, formData) {
  try {
    let pdfDoc;

    if (scheme.pdf_template_url) {
      try {
        const existingPdfBytes = await fetch(scheme.pdf_template_url).then(res => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.arrayBuffer();
        });
        pdfDoc = await PDFDocument.load(existingPdfBytes);
      } catch (e) {
        console.warn(`Could not load template from ${scheme.pdf_template_url}:`, e?.message || e);
        pdfDoc = await createFallbackPDF(scheme, questions, formData);
        const pdfBytes = await pdfDoc.save();
        return URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
      }
    } else {
      pdfDoc = await createFallbackPDF(scheme, questions, formData);
      const pdfBytes = await pdfDoc.save();
      return URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
    }

    pdfDoc.registerFontkit(fontkit);
    const devanagariFont = await loadDevanagariFont(pdfDoc);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pages = pdfDoc.getPages();
    console.log(`📄 PDF has ${pages.length} page(s). Devanagari font: ${lastFontInfo.name}, loaded=${lastFontInfo.loaded}`);

    questions.forEach(q => {
      const rawVal = formData[q.field_key];
      if (rawVal === undefined || rawVal === null || rawVal === '') return;

      const pageIndex = (q.pdf_page || 1) - 1;
      const targetPage = pages[pageIndex] || pages[0];
      if (!targetPage) return;

      const pageSize = targetPage.getSize();
      const pageHeight = pageSize.height;
      const pageWidth = pageSize.width;
      const fontSize = q.font_size || 11;
      const lineHeight = Math.round(fontSize * 1.5);
      const inkColor = rgb(0.05, 0.15, 0.6);

      const displayVal = String(rawVal).trim();
      if (!displayVal) return;

      const needsDevanagari = hasDevanagari(displayVal);
      const activeFont = (needsDevanagari && devanagariFont) ? devanagariFont : helveticaFont;

      if (needsDevanagari && !devanagariFont) {
        console.error(`🚨 FIELD "${q.field_key}" CONTAINS DEVANAGARI BUT NO DEVANAGARI FONT! Text will be INVISIBLE:`,
          displayVal.substring(0, 50));
      }

      console.log(`📍 [${q.field_key}] type=${q.inputType} text="${displayVal.substring(0, 80)}${displayVal.length > 80 ? '...' : ''}"`);
      console.log(`   needsDevanagari=${needsDevanagari}, font=${needsDevanagari ? (devanagariFont ? 'DEVANAGARI_OK' : '⚠️MISSING⚠️') : 'HELVETICA'}, pageSize=${pageWidth.toFixed(0)}x${pageHeight.toFixed(0)}`);

      try {
        if (q.inputType === 'select' && q.options) {
          const selectedOpt = q.options.find(opt => opt.value === rawVal);
          const rect = selectedOpt?.html_map || q.html_map;
          if (!rect) return;
          let coords = resolveFieldCoords({ html_map: rect, inputType: 'select' }, pageHeight);
          coords = validateCoordinates(coords, pageWidth, pageHeight);
          console.log(`   ✅ checkbox @ x=${coords.pdf_x.toFixed(1)}, y=${coords.pdf_y.toFixed(1)}`);
          targetPage.drawText('✓', {
            x: coords.pdf_x,
            y: coords.pdf_y,
            size: fontSize + 2,
            font: helveticaFont,
            color: inkColor,
          });
          return;
        }

        if (!q.html_map) return;

        let coords = resolveFieldCoords(q, pageHeight);
        coords = validateCoordinates(coords, pageWidth, pageHeight);

        const rawBoxWidth = q.html_map.x2 - q.html_map.x1;
        const maxTextWidth = Math.max(30, Math.min(rawBoxWidth - 10, pageWidth - coords.pdf_x - 20));
        const maxBoxHeight = Math.max(fontSize + 4, q.html_map.y2 - q.html_map.y1 - 4);

        console.log(`   pdf_x=${coords.pdf_x.toFixed(1)}, pdf_y=${coords.pdf_y.toFixed(1)}, fieldBox=${rawBoxWidth}x${q.html_map.y2 - q.html_map.y1}, maxTextWidth=${maxTextWidth.toFixed(1)}, multiLine=${coords.isMultiLine}`);

        if (SHOW_FIELD_BOUNDING_BOXES) {
          const boxY = coords.isMultiLine
            ? Math.max(5, pageHeight - (q.html_map.y2 + MAP_OFFSET) + 1)
            : coords.pdf_y - 2;
          const boxH = coords.isMultiLine
            ? (q.html_map.y2 - q.html_map.y1) - 4
            : fontSize + 4;
          drawFieldBoundingBox(targetPage, coords.pdf_x - 2, boxY, maxTextWidth + 4, Math.max(fontSize + 2, boxH), pageHeight, q.field_key);
        }

        const lines = splitIntoLines(displayVal, maxTextWidth, fontSize, activeFont);
        console.log(`   split into ${lines.length} line(s):`, lines.map(l => `"${l}"`).join(' | '));

        const drawn = drawTextLinesRobust(
          targetPage, lines, coords.pdf_x, coords.pdf_y,
          fontSize, activeFont, inkColor, lineHeight,
          maxTextWidth, pageHeight
        );
        console.log(`   ✅ chars drawn: ${drawn}/${displayVal.length}`);

      } catch (drawErr) {
        console.error(`❌ FATAL drawing field "${q.field_key}":`, drawErr?.stack || drawErr);
      }
    });

    const pdfBytes = await pdfDoc.save();
    return URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' }));
  } catch (err) {
    console.error('PDF Generation Error:', err?.stack || err);
    throw err;
  }
}

async function createFallbackPDF(scheme, questions, formData) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const devanagariFont = await loadDevanagariFont(pdfDoc);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const { width, height } = page.getSize();
  const margin = 30;
  const inkColor = rgb(0.05, 0.15, 0.6);
  const labelColor = rgb(0.2, 0.2, 0.2);
  const lineColor = rgb(0.75, 0.75, 0.75);

  page.drawRectangle({ x: margin, y: margin, width: width - (margin * 2), height: height - (margin * 2), borderWidth: 1.5, borderColor: rgb(0.1, 0.2, 0.4) });
  page.drawRectangle({ x: margin, y: height - 90, width: width - (margin * 2), height: 60, color: rgb(0.93, 0.95, 0.98), borderWidth: 1, borderColor: rgb(0.8, 0.85, 0.9) });
  page.drawText('GOVERNMENT OF MAHARASHTRA / GOVT OF INDIA', { x: margin + 20, y: height - 50, size: 11, font: helveticaFont, color: rgb(0.1, 0.2, 0.5) });
  page.drawText(`OFFICIAL APPLICATION FORM - ${scheme.code || 'FORM_SAHAY_2026'}`, { x: margin + 20, y: height - 70, size: 13, font: helveticaFont, color: rgb(0.8, 0.2, 0.1) });
  page.drawText(`Scheme: ${scheme.title_en}`, { x: margin + 15, y: height - 115, size: 11, font: helveticaFont, color: rgb(0, 0, 0) });

  questions.forEach(q => {
    if (!q.html_map) return;
    const coords = resolveFieldCoords(q, height);
    const fontSize = q.font_size || 11;
    const lineHeight = Math.round(fontSize * 1.5);
    const blankLeft = coords.pdf_x - 5;
    const blankRight = Math.min(coords.pdf_x + (q.html_map.x2 - q.html_map.x1) + MAP_OFFSET, width - margin - 10);
    const safeMaxWidth = Math.max(20, blankRight - blankLeft - 5);
    const blankBottom = coords.pdf_y - 4;

    page.drawText(q.label_en, {
      x: margin + 12, y: coords.pdf_y, size: 9, font: helveticaFont, color: labelColor,
      maxWidth: Math.max(10, blankLeft - margin - 20),
    });

    page.drawLine({ start: { x: blankLeft, y: blankBottom }, end: { x: blankRight, y: blankBottom }, thickness: 0.5, color: lineColor });

    const rawVal = formData[q.field_key];
    if (rawVal === undefined || rawVal === null || rawVal === '') return;
    const displayVal = String(rawVal).trim();
    if (!displayVal) return;

    const needsDevanagari = hasDevanagari(displayVal);
    const activeFont = (needsDevanagari && devanagariFont) ? devanagariFont : helveticaFont;

    if (q.inputType === 'select' && q.options) {
      const selectedOpt = q.options.find(opt => opt.value === rawVal);
      const rect = selectedOpt?.html_map || q.html_map;
      const optCoords = resolveFieldCoords({ html_map: rect }, height);
      page.drawText('✓', { x: optCoords.pdf_x, y: optCoords.pdf_y, size: fontSize, font: helveticaFont, color: inkColor });
    } else {
      const lines = splitIntoLines(displayVal, safeMaxWidth, fontSize, activeFont);
      drawTextLinesRobust(page, lines, coords.pdf_x, coords.pdf_y, fontSize, activeFont, inkColor, lineHeight, safeMaxWidth, height);
    }
  });

  return pdfDoc;
}

export { resolveFieldCoords, MAP_OFFSET, A4_WIDTH, A4_HEIGHT };
