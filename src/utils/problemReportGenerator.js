
import { getThaiDateStr } from './helpers';

// Helper to format a single line block (Reusable)
export const formatBlock = (item, type = 'general') => {
    let headerEmoji = '🔴';
    let headerTitle = 'จราจรติดขัด';

    // Explicit Type Override or Auto-detect
    if (item.category === 'อุบัติเหตุ' || type === 'accident') {
        headerEmoji = '🚗';
        headerTitle = 'อุบัติเหตุ';
    } else if (item.category === 'ช่องทางพิเศษ' || type === 'activeLane') {
        headerEmoji = '🟢';
        headerTitle = 'ช่องทางพิเศษ (เปิด)';
    } else if (item.category === 'ปิดช่องทางพิเศษ' || type === 'closedLane') {
        headerEmoji = '🛑';
        headerTitle = 'ช่องทางพิเศษ (ปิดแล้ว)';
    } else if (item.category === 'จับกุม' || item.detail.includes('เมา')) {
        headerEmoji = '🚔';
        headerTitle = 'จับกุม/เมาแล้วขับ';
    }

    // Refine Jam based on severity
    if (item.category === 'จราจรติดขัด') {
        const txt = item.detail || '';
        if (txt.includes('เคลื่อนตัวช้า') || txt.includes('ปานกลาง')) {
            headerEmoji = '🟡';
            headerTitle = 'รถมาก/ชะลอตัว';
        }
    }

    const roadInfo = `ทล.${item.road} กม.${item.km}`;
    const dirInfo = item.dir !== '-' ? `(${item.dir})` : '';
    let detailTxt = item.detail || '-';

    // Enhanced Detail for Special Lanes
    if (type === 'activeLane' && item.isEnhanced) {
        if (!item.isStillActive && item.closeInfo) {
            headerEmoji = '🔴';
            headerTitle = `ช่องทางพิเศษ (ปิดแล้ว)`;
            detailTxt = `${detailTxt}\n⏱️ เปิดเมื่อเวลา: ${item.time} น. ปิดเวลา: ${item.closeInfo.time} น. (${item.durationText || '-'})`;
        } else {
            headerEmoji = '🟢';
            headerTitle = `ช่องทางพิเศษ (เปิดอยู่)`;
            detailTxt = `${detailTxt}\n⏱️ เปิดเมื่อเวลา: ${item.time} น. (ยังเปิดใช้งานอยู่)`;
        }
    }

    const orgInfo = `กก.${item.div} ส.ทล.${item.st}`;
    const timeInfo = `${item.time} น.`;

    let block = `${headerEmoji} [${headerTitle}]
📍 จุดเกิดเหตุ: ${roadInfo} ${dirInfo}
📝 รายละเอียด: ${detailTxt}
🕒 เวลา: ${timeInfo} | 👮 หน่วย: ${orgInfo}`;

    return {
        text: block, // Full block text
        meta: {
            time: timeInfo,
            date: item.date, // Add date for filtering
            div: item.div,   // Add div for filtering
            st: item.st,     // Add st for filtering
            road: item.road, // Add road for grouping
            loc: roadInfo,
            rawText: `${roadInfo} ${detailTxt} ${headerTitle}`.toLowerCase(), // Add raw text for search
            description: detailTxt, // Pre-calculated description
            isOpen: (type === 'activeLane' && item.isEnhanced && !item.closeInfo) // Flag for styling
        }
    };
};

export const generateProblemReport = (rawData, specialLaneStats = null) => {
    // 1. Filter Data
    const now = new Date();
    const todayStr = getThaiDateStr(now);

    let filtered = rawData.filter(item => item.date === todayStr);
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    const jams = [];
    const accidents = [];
    let activeLanes = [];

    // Lane Logic: Use provided stats OR fallback to basic logic
    if (specialLaneStats && specialLaneStats.allEnhancedLanes) {
        // Use the Enhanced List (Contains both Open and Closed sessions)
        // Filter: Keep if (Opened Today) OR (Closed Today) OR (Still Active)
        activeLanes = specialLaneStats.allEnhancedLanes
            .filter(l => {
                const isOpenToday = l.date === todayStr;
                const isClosedToday = l.closeInfo && l.closeInfo.date === todayStr;
                const isStillActive = l.isStillActive;
                return isOpenToday || isClosedToday || isStillActive;
            })
            .map(l => ({ ...l, isEnhanced: true }));

        // Sort by time descending
        activeLanes.sort((a, b) => b.timestamp - a.timestamp);
    } else {
        // Fallback (Internal Logic - Only Active)
        const laneState = new Map();
        const timeSorted = [...filtered].sort((a, b) => a.timestamp - b.timestamp);

        timeSorted.forEach(row => {
            if (row.category === 'ช่องทางพิเศษ') {
                const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
                laneState.set(locKey, row);
            } else if (row.category === 'ปิดช่องทางพิเศษ') {
                const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
                laneState.delete(locKey);
            }
        });
        activeLanes.push(...Array.from(laneState.values()).sort((a, b) => b.timestamp - a.timestamp));
    }

    filtered.forEach(item => {
        if (item.category === 'จราจรติดขัด') jams.push(item);
        else if (item.category === 'อุบัติเหตุ') accidents.push(item);
    });

    // Build Text
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

    let reportText = `📢 รายงานสรุปสถานการณ์ (จุดที่มีปัญหา)\nประจำวันที่ ${dateStr} เวลา ${timeStr} น.\n`;
    const separator = `\n--------------------------------\n`;

    const allItems = [];
    accidents.forEach(i => allItems.push(formatBlock(i, 'accident').text));
    jams.forEach(i => allItems.push(formatBlock(i, 'jam').text));
    activeLanes.forEach(i => allItems.push(formatBlock(i, 'activeLane').text));

    if (allItems.length > 0) {
        reportText += separator + allItems.join(separator) + separator;
    } else {
        reportText += `\n✅ เหตุการณ์ปกติ ไม่พบจุดจราจรติดขัดหรืออุบัติเหตุในขณะนี้\n`;
    }

    // Summary
    const summaryParts = [];
    if (accidents.length > 0) summaryParts.push(`อุบัติเหตุ: ${accidents.length}`);
    if (jams.length > 0) summaryParts.push(`รถติด: ${jams.length}`);
    if (activeLanes.length > 0) summaryParts.push(`เปิดช่องทางฯ: ${activeLanes.length}`);

    if (summaryParts.length > 0) {
        reportText += `สรุปยอดรวม: ${allItems.length} จุด (${summaryParts.join(', ')})`;
    }

    return {
        text: reportText,
        data: {
            accidents: accidents.map(i => formatBlock(i, 'accident')),
            jams: jams.map(i => formatBlock(i, 'jam')),
            activeLanes: activeLanes.map(i => formatBlock(i, 'activeLane'))
        },
        metadata: {
            congestionCount: jams.length,
            accidentCount: accidents.length,
            activeLaneCount: activeLanes.length,
            totalProblems: allItems.length,
            timestamp: now.getTime()
        }
    };
};
