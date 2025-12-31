
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

    // 2.1 Calculate Active Lanes
    const laneState = new Map();
    // Use filtered data (or rawData if we want global state, but report usually focuses on filtered context)
    // To be safe for state calculation, we should essentially use ALL data for state, but filter output by validity.
    // However, for simplified "Problem Report" based on current view/filter, using filtered rawData is acceptable.
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

    // 2.2 Filter Jams & Accidents
    filtered.forEach(item => {
        if (item.category === 'จราจรติดขัด') {
            jams.push(item);
        } else if (item.category === 'อุบัติเหตุ') {
            accidents.push(item);
        }
    });

    // 3. Helper to format a single line (New Structured Style)
    const formatBlock = (item, type) => {
        /*
            🔴 [จราจรติดขัด]
            📍 จุดเกิดเหตุ: ทล.1 กม.50 (ขาออก)
            ⚠️ รายละเอียด: รถมากเคลื่อนตัวได้ช้า
            🕒 12:00 น. | 👮 กก.1 ส.ทล.2
        */

        let headerEmoji = '🔴';
        let headerTitle = 'จราจรติดขัด';

        if (item.category === 'อุบัติเหตุ') {
            headerEmoji = '🚗';
            headerTitle = 'อุบัติเหตุ';
        } else if (item.category === 'ช่องทางพิเศษ') {
            headerEmoji = '🟢';
            headerTitle = 'ช่องทางพิเศษ';
        } else if (item.category === 'จราจรติดขัด') {
            const txt = item.detail || '';
            if (txt.includes('เคลื่อนตัวช้า') || txt.includes('ปานกลาง')) {
                headerEmoji = '🟡';
                headerTitle = 'รถมาก/ชะลอตัว';
            }
        }

        const roadInfo = `ทล.${item.road} กม.${item.km}`;
        const dirInfo = item.dir !== '-' ? `(${item.dir})` : '';
        const detailTxt = item.detail || '-';
        const orgInfo = `กก.${item.div} ส.ทล.${item.st}`;
        const timeInfo = `${item.time} น.`;

        let block = `${headerEmoji} [${headerTitle}]
📍 จุดเกิดเหตุ: ${roadInfo} ${dirInfo}
📝 รายละเอียด: ${detailTxt}
🕒 เวลา: ${timeInfo} | 👮 หน่วย: ${orgInfo}`;

        // Warning for long active lanes
        if (type === 'lane') {
            const isOpenLong = item.timestamp < twoHoursAgo;
            if (isOpenLong) {
                block += `\n⚠️ (เปิดนานกว่า 2 ชม.)`;
            }
        }

        return block;
    };

    // 4. Build Text
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    let reportText = `📢 รายงานสรุปสถานการณ์ (จุดที่มีปัญหา)\nประจำวันที่ ${dateStr} เวลา ${timeStr} น.\n`;
    const separator = `\n--------------------------------\n`;

    const allItems = [];
    // Prioritize: Accidents -> Jams -> Lanes
    accidents.forEach(i => allItems.push(formatBlock(i, 'accident')));
    jams.forEach(i => allItems.push(formatBlock(i, 'jam')));
    activeLanes.forEach(i => allItems.push(formatBlock(i, 'lane')));

    if (allItems.length > 0) {
        reportText += separator;
        reportText += allItems.join(separator);
        reportText += separator;
    } else {
        reportText += `\n✅ เหตุการณ์ปกติ ไม่พบจุดจราจรติดขัดหรืออุบัติเหตุในขณะนี้\n`;
    }

    // Summary Footer
    const summaryParts = [];
    if (accidents.length > 0) summaryParts.push(`อุบัติเหตุ: ${accidents.length}`);
    if (jams.length > 0) summaryParts.push(`รถติด: ${jams.length}`);
    if (activeLanes.length > 0) summaryParts.push(`เปิดช่องทางฯ: ${activeLanes.length}`);

    if (summaryParts.length > 0) {
        reportText += `สรุปยอดรวม: ${allItems.length} จุด (${summaryParts.join(', ')})`;
    }

    return {
        text: reportText,
        metadata: {
            congestionCount: jams.length,
            accidentCount: accidents.length,
            activeLaneCount: activeLanes.length,
            totalProblems: allItems.length,
            timestamp: now.getTime()
        }
    };
};
