// HTML image-map → PDF coordinate conversion (A4 template calibration)
// Calibrated from Senior Citizen form: x1=123 → pdf_x=190, y2=140 → pdf_y=635

export const A4_WIDTH = 595.28;
export const A4_HEIGHT = 841.89;

/** Horizontal/vertical offset between HTML map image origin and PDF template origin */
export const MAP_OFFSET = 67;

/**
 * Convert an HTML <area shape="rect" coords="x1,y1,x2,y2"> box to pdf-lib drawText coords.
 * HTML origin is top-left; PDF origin is bottom-left.
 * Text baseline aligns to the bottom edge of the blank fill row (y2).
 */
export function htmlRectToPdf(rect, pageHeight = A4_HEIGHT) {
  if (!rect) return { pdf_x: 0, pdf_y: 0 };
  const { x1, y1, x2, y2 } = rect;
  
  // Calculate the center of the field for better positioning
  const fieldHeight = y2 - y1;
  const centerY = y1 + (fieldHeight / 2);
  
  return {
    pdf_x: x1 + MAP_OFFSET,
    pdf_y: pageHeight - centerY - MAP_OFFSET, // Use center instead of bottom
  };
}

/**
 * Field-specific coordinate adjustments for better positioning
 */
const FIELD_ADJUSTMENTS = {
  'aadhaar_number': { x: 0, y: -2 }, // Slightly lower for better alignment
  'applicant_name': { x: 0, y: -1 },
  'mobile_number': { x: 0, y: -2 },
  'address': { x: 0, y: -1 },
  'bank_account': { x: 0, y: -2 },
  'bank_name': { x: 0, y: -1 },
};

/**
 * Enhanced coordinate resolution with field type awareness
 * Returns { pdf_x, pdf_y, fieldHeight, isMultiLine, topY, bottomY, fieldLeft, fieldRight }
 *
 * drawText Y in pdf-lib = position of the TEXT BASELINE (the line the letters sit on, below ascender, above descender).
 * PDF Y origin = BOTTOM-LEFT of page.
 * HTML Y origin = TOP-LEFT of page.
 *
 * Single-line fields: baseline should be ~1px ABOVE the printed underline (which is at HTML y2 = field bottom)
 * Multi-line fields: baseline of first line is below TOP of field box by ~ fontSize
 */
export function resolveFieldCoords(entity, pageHeight = A4_HEIGHT) {
  const rect = entity.html_map;
  if (!rect) return { pdf_x: 0, pdf_y: 0, fieldHeight: 0, isMultiLine: false, topY: 0, bottomY: 0, fieldLeft: 0, fieldRight: 0 };

  const { x1, y1, x2, y2 } = rect;
  const fieldHeight = y2 - y1;
  const isMultiLine = fieldHeight > 25;

  // For single-line: baseline sits slightly above the underline (y2 is the HTML bottom)
  // In PDF coords, that means pdf_y = pageHeight - y2 - MAP_OFFSET + small rise
  const underlinePdfY = pageHeight - y2 - MAP_OFFSET;
  const topPdfY = pageHeight - y1 - MAP_OFFSET;
  const centerPdfY = (underlinePdfY + topPdfY) / 2;

  let pdf_y;
  if (isMultiLine) {
    // First line baseline: (topPdfY - (approxFontAscent ~= 11)). Use 11 as standard 11pt font ascent
    pdf_y = topPdfY - Math.max(8, Math.round(fieldHeight * 0.25));
  } else {
    // Single-line: use EXACT calibrated position from comment line 2:
    //   "y2=140 -> pdf_y=635" => pdf_y = pageHeight - y2 - MAP_OFFSET = 842 - 140 - 67 = 635
    // So baseline = underline (y2) PDF Y + tiny rise for descenders to stay above line
    pdf_y = underlinePdfY + 1;
  }

  const coords = {
    pdf_x: x1 + MAP_OFFSET,
    pdf_y: pdf_y,
    fieldHeight: fieldHeight,
    isMultiLine: isMultiLine,
    topY: topPdfY,
    bottomY: underlinePdfY,
    fieldLeft: x1 + MAP_OFFSET,
    fieldRight: x2 + MAP_OFFSET,
    centerY: centerPdfY,
  };

  if (entity.inputType === 'select') {
    coords.pdf_x += 2;
    coords.pdf_y = centerPdfY;
  } else {
    coords.pdf_x += 5;
  }

  if (entity.field_key && FIELD_ADJUSTMENTS[entity.field_key]) {
    const adj = FIELD_ADJUSTMENTS[entity.field_key];
    coords.pdf_x += adj.x;
    coords.pdf_y += adj.y;
  }

  return coords;
}

/**
 * Validate coordinates are within page bounds
 * Preserves all properties from the input coords object
 */
export function validateCoordinates(coords, pageWidth = A4_WIDTH, pageHeight = A4_HEIGHT) {
  return {
    ...coords,
    pdf_x: Math.max(0, Math.min(coords.pdf_x, pageWidth - 20)),
    pdf_y: Math.max(20, Math.min(coords.pdf_y, pageHeight - 20)),
  };
}
