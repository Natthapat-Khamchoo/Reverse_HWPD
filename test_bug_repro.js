
// Mock Helpers
const formatTime24 = (rawTime) => {
    if (!rawTime) return '00:00';
    let t = rawTime.toString().replace(/น\.|น/g, '').trim().toUpperCase();
    t = t.replace(/\./g, ':');
    const timeOnly = t.replace(/[^\d:]/g, '');
    let [h, m] = timeOnly.split(':');
    if (!h) return '00:00';
    if (!m) m = '00';
    let hh = parseInt(h, 10);
    let mm = parseInt(m.substring(0, 2), 10);
    if (isNaN(hh)) hh = 0; if (isNaN(mm)) mm = 0;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
};

const formatDuration = (m) => m ? `${m} min` : '';

// Mock Process Logic (Copied from dataProcessor.js with updates)
const processSheetData = (rawData, sourceFormat) => {
    return rawData.map((row, index) => {
        const getVal = (possibleKeys) => {
            const keys = Object.keys(row);
            for (const pk of possibleKeys) {
                const foundKey = keys.find(k => k.toLowerCase().includes(pk.toLowerCase()));
                if (foundKey && row[foundKey]) return row[foundKey].trim();
            }
            return '';
        };

        const timeRaw = getVal(['เวลา', 'time']);
        const dateRaw = getVal(['วันที่', 'date']);

        let dateStr = '';
        let timeStr = '00:00';

        const parseDateParts = (str) => {
            if (!str) return '';
            const cleaned = str.replace(/T/g, ' ').replace(/\//g, '-').trim();
            const parts = cleaned.split(/[\-\s]/);
            if (parts.length >= 3) {
                let y = parts[0], m = parts[1], d = parts[2];
                if (parseInt(y) < 32 && parseInt(d) > 1900) { const temp = y; y = d; d = temp; }
                else if (parseInt(d) > 31 && parseInt(y) < 32) { const temp = d; d = y; y = temp; }
                let year = parseInt(y);
                if (year > 2400) year -= 543;
                if (year < 100) year += 2000;
                return `${year}-${parts[1].padStart(2, '0')}-${parseInt(d).toString().padStart(2, '0')}`;
            }
            return '';
        };
        dateStr = parseDateParts(dateRaw);
        timeStr = formatTime24(timeRaw);

        let div = '1', st = '1';
        const unitRaw = getVal(['หน่วยงาน', 'unit']);
        const divMatch = unitRaw.match(/(?:กก|คก)\.?(\d+)/) || unitRaw.match(/sub-?division\s*(\d+)/i) || unitRaw.match(/\/(\d+)/);
        if (divMatch) div = divMatch[1];
        const stMatch = unitRaw.match(/ส\.ทล\.?(\d+)/);
        if (stMatch) st = stMatch[1];

        let road = '-', km = '-', dir = '-';
        const locRaw = getVal(['จุดเกิดเหตุ', 'location']);
        const roadMatch = locRaw.match(/(?:ทล\.พ\.|ทล|หมายเลข|no|route|สาย)\.?\s*(\d+)/i);
        if (roadMatch) road = roadMatch[1];

        let mainCategory = 'ทั่วไป';
        const specialLane = getVal(['ช่องทางพิเศษ']);
        if (specialLane && specialLane.startsWith('เปิด')) {
            mainCategory = 'ช่องทางพิเศษ';
        } else if (specialLane && (/(?:^|[^เ])ปิด/.test(specialLane) || specialLane.includes('ยกเลิก'))) {
            mainCategory = 'ปิดช่องทางพิเศษ';
        }

        return {
            id: `${sourceFormat}-${index}`,
            date: dateStr, time: timeStr, div: div, st: st,
            category: mainCategory, detail: specialLane || '',
            road: road,
            timestamp: new Date(`${dateStr}T${timeStr}`).getTime() || 0,
            originalUnit: unitRaw
        };
    }).filter(x => x);
};

const calculateSpecialLaneStats = (logData) => {
    const openLanes = logData.filter(item => item.category === 'ช่องทางพิเศษ');
    const closedLanes = logData.filter(item => item.category === 'ปิดช่องทางพิเศษ');

    openLanes.sort((a, b) => a.timestamp - b.timestamp);
    closedLanes.sort((a, b) => a.timestamp - b.timestamp);

    const usedCloseEvents = new Set();

    const enhancedLanes = openLanes.map(openLane => {
        const pairingKey = `${openLane.div}-${openLane.st}`;
        const potentialCloses = closedLanes.filter(closeLane => {
            const closeId = `${closeLane.div}-${closeLane.st}-${closeLane.timestamp}`;
            if (usedCloseEvents.has(closeId)) return false;

            const closeKey = `${closeLane.div}-${closeLane.st}`;
            const isSameUnit = closeKey === pairingKey;
            const isSameRoadAndDiv = (openLane.road !== 'ไม่ระบุ' && openLane.road === closeLane.road) && (openLane.div === closeLane.div);

            const isMatch = isSameUnit || isSameRoadAndDiv;
            const afterOpen = closeLane.timestamp > openLane.timestamp;

            console.log(`Checking Close: ${closeLane.time} vs Open ${openLane.time}`);
            console.log(`- Same Unit? ${isSameUnit} (${closeKey} vs ${pairingKey})`);
            console.log(`- Same Road/Div? ${isSameRoadAndDiv}`);
            console.log(`- After Open? ${afterOpen} (${closeLane.timestamp} > ${openLane.timestamp})`);
            console.log(`- Match Result: ${isMatch && afterOpen}`);

            return isMatch && afterOpen;
        });

        const closestClose = potentialCloses[0];
        if (closestClose) {
            usedCloseEvents.add(`${closestClose.div}-${closestClose.st}-${closestClose.timestamp}`);
        }
        return { ...openLane, isStillActive: !closestClose, closestClose };
    });

    return enhancedLanes;
};

// Test Data
const rawData = [
    {
        'เวลา': '16.30', 'วันที่': '01/01/2026', 'หน่วยงาน': 'ส.ทล.1 กก.6',
        'จุดเกิดเหตุ': 'ทล.2 / กม.39', 'ช่องทางพิเศษ': 'เปิดช่องทางพิเศษ ทล.2 กม.39 - 24 สระบุรี'
    },
    {
        'เวลา': '20.50', 'วันที่': '01/01/2026', 'หน่วยงาน': 'ส.ทล.1 กก.6',
        'จุดเกิดเหตุ': 'ทล.2 / กม.39', 'ช่องทางพิเศษ': '❌ ปิดช่องทางพิเศษ ทล.2 กม.39-24'
    }
];

const processed = processSheetData(rawData, 'TRAFFIC');
console.log('Processed Data:', JSON.stringify(processed, null, 2));

const stats = calculateSpecialLaneStats(processed);
console.log('Stats:', stats.map(s => ({ active: s.isStillActive, open: s.time, close: s.closestClose?.time })));
