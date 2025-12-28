import { formatTime24 } from './helpers';

export const processSheetData = (rawData, sourceFormat) => {
    const processed = rawData.map((row, index) => {
        // --- Helper ดึงค่า ---
        const getVal = (possibleKeys) => {
            const keys = Object.keys(row);
            for (const pk of possibleKeys) {
                const foundKey = keys.find(k => k.toLowerCase().includes(pk.toLowerCase()));
                if (foundKey && row[foundKey]) return row[foundKey].trim();
            }
            return '';
        };

        // 1. Date & Time Parsing
        const timeRaw = getVal(['เวลา', 'time']);
        const dateRaw = getVal(['วันที่', 'date']);
        const timestampRaw = getVal(['timestamp', 'วันที่ เวลา']);
        const checkStr = (timestampRaw + dateRaw);

        // Check เบื้องต้นว่าใช่แถวข้อมูลหรือไม่
        if (!/\d/.test(checkStr) || checkStr.includes('หน่วย') || checkStr.includes('Date')) return null;

        let dateStr = '';
        let timeStr = '00:00';

        const parseDateParts = (str) => {
            if (!str) return '';
            // Normalizing separators
            const cleaned = str.replace(/T/g, ' ').replace(/\//g, '-').trim();
            const parts = cleaned.split(/[\-\s]/);

            if (parts.length >= 3) {
                let y = parts[0], m = parts[1], d = parts[2];

                // Detection: DD-MM-YYYY vs YYYY-MM-DD
                if (parseInt(y) < 32 && parseInt(d) > 1900) {
                    // Likely DD-MM-YYYY
                    const temp = y; y = d; d = temp;
                } else if (parseInt(d) > 31 && parseInt(y) < 32) {
                    // Mixed case
                    const temp = d; d = y; y = temp;
                }

                let year = parseInt(y);
                // Handling Thai Year (BE)
                if (year > 2400) year -= 543;
                // Handling 2-digit year (e.g. 66 -> 2023) - heuristics
                if (year < 100) year += 2000;

                const mm = parseInt(m);
                const dd = parseInt(d);

                if (mm > 12 || mm < 1 || dd > 31 || dd < 1) return '';
                return `${year}-${mm.toString().padStart(2, '0')}-${dd.toString().padStart(2, '0')}`;
            }
            return '';
        };

        if (dateRaw) dateStr = parseDateParts(dateRaw);
        else if (timestampRaw) dateStr = parseDateParts(timestampRaw.split(' ')[0]);

        // Fallback: If no date, use today (or skip depending on strictness) - for now return null
        if (!dateStr || dateStr.length < 10) return null;

        if (timeRaw) timeStr = formatTime24(timeRaw);
        else if (timestampRaw) {
            // Extract time from timestamp if available
            const match = timestampRaw.match(/(\d{1,2})[:.](\d{2})/);
            if (match) timeStr = formatTime24(match[0]);
        }

        // 2. Division & Location
        let div = '1', st = '1';
        const unitRaw = getVal(['หน่วยงาน', 'unit']);

        // Logic จับ Division: รองรับ pattern หลากหลายมากขึ้น
        // ตัวอย่าง: "กก.8", "ทล.1 กก.2", "สถานีฯ 2 กก.1", "1/2"

        const divMatch = unitRaw.match(/กก\.?(\d+)/) || unitRaw.match(/sub-?division\s*(\d+)/i) || unitRaw.match(/\/(\d+)/);
        if (divMatch) div = divMatch[1];
        else {
            // Fallback for simple number at end
            const endMatch = unitRaw.match(/(\d+)$/);
            if (endMatch && parseInt(endMatch[1]) < 9) div = endMatch[1];
        }

        // Logic จับ Station
        const stMatch = unitRaw.match(/ส\.ทล\.?(\d+)/) || unitRaw.match(/station\s*(\d+)/i) || unitRaw.match(/^(\d+)[^\/]/);
        if (stMatch) st = stMatch[1];

        let road = '-', km = '-', dir = '-';
        // Combine multiple fields to find location info
        const locRaw = getVal(['จุดเกิดเหตุ', 'location', 'สถานที่']);
        const expRoad = getVal(['ทล.', 'ทล', 'road', 'route']); if (expRoad) road = expRoad;
        const expKm = getVal(['กม.', 'กม', 'km']); if (expKm) km = expKm;
        const expDir = getVal(['ทิศทาง', 'direction', 'side']); if (expDir) dir = expDir;

        // Smart Extraction from raw string if explicit fields are empty
        if ((road === '-' || road === '') && locRaw) {
            // Try to find "ทล.XXX" or "No.XXX" or "Route XXX"
            const roadMatch = locRaw.match(/(?:ทล|หมายเลข|no|route)\.?\s*(\d+)/i) || locRaw.match(/^(\d+)\s*\//);
            if (roadMatch) road = roadMatch[1];

            // Try to find KM
            const kmMatch = locRaw.match(/(?:กม)\.?\s*(\d+)/i);
            if (kmMatch) km = kmMatch[1];

            // Try to find Direction
            if (locRaw.includes('ขาเข้า')) dir = 'ขาเข้า';
            else if (locRaw.includes('ขาออก')) dir = 'ขาออก';
        }

        // RELAXED FILTERING: Don't drop immediately if road/km missing, unless locRaw is also missing
        if ((!road || road === '-') && (!locRaw || locRaw === '-')) return null;

        let lat = parseFloat(getVal(['latitude', 'lat']));
        let lng = parseFloat(getVal(['longitude', 'lng']));
        // Basic Bounds Check for Thailand (approx) to filter bad zeros
        if (isNaN(lat) || lat < 5 || lat > 21) lat = null;
        if (isNaN(lng) || lng < 97 || lng > 106) lng = null;

        // 3. Category Logic
        let mainCategory = 'ทั่วไป', detailText = '', statusColor = 'bg-slate-500';

        if (sourceFormat === 'SAFETY') {
            mainCategory = 'อุบัติเหตุ';
            statusColor = 'bg-red-600';

            const major = getVal(['เหตุน่าสนใจ', 'major']);
            const general = getVal(['เหตุทั่วไป', 'general']);
            const reason = getVal(['มูลเหตุสันนิษฐาน', 'cause']);

            // Combine details for better context
            const details = [];
            if (major && major !== '-') details.push(major);
            if (general && general !== '-') details.push(general);
            if (reason && reason !== '-') details.push(`(สาเหตุ: ${reason})`);

            detailText = details.length > 0 ? details.join(' ') : 'อุบัติเหตุ (ไม่ระบุรายละเอียด)';

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

            if (specialLane && specialLane !== '-' && specialLane.length > 1 && !specialLane.includes('ปิด')) {
                mainCategory = 'ช่องทางพิเศษ';
                detailText = specialLane; statusColor = 'bg-green-500';
            } else if (specialLane && (specialLane.includes('ปิด') || specialLane.includes('ยกเลิก'))) {
                mainCategory = 'ปิดช่องทางพิเศษ';
                detailText = specialLane; statusColor = 'bg-slate-500';
            } else if (traffic) {
                if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('มาก')) {
                    mainCategory = 'จราจรติดขัด'; detailText = tailback ? `${traffic} ท้ายแถว ${tailback}` : traffic; statusColor = 'bg-yellow-500';
                } else {
                    mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-blue-400';
                }
            }
        }

        return {
            id: `${sourceFormat}-${index}`,
            date: dateStr, time: timeStr, div: div, st: st,
            category: mainCategory, detail: detailText,
            road: road || 'ไม่ระบุ', km: km || '-', dir: dir || '-',
            lat: lat, lng: lng, colorClass: statusColor, reportFormat: sourceFormat,
            timestamp: new Date(`${dateStr}T${timeStr}`).getTime() || 0
        };
    });

    return processed.filter(item => item !== null);
};