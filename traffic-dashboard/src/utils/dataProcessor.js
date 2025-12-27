import { formatTime24 } from './helpers';

export const processSheetData = (rawData, sourceFormat) => {
  const processed = rawData.map((row, index) => {
    // --- Helper ดึงค่า ---
    const getVal = (possibleKeys) => {
        const keys = Object.keys(row);
        for (const pk of possibleKeys) {
            const foundKey = keys.find(k => k.includes(pk.toLowerCase()));
            if (foundKey && row[foundKey]) return row[foundKey].trim();
        }
        return '';
    };

    // 1. Date & Time Parsing
    // 🛠️ FIX: ดึงค่าเวลา แล้วแปลงจุด (.) เป็นโคลอน (:) ทันที
    let timeRaw = getVal(['เวลา', 'time']); 
    if (timeRaw) {
        timeRaw = timeRaw.replace(/\./g, ':'); // แก้ปัญหา 19.00 -> 19:00
        // กรณีไม่มี : เลย (เช่น 1900) ให้เติม
        if (!timeRaw.includes(':') && timeRaw.length === 4) {
            timeRaw = timeRaw.slice(0, 2) + ":" + timeRaw.slice(2);
        }
    }

    const dateRaw = getVal(['วันที่', 'date']);
    const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
    const checkStr = (timestampRaw + dateRaw);
    
    // Check เบื้องต้นว่าใช่แถวข้อมูลหรือไม่
    if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

    let dateStr = '';
    let timeStr = '00:00';
    
    const parseDateParts = (str) => {
        if (!str) return '';
        const parts = str.split(/[\/\-\s]/);
        if (parts.length >= 3) {
            let d = parts[0], m = parts[1], y = parts[2];
            // กรณี format เป็น yyyy-mm-dd
            if (d.length === 4) { y = d; d = parts[2]; }
            
            let year = parseInt(y);
            if (year > 2400) year -= 543; // แปลง พ.ศ. -> ค.ศ.
            
            if (parseInt(m) > 12 || parseInt(m) < 1 || parseInt(d) > 31 || parseInt(d) < 1) return '';
            return `${year}-${m.toString().padStart(2,'0')}-${d.toString().padStart(2,'0')}`;
        }
        return '';
    };

    if (dateRaw) dateStr = parseDateParts(dateRaw);
    else if (timestampRaw) dateStr = parseDateParts(timestampRaw.split(' ')[0]);
    
    if (!dateStr || dateStr.length < 10) return null;

    // 🛠️ FIX: เรียกใช้ formatTime24 ด้วยค่าที่ Clean แล้ว
    if (timeRaw) {
         // ตรวจสอบ formatTime24 ว่ารับค่าแบบไหน ถ้ามันรับ 19:00 ได้ก็จบ
         // แต่ถ้ามันซับซ้อน เรากำหนดค่าตรงๆ เลยก็ได้ถ้ารูปแบบถูกต้องแล้ว
         const parts = timeRaw.split(':');
         if (parts.length >= 2) {
             timeStr = `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}`;
         } else {
             timeStr = formatTime24(timeRaw); // Fallback
         }
    } else if (timestampRaw) {
        const parts = timestampRaw.split(' ');
        if (parts.length >= 2) timeStr = formatTime24(parts.slice(1).join(' '));
    }

    // 2. Division & Location
    let div = '1', st = '1';
    const unitRaw = getVal(['หน่วยงาน', 'unit']);
    // Logic จับ Division: รองรับ "กก.8", "ทล.1 กก.2", หรือลงท้ายด้วยตัวเลข
    const divMatch = unitRaw.match(/กก\.?\s*(\d+)/) || unitRaw.match(/\/(\d+)/) || unitRaw.match(/(\d+)$/); 
    if (divMatch) div = divMatch[1];
    
    const stMatch = unitRaw.match(/ส\.ทล\.?\s*(\d+)/) || unitRaw.match(/^(\d+)/); 
    if (stMatch) st = stMatch[1];

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
    
    // กรองข้อมูลขยะ: ถ้าไม่มีถนน และ ไม่มี กม. ให้ตัดทิ้ง
    if ((!road || road === '-' || road === '') && (!km || km === '-' || km === '')) return null;

    let lat = parseFloat(getVal(['latitude', 'lat']));
    let lng = parseFloat(getVal(['longitude', 'lng']));
    if (isNaN(lat) || lat === 0) { lat = null; lng = null; }

    // 3. Category Logic
    let mainCategory = 'ทั่วไป', detailText = '', statusColor = 'bg-slate-500';

    if (sourceFormat === 'SAFETY') {
        // --- LOGIC ใหม่: เหมาว่าเป็นอุบัติเหตุทั้งหมด ---
        mainCategory = 'อุบัติเหตุ';
        statusColor = 'bg-red-600';

        // พยายามดึงรายละเอียดมาแสดง (ถ้ามี)
        const major = getVal(['เหตุน่าสนใจ', 'major']);
        const general = getVal(['เหตุทั่วไป', 'general']);
        
        if (major && major.length > 1 && major !== '-') {
            detailText = major;
        } else if (general && general.length > 1 && general !== '-') {
            detailText = general;
        } else {
            detailText = 'อุบัติเหตุ (ไม่ระบุรายละเอียด)';
        }

    } else if (sourceFormat === 'ENFORCE') {
        const arrest = getVal(['ผลการจับกุม', 'จับกุม']);
        const checkpoint = getVal(['จุดตรวจ ว.43', 'ว.43']);
        
        // 🛠️ เพิ่ม keyword 'เมา' เพื่อความชัวร์ (ตามโจทย์ก่อนหน้านี้)
        if (arrest && arrest !== '-' && arrest.length > 1) {
            mainCategory = 'จับกุม'; 
            if (arrest.includes('เมา')) mainCategory = 'จับกุมเมาแล้วขับ'; // (Optional) แยก Category ให้ชัดถ้าต้องการ
            detailText = arrest; 
            statusColor = 'bg-purple-600';
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