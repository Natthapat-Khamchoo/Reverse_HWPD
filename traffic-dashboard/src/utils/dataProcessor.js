// src/utils/dataProcessor.js
import { formatTime24 } from './helpers';

export const processSheetData = (rawData, sourceFormat) => {
  const processed = rawData.map((row, index) => {
    const getVal = (possibleKeys) => {
      const keys = Object.keys(row);
      for (const pk of possibleKeys) {
        const foundKey = keys.find(k => k.includes(pk.toLowerCase()));
        if (foundKey && row[foundKey]) return row[foundKey].trim();
      }
      return '';
    };

    const timeRaw = getVal(['เวลา', 'time']); 
    const dateRaw = getVal(['วันที่', 'date']);
    const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
    
    const checkStr = (timestampRaw + dateRaw);
    if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

    let dateStr = '';
    let timeStr = '00:00';

    if (dateRaw && dateRaw.includes('/')) {
        const [d, m, y] = dateRaw.split('/');
        let year = parseInt(y);
        if (year > 2400) year -= 543;
        dateStr = `${year}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
    } else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts[0].includes('/')) {
            const [d, m, y] = parts[0].split('/');
            let year = parseInt(y); if (year > 2400) year -= 543;
            dateStr = `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else { dateStr = parts[0]; }
    }

    if (timeRaw) { timeStr = formatTime24(timeRaw); } 
    else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts.length >= 2) { const tPart = parts.slice(1).join(' '); timeStr = formatTime24(tPart); }
    }

    if (!dateStr || dateStr.length < 8) return null;

    let div = '1', st = '1';
    const unitRaw = getVal(['หน่วยงาน', 'unit']);
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/); if (divMatch) div = divMatch[1];
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/); if (stMatch) st = stMatch[1];

    let road = '-', km = '-', dir = '-';
    const locRaw = getVal(['จุดเกิดเหตุ', 'location', 'สถานที่']);
    const expRoad = getVal(['ทล.', 'ทล', 'road']); if(expRoad) road = expRoad;
    const expKm = getVal(['กม.', 'กม', 'km']); if(expKm) km = expKm;
    const expDir = getVal(['ทิศทาง', 'direction']); if(expDir) dir = expDir;

    if (road === '-' && locRaw) {
        const roadMatch = locRaw.match(/(?:ทล|หมายเลข|no)\.?\s*(\d+)/i) || locRaw.match(/^(\d+)\s*\//);
        if (roadMatch) road = roadMatch[1];
        const kmMatch = locRaw.match(/(?:กม)\.?\s*(\d+)/i);
        if (kmMatch) km = kmMatch[1];
        if (locRaw.includes('ขาเข้า')) dir = 'ขาเข้า';
        else if (locRaw.includes('ขาออก')) dir = 'ขาออก';
    }

    let lat = parseFloat(getVal(['latitude', 'lat']));
    let lng = parseFloat(getVal(['longitude', 'lng']));
    if (isNaN(lat) || lat === 0) lat = 13.75 + (Math.random() - 0.5) * 2;
    if (isNaN(lng) || lng === 0) lng = 100.50 + (Math.random() - 0.5) * 2;

    let mainCategory = 'ทั่วไป', detailText = '', statusColor = 'bg-slate-500';

    if (sourceFormat === 'SAFETY') {
        const major = getVal(['เหตุน่าสนใจ', 'major']);
        const general = getVal(['เหตุทั่วไป', 'general']);
        if (major && major !== '-' && major.length > 1) { 
            mainCategory = 'อุบัติเหตุใหญ่'; detailText = major; statusColor = 'bg-red-600'; 
        } else {
            mainCategory = 'อุบัติเหตุทั่วไป'; detailText = general || '-'; statusColor = 'bg-orange-500';
        }
    } else if (sourceFormat === 'ENFORCE') {
        const arrest = getVal(['ผลการจับกุม', 'จับกุม']);
        const checkpoint = getVal(['จุดตรวจ ว.43', 'ว.43']);
        if (arrest && arrest !== '-' && arrest.length > 1) {
            mainCategory = 'จับกุม'; detailText = arrest; statusColor = 'bg-purple-600';
        } else {
            mainCategory = 'ว.43'; detailText = checkpoint || '-'; statusColor = 'bg-indigo-500';
        }
    } else if (sourceFormat === 'TRAFFIC') {
        const specialLane = getVal(['ช่องทางพิเศษ']);
        const traffic = getVal(['สภาพจราจร']);
        const tailback = getVal(['ท้ายแถว']);
        if (specialLane && specialLane !== '-' && specialLane.length > 1) {
             if (specialLane.includes('เปิด') || specialLane.includes('เริ่ม')) mainCategory = 'ช่องทางพิเศษ'; 
             else if (specialLane.includes('ปิด') || specialLane.includes('ยกเลิก')) mainCategory = 'ปิดช่องทางพิเศษ'; 
             else mainCategory = 'ช่องทางพิเศษ'; 
             detailText = specialLane; statusColor = 'bg-green-500';
        } else if (traffic) {
             if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น')) {
                mainCategory = 'จราจรติดขัด'; detailText = tailback ? `ท้ายแถว ${tailback}` : traffic; statusColor = 'bg-yellow-500';
             } else {
                mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-slate-500';
             }
        }
    }

    return {
      id: `${sourceFormat}-${index}`,
      date: dateStr, time: timeStr, div: div, st: st,
      category: mainCategory, detail: detailText,
      road: road, km: km, dir: dir,
      lat: lat, lng: lng, colorClass: statusColor, reportFormat: sourceFormat,
      timestamp: new Date(`${dateStr}T${timeStr}`).getTime() || 0
    };
  });
  return processed.filter(item => item !== null);
};