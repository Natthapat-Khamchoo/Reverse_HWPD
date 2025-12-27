// src/utils/dataProcessor.js

export const processSheetData = (rows, type) => {
  if (!rows || rows.length === 0) return [];

  return rows.map((row, index) => {
    // 1. จัดการวันที่ (Date Handling)
    // รองรับทั้ง "26/12/2025" และ "2025-12-26"
    let dateStr = row['วันที่'] || '';
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
            // แปลง dd/mm/yyyy -> yyyy-mm-dd (ISO format สำหรับเปรียบเทียบ)
            // ระวังเรื่อง ค.ศ./พ.ศ. ถ้า Google Sheet ส่งมาเป็น ค.ศ. แล้วก็ใช้ได้เลย
            dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`; 
        }
    }

    // 2. จัดการเวลา (Time Handling) - 🛠️ จุดแก้บั๊ก 19.00 -> 19:00
    let timeStr = row['เวลา'] ? String(row['เวลา']).trim() : "00:00";
    
    // แปลงจุดทศนิยมเป็นทวิภาค (Colon)
    timeStr = timeStr.replace('.', ':');
    
    // จัดรูปแบบให้สมบูรณ์ (เช่น "9:5" -> "09:05")
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
        timeStr = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}`;
    } else if (timeParts.length === 1 && timeStr.length === 4) {
        // กรณีมาเป็น "1900"
        timeStr = `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
    }

    // สร้าง Timestamp สำหรับเรียงลำดับ
    let timestamp = 0;
    try {
        timestamp = new Date(`${dateStr}T${timeStr}:00`).getTime();
    } catch (e) {
        timestamp = 0;
    }

    // 3. จัดการพิกัด (Coordinates)
    // บางครั้ง Latitude มาเป็น "15.8527664" (String) ต้องแปลงเป็น Number
    const lat = parseFloat(row['Latitude'] || row['lat'] || 0);
    const lng = parseFloat(row['Longitude'] || row['lng'] || row['lon'] || 0);

    // Return ข้อมูลที่ Clean แล้ว
    return {
      id: `${type}-${index}`,
      date: dateStr, // format: yyyy-mm-dd
      time: timeStr, // format: HH:mm
      timestamp: timestamp,
      div: extractDivision(row['หน่วยงาน']), // แยกเลขกองกำกับการ (เช่น "ส.ทล.4 กก.1" -> "1")
      st: extractStation(row['หน่วยงาน']),   // แยกเลขสถานี (เช่น "ส.ทล.4 กก.1" -> "4")
      category: mapCategory(row, type),      // จัดกลุ่ม Category ให้เป็นมาตรฐาน
      detail: row['รายละเอียด'] || row['Original Text'] || row['ผลการจับกุม'] || '',
      road: extractRoad(row['จุดเกิดเหตุ'] || row['รายละเอียด']),
      km: extractKM(row['จุดเกิดเหตุ'] || row['รายละเอียด']),
      dir: extractDirection(row['จุดเกิดเหตุ'] || row['รายละเอียด']),
      lat: lat,
      lng: lng,
      specialLane: row['ช่องทางพิเศษ'] || '', // ถ้ามีคอลัมน์นี้
      reportFormat: type
    };
  }).filter(item => item.date); // กรองแถวที่ไม่มีวันที่ทิ้ง
};

// --- Helper Functions สำหรับไฟล์นี้ ---

const extractDivision = (text) => {
    if (!text) return '';
    const match = text.match(/กก\.(\d+)/);
    return match ? match[1] : '';
};

const extractStation = (text) => {
    if (!text) return '';
    const match = text.match(/ส\.ทล\.(\d+)/);
    return match ? match[1] : '';
};

const mapCategory = (row, type) => {
    // Logic การ mapping ชื่อเหตุการณ์ให้เป็นสีเดียวกัน
    const rawCat = row['หมวดหมู่'] || row['ผลการจับกุม'] || '';
    if (type === 'SAFETY' || rawCat.includes('อุบัติเหตุ')) return 'อุบัติเหตุ';
    if (rawCat.includes('เมา')) return 'จับกุม'; // หรือแยกเป็น 'เมาแล้วขับ' ตามต้องการ
    if (rawCat.includes('จราจร')) return 'จราจรติดขัด';
    if (rawCat.includes('ช่องทางพิเศษ')) return 'ช่องทางพิเศษ';
    return rawCat || 'ทั่วไป';
};

const extractRoad = (text) => {
    // ตัวอย่างการดึงเลขถนนแบบง่าย
    if (!text) return '-';
    // พยายามหาคำว่า ทล.32, M6, ถนนเอเชีย
    if (text.includes('M6')) return 'M6';
    if (text.includes('สายเอเชีย')) return '32';
    if (text.includes('พหลโยธิน')) return '1';
    if (text.includes('มิตรภาพ')) return '2';
    const match = text.match(/ทล\.(\d+)/);
    return match ? match[1] : '-';
};

const extractKM = (text) => {
    if (!text) return '';
    const match = text.match(/กม\.(\d+)/);
    return match ? match[1] : '';
};

const extractDirection = (text) => {
    if (!text) return '';
    if (text.includes('ขาเข้า')) return 'ขาเข้า';
    if (text.includes('ขาออก')) return 'ขาออก';
    return '';
};