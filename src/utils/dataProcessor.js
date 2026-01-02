import { formatTime24, formatDuration } from './helpers';

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
        // ตัวอย่าง: "กก.8", "ทล.1 กก.2", "สถานีฯ 2 กก.1", "1/2", "คก.6"
        const divMatch = unitRaw.match(/(?:กก|คก)\.?(\d+)/) || unitRaw.match(/sub-?division\s*(\d+)/i) || unitRaw.match(/\/(\d+)/);
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
            // Pattern 1: Standard "ทล.XXX" or "ทล XXX" or "Route XXX" or "มอเตอร์เวย์สาย 9"
            // รองรับ: ทล.9, ทล 32, ทล.340, สาย 7, หมายเลข 9, M7, M81, ทล.พ.9
            const roadMatch = locRaw.match(/(?:ทล\.พ\.|ทล|หมายเลข|no|route|สาย)\.?\s*(\d+)/i) ||
                locRaw.match(/(?:m|M)\s*(\d+)/) || // Case "M7", "M 81"
                locRaw.match(/motorway\s*(\d+)/i) ||
                locRaw.match(/^(\d+)\s*\//); // Case "9/1200"

            if (roadMatch) road = roadMatch[1];

            // Pattern 2: KM Extraction
            // รองรับ: กม.20, กม 20+500, (20+500), กม.20+000
            const kmMatch = locRaw.match(/(?:กม|km)\.?\s*(\d+(?:\+\d+)?)/i) ||
                locRaw.match(/\s\((\d+\+\d+)\)/) || // Case "ทล.340(30+400)"
                locRaw.match(/(\d+\+\d+)/); // Case "30+400" loose match

            if (kmMatch) km = kmMatch[1];

            // Direction Logic
            if (locRaw.includes('ขาเข้า')) dir = 'ขาเข้า';
            else if (locRaw.includes('ขาออก')) dir = 'ขาออก';
            else if (locRaw.includes('มุ่งหน้า')) {
                const destMatch = locRaw.match(/มุ่งหน้า\s*([^\s]+)/);
                if (destMatch) dir = `มุ่งหน้า${destMatch[1]}`;
            }
        }

        // Logic Logic: Force Road ID based on Division 8 (Motorways) if known
        if (div === '8') {
            if (st === '1') road = '7';         // Motorway 7
            else if (st === '2') road = '9';    // Motorway 9
            else if (st === '3') road = 'M6';   // Motorway 6
            else if (st === '4') road = 'M81';  // Motorway 81
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

            // เช็คโดยตรง: ขึ้นต้นด้วย "เปิด" = เปิด, ขึ้นต้นด้วย "ปิด" หรือมี "ยกเลิก" = ปิด
            if (specialLane && specialLane.startsWith('เปิด')) {
                mainCategory = 'ช่องทางพิเศษ';
                detailText = specialLane;
                statusColor = 'bg-green-500';
            } else if (specialLane && (/(?:^|[^เ])ปิด/.test(specialLane) || specialLane.includes('ยกเลิก'))) {
                mainCategory = 'ปิดช่องทางพิเศษ';
                detailText = specialLane;
                statusColor = 'bg-slate-500';
            } else if (traffic) {
                if (traffic.includes('ติดขัด') || traffic.includes('หนาแน่น') || traffic.includes('มาก')) {
                    mainCategory = 'จราจรติดขัด'; detailText = tailback ? `${traffic} ท้ายแถว ${tailback}` : traffic; statusColor = 'bg-yellow-500';
                } else {
                    mainCategory = 'จราจรปกติ'; detailText = traffic; statusColor = 'bg-blue-400';
                }
            }
        }

        // 5. Special Extraction for Enforcement (Drunk Driving Count)
        let drunkDriverCount = 0;
        if (sourceFormat === 'ENFORCE') {
            const amountRaw = getVal(['จำนวนเมา', 'จำนวน', 'amount', 'ราย']);
            if (amountRaw) {
                const amtMatch = amountRaw.match(/(\d+)/);
                if (amtMatch) drunkDriverCount = parseInt(amtMatch[1], 10);
                // Debug Mismatch
                console.log(`🍺 Drunk Check:`, { raw: amountRaw, extracted: drunkDriverCount, unit: unitRaw, detail: detailText });
            } else {
                console.log(`🍺 Drunk Check (No Amount):`, { raw: amountRaw, detail: detailText });
            }
        }

        return {
            id: `${sourceFormat}-${index}`,
            date: dateStr, time: timeStr, div: div, st: st,
            category: mainCategory, detail: detailText,
            road: road || 'ไม่ระบุ', km: km || '-', dir: dir || '-',
            lat: lat, lng: lng, colorClass: statusColor, reportFormat: sourceFormat,
            drunkDriverCount: drunkDriverCount,
            timestamp: new Date(`${dateStr}T${timeStr}`).getTime() || 0
        };
    });

    return processed.filter(item => item !== null);
};

// New Helper: Calculate Special Lane Stats (Unifying Logic with LogTablesSection)
export const calculateSpecialLaneStats = (logData) => {
    // 1. Separate Open/Close events
    const openLanes = logData.filter(item => item.category === 'ช่องทางพิเศษ');
    const closedLanes = logData.filter(item => item.category === 'ปิดช่องทางพิเศษ');

    // 2. Sort by time to ensure chronological processing
    openLanes.sort((a, b) => a.timestamp - b.timestamp);
    closedLanes.sort((a, b) => a.timestamp - b.timestamp);

    // Note: We used to track usedCloseEvents to prevent one close event from closing multiple opens.
    // However, in practice, a single "Close" report might apply to multiple "Open" entries 
    // (e.g., redundant reports or updates). So we now allow reuse to ensure nothing remains falsely "Active".

    const enhancedLanes = openLanes.map((openLane, idx) => {
        const pairingKey = `${openLane.div}-${openLane.st}`;

        // Find potential close candidates
        const potentialCloses = closedLanes.filter(closeLane => {
            const closeKey = `${closeLane.div}-${closeLane.st}`;
            const isSameUnit = closeKey === pairingKey;

            // Relaxed Match 1: If Unit doesn't match, check if Road is same and Division is same
            const isSameRoadAndDiv = (openLane.road !== 'ไม่ระบุ' && openLane.road === closeLane.road) && (openLane.div === closeLane.div);

            // Relaxed Match 2: If Division doesn't match, check if Road AND KM are same (Strong signal)
            const isSameRoadAndKM = (openLane.road !== 'ไม่ระบุ' && openLane.road === closeLane.road) &&
                (openLane.km !== '-' && openLane.km === closeLane.km);

            const isMatch = isSameUnit || isSameRoadAndDiv || isSameRoadAndKM;

            const afterOpen = closeLane.timestamp > openLane.timestamp;
            const within12Hours = (closeLane.timestamp - openLane.timestamp) < (12 * 60 * 60 * 1000); // Relax to 12h

            return isMatch && afterOpen && within12Hours;
        });

        // Best Match Strategy: Pick the closest time (First one since we sorted)
        const closestClose = potentialCloses.length > 0 ? potentialCloses[0] : null;

        const isStillActive = !closestClose;
        const durationMinutes = closestClose
            ? (closestClose.timestamp - openLane.timestamp) / 1000 / 60
            : null;

        const isOpenTooLong = durationMinutes && durationMinutes > 240;
        const locationKey = `${openLane.div}-${openLane.st}-${openLane.road}-${openLane.km}-${openLane.dir}`;

        return {
            ...openLane,
            isStillActive,
            closestClose,
            closeInfo: closestClose ? {
                time: closestClose.time,
                date: closestClose.date,
                timestamp: closestClose.timestamp,
                detail: closestClose.detail
            } : null,
            duration: durationMinutes,
            durationText: formatDuration(durationMinutes),
            isOpenTooLong,
            locationKey
        };
    });

    const activeLanes = enhancedLanes.filter(l => l.isStillActive);
    const closedActiveLanes = enhancedLanes.filter(l => !l.isStillActive);

    return {
        activeCount: activeLanes.length,
        openCount: openLanes.length,
        closeCount: closedLanes.length,
        activeLanes: activeLanes,
        allEnhancedLanes: enhancedLanes,
        closedActiveLanes: closedActiveLanes
    };
};