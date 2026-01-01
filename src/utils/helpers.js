// src/utils/helpers.js
export const getThaiDateStr = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });

export const formatTime24 = (rawTime) => {
  if (!rawTime) return '00:00';
  // Remove 'น.' or 'น' and trim
  let t = rawTime.toString().replace(/น\.|น/g, '').trim().toUpperCase();
  // Replace ALL dots with colons (e.g. 12.30 -> 12:30)
  t = t.replace(/\./g, ':');

  const isPM = t.includes('PM') || t.includes('P.M');
  const isAM = t.includes('AM') || t.includes('A.M');

  // Remove non-digit/colon chars
  const timeOnly = t.replace(/[^\d:]/g, '');
  let [h, m] = timeOnly.split(':');

  if (!h) return '00:00';
  if (!m) m = '00';

  let hh = parseInt(h, 10);
  let mm = parseInt(m.substring(0, 2), 10);

  if (isNaN(hh)) hh = 0;
  if (isNaN(mm)) mm = 0;

  if (isPM && hh < 12) hh += 12;
  if (isAM && hh === 12) hh = 0;

  // Handle 24:00 -> 00:00
  if (hh === 24) hh = 0;
  else if (hh > 23) hh = 0; // Fallback for strange times

  if (mm > 59) mm = 59;

  return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

export const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return null;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0 && mins > 0) return `${hours} ชม. ${mins} นาที`;
  if (hours > 0) return `${hours} ชม.`;
  return `${mins} นาที`;
};

export const parseCSV = (text) => {
  if (!text) return [];
  const rows = []; let currentRow = []; let currentVal = ''; let insideQuote = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]; const nextChar = text[i + 1];
    if (char === '"') {
      if (insideQuote && nextChar === '"') { currentVal += '"'; i++; } else { insideQuote = !insideQuote; }
    } else if (char === ',' && !insideQuote) { currentRow.push(currentVal.trim()); currentVal = ''; }
    else if ((char === '\n' || char === '\r') && !insideQuote) {
      if (currentVal || currentRow.length > 0) currentRow.push(currentVal.trim());
      if (currentRow.length > 0) rows.push(currentRow);
      currentRow = []; currentVal = ''; if (char === '\r' && nextChar === '\n') i++;
    } else { currentVal += char; }
  }
  if (currentVal || currentRow.length > 0) { currentRow.push(currentVal.trim()); rows.push(currentRow); }
  if (rows.length < 2) return [];
  const headers = rows[0].map(h => h.replace(/^"|"$/g, '').toLowerCase());
  return rows.slice(1).map(values => {
    return headers.reduce((obj, header, index) => {
      obj[header] = values[index] ? values[index].replace(/^"|"$/g, '') : '';
      return obj;
    }, {});
  });
};