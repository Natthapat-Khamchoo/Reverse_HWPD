
import { getThaiDateStr } from './helpers';

export const generateProblemReport = (rawData, todayOnly = true) => {
    // 1. Filter Data
    const now = new Date();
    const todayStr = getThaiDateStr(now);
    const twoHoursAgo = now.getTime() - (2 * 60 * 60 * 1000);

    let filtered = rawData;
    if (todayOnly) {
        filtered = filtered.filter(item => item.date === todayStr);
    }

    // Sort by timestamp (Newest first)
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    // 2. Group by Problem Type
    const jams = [];
    const accidents = [];
    const activeLanes = [];

    // Track processed lanes to avoid duplicates if multiple reports exist for same location (though rawData usually has rows)
    // But since we want "active" lanes, we check for "opening" events that haven't been "closed".
    // Actually, the user requirement for "active" lanes matches the logic in App.jsx or map.
    // However, here we are processing a flat list of reports.
    // Simpler logic for this report:
    // - Jams: All rows with category 'จราจรติดขัด'
    // - Accidents: All rows with category 'อุบัติเหตุ'
    // - Lanes: "ยังเปิดอยู่ (ยังไม่มีการปิด)"
    //   This implies we need to calculate state first.

    // 2.1 Calculate Active Lanes
    const laneState = new Map();
    // We need to process from OLDEST to NEWEST to build state correctly
    const timeSorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);

    timeSorted.forEach(row => {
        if (row.category === 'ช่องทางพิเศษ') {
            const key = `${row.road}-${row.km}-${row.dir}`; // Unique key logic from App.jsx is usually more complex (div-st-road-dir), but report text usually uses road-km-dir.
            // Let's use ID or specific location key. 
            // In App.jsx: locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`
            const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
            laneState.set(locKey, row);
        } else if (row.category === 'ปิดช่องทางพิเศษ') {
            const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
            laneState.delete(locKey);
        }
    });

    // Convert map to array and sort by latest timestamp for the report
    activeLanes.push(...Array.from(laneState.values()).sort((a, b) => b.timestamp - a.timestamp));


    // 2.2 Filter Jams & Accidents
    filtered.forEach(item => {
        if (item.category === 'จราจรติดขัด') {
            jams.push(item);
        } else if (item.category === 'อุบัติเหตุ') {
            accidents.push(item);
        }
    });

    // 3. Helper to format a single line
    const formatLine = (item, type) => {
        // Ex: 🔴 ทล.1 กม.50 ขาออก - จราจรหนาแน่นมาก (08:45 น.) [กก.1 ส.ทล.2]
        // Ex: 🟢 ทล.35 กม.10 ขาออก - เปิดช่องทางพิเศษ (07:00 น.) [กก.6 ส.ทล.2]

        let emoji = '🔴'; // Default Jam
        if (item.category === 'อุบัติเหตุ') emoji = '🚗';
        if (item.category === 'ช่องทางพิเศษ') emoji = '🟢';

        // Refine Jam Emoji based on severity keywords
        if (item.category === 'จราจรติดขัด') {
            const txt = item.detail || '';
            if (txt.includes('เคลื่อนตัวช้า') || txt.includes('ปานกลาง')) emoji = '🟡';
        }

        const org = `[กก.${item.div} ส.ทล.${item.st}]`;
        const time = `(${item.time} น.)`;
        let detail = item.detail;

        // Clean up detail text if needed (sometimes it repeats the category)
        // detailed text usually good as is.

        let line = `${emoji} ทล.${item.road} กม.${item.km} ${item.dir} - ${detail} ${time} ${org}`;

        // Special warning for Long Open Lanes
        if (type === 'lane') {
            const isOpenLong = item.timestamp < twoHoursAgo;
            if (isOpenLong) {
                line += `\n⚠️ เปิดมานานกว่า 2 ชม. แล้ว`;
            }
        }

        return line;
    };

    // 4. Build Text
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let reportText = `บก.ทล.\nรายงานจุดที่มีปัญหา (จากเจ้าหน้าที่รายงาน)\nวันที่ ${dateStr} เวลา ${timeStr} น.\n`;

    // Section: Jams
    if (jams.length > 0) {
        reportText += `\n=== จราจรติดขัด ===\n`;
        reportText += jams.map(item => formatLine(item, 'jam')).join('\n');
    }

    // Section: Accidents
    if (accidents.length > 0) {
        reportText += `\n${jams.length > 0 ? '' : '\n'}=== อุบัติเหตุ ===\n`; // Add newline if prev section exists
        reportText += accidents.map(item => formatLine(item, 'accident')).join('\n');
    }

    // Section: Special Lanes
    if (activeLanes.length > 0) {
        reportText += `\n${(jams.length > 0 || accidents.length > 0) ? '' : '\n'}=== ช่องทางพิเศษ (ยังเปิดอยู่) ===\n`;
        reportText += activeLanes.map(item => formatLine(item, 'lane')).join('\n');
    }

    // Summary
    const total = jams.length + accidents.length + activeLanes.length;
    if (total === 0) {
        reportText += `\n\n✅ ไม่พบรายงานจุดที่มีปัญหาในขณะนี้`;
    } else {
        const parts = [];
        if (jams.length > 0) parts.push(`ติดขัด ${jams.length}`);
        if (accidents.length > 0) parts.push(`อุบัติเหตุ ${accidents.length}`);
        if (activeLanes.length > 0) parts.push(`ช่องทางพิเศษ ${activeLanes.length}`);

        reportText += `\n\nสรุป: พบจุดปัญหา ${total} จุด (${parts.join(', ')})`;
    }

    return {
        text: reportText,
        metadata: {
            congestionCount: jams.length,
            accidentCount: accidents.length,
            activeLaneCount: activeLanes.length,
            totalProblems: total,
            timestamp: now.getTime()
        }
    };
};
