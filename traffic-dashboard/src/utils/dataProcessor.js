import { formatTime24 } from './helpers';

export const processSheetData = (rawData, sourceFormat) => {
  const processed = rawData.map((row, index) => {
    // --- Helper ดึงค่าจาก Key ต่างๆ ---
    const getVal = (possibleKeys) => {
        const keys = Object.keys(row);
        for (const pk of possibleKeys) {
            const foundKey = keys.find(k => k.includes(pk.toLowerCase()));
            if (foundKey && row[foundKey]) return row[foundKey].trim();
        }
        return '';
    };

    // --- 1. ตรวจสอบข้อมูลเบื้องต้น ---
    const timeRaw = getVal(['เวลา', 'time']); 
    const dateRaw = getVal(['วันที่', 'date']);
    const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
    
    // ถ้าไม่มีข้อมูลวันที่เลย ให้ข้าม
    const checkStr = (timestampRaw + dateRaw);
    if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

    // --- 2. จัดการวันที่ (Date Parsing) ---
    let dateStr = '';
    let timeStr = '00:00';

    // ฟังก์ชันแปลงวันที่ DD/MM/YYYY -> YYYY-MM-DD
    const parseDateParts = (str) => {
        if (!str) return '';
        const parts = str.split(/[\/\-\s]/); // แยกด้วย / หรือ - หรือ space
        if (parts.length >= 3) {
            let d = parts[0];
            let m = parts[1];
            let y = parts[2];
            
            // กรณีเจอ format ผิดปกติ เช่น เอาปีขึ้นก่อน (2025/12/19)
            if (d.length === 4) { y = d; d = parts[2]; } 
            
            let year = parseInt(y);
            if (year > 2400) year -= 543; // แปลง พ.ศ. เป็น ค.ศ.
            
            // Validation: เดือนต้องไม่เกิน 12, วันต้องไม่เกิน 31
            if (parseInt(m) > 12 || parseInt(d) > 31) return ''; 

            return `${year}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        }
        return '';
    };

    if (dateRaw) {
        dateStr = parseDateParts(dateRaw);
    } else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        dateStr = parseDateParts(parts[0]);
    }

    // ถ้าแปลงวันที่ไม่ได้ หรือได้วันที่ไม่สมบูรณ์ -> ตัดทิ้ง (Garbage Date)
    if (!dateStr || dateStr.length < 10) return null;

    // --- 3. จัดการเวลา ---
    if (timeRaw) { timeStr = formatTime24(timeRaw); } 
    else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts.length >= 2) { const tPart = parts.slice(1).join(' '); timeStr = formatTime24(tPart); }
    }

    // --- 4. จัดการสถานที่ (Location Parsing) ---
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

    // *** กรองข้อมูลขยะ (Garbage Data Filter) ***
    // ถ้าไม่มีเลขถนน AND ไม่มีเลข กม. -> ตัดทิ้ง
    if ((!road || road === '-' || road === '') && (!km || km === '-' || km === '')) {
        return null; 
    }

    // --- 5. พิกัด (Lat/Lng) ---
    let lat = parseFloat(getVal(['latitude', 'lat']));
    let lng = parseFloat(getVal(['longitude', 'lng']));
    if (isNaN(lat) || lat === 0) lat = null;
    if (isNaN(lng) || lng === 0) lng = null;

    // --- 6. ประเภทเหตุการณ์ (Category) ---
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