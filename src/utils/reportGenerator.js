
import { TRAFFIC_DATA } from '../constants/traffic_nodes';
import { getThaiDateStr } from './helpers';
import { analyzeTrafficText, getTrafficFromCoords } from './trafficUtils';

export const generateTrafficReport = async (rawData, direction, apiKey) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const todayFilterStr = getThaiDateStr(now);
    const directionText = direction === 'outbound' ? 'ขาออก (มุ่งหน้าต่างจังหวัด)' : 'ขาเข้า (เข้ากรุงเทพฯ)';
    const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 Hours

    let report = `📢 รายงานสภาพการจราจร ${directionText}\n📅 วันที่ ${dateStr} เวลา ${timeStr} น.\n\n`;
    const reportMetadata = [];

    for (const region of TRAFFIC_DATA) {
        let regionReport = `📍 [${region.region}]\n`;
        let hasContent = false;

        for (const road of region.roads) {
            hasContent = true;

            // 1. Get Latest Officer Report
            const relevantReports = rawData.filter(d =>
                (d.road === road.id || (road.id === '9-E' && d.road === '9')) &&
                d.date === todayFilterStr &&
                (d.dir === '-' || d.dir.includes(direction === 'outbound' ? 'ขาออก' : 'ขาเข้า')) &&
                (d.category === 'จราจรติดขัด' || d.category === 'สภาพจราจร' || d.category === 'ช่องทางพิเศษ' || d.detail.includes('จราจร') || d.detail.includes('รถ'))
            );
            relevantReports.sort((a, b) => b.timestamp - a.timestamp);

            const latestReport = relevantReports[0];
            let useOfficerReport = false;
            let timeLabel = "";

            if (latestReport) {
                const diff = now.getTime() - latestReport.timestamp;
                if (diff < STALE_THRESHOLD_MS) {
                    useOfficerReport = true;
                    timeLabel = ` (${latestReport.time} น.)`;
                }
            }

            let finalStatus = "";
            let prefixEmoji = "";
            let predictedStatus = "";

            if (useOfficerReport) {
                // Officer Report
                const analysis = analyzeTrafficText(latestReport.detail);
                const laneInfo = latestReport.category.includes('ช่องทางพิเศษ') || latestReport.detail.includes('เปิดช่องทาง') ? ' \n🟢 (เปิดช่องทางพิเศษแล้ว)' : '';
                prefixEmoji = analysis.emoji;
                let cleanDetail = latestReport.detail.replace(/^(สภาพจราจร|รายละเอียด)[:\s-]*/g, '');
                finalStatus = `${prefixEmoji} ${cleanDetail}${laneInfo}${timeLabel}`;
                predictedStatus = analysis.status;
            } else {
                // API Report
                const segmentPromises = road.segments.map(async (seg) => {
                    let start = seg.start;
                    let end = seg.end;
                    if (direction === 'inbound') { start = seg.end; end = seg.start; }
                    const result = await getTrafficFromCoords(start, end, road.id, apiKey);
                    return { label: seg.label, ...result };
                });

                const results = await Promise.all(segmentPromises);
                const problematic = results.filter(r => r.code >= 2);
                const allGreen = results.every(r => r.code === 1);
                const apiError = results.every(r => r.code === 0);

                if (problematic.length > 0) {
                    prefixEmoji = "🟡";
                    predictedStatus = "หนาแน่น";
                    if (problematic.some(r => r.code >= 3)) {
                        prefixEmoji = "🔴";
                        predictedStatus = "ติดขัด";
                    }
                    const details = problematic.map(p => `${p.label} ${p.status}`).join(', ');
                    finalStatus = `${prefixEmoji} ${details}`;
                } else if (allGreen) {
                    finalStatus = "✅ คล่องตัวตลอดสาย";
                    predictedStatus = "คล่องตัว";
                } else if (apiError) {
                    if (latestReport) {
                        const analysis = analyzeTrafficText(latestReport.detail);
                        finalStatus = `${analysis.emoji} ${latestReport.detail} (ข้อมูลเดิม ${latestReport.time} น.)`;
                        predictedStatus = analysis.status;
                    } else {
                        // Check if specific error exists in results
                        const firstError = results.find(r => r.code === 0 && r.status.includes('Error'));
                        const errorMsg = firstError ? firstError.status : "อยู่ระหว่างตรวจสอบ";
                        finalStatus = `⚫ ${errorMsg}`;
                        predictedStatus = "ตรวจสอบไม่ได้";
                    }
                } else {
                    finalStatus = "✅ เคลื่อนตัวได้ดี";
                    predictedStatus = "คล่องตัว";
                }
            }

            // New Line Format
            regionReport += `🛣️ ${road.name}:\n   ${finalStatus}\n`;

            reportMetadata.push({
                roadId: road.id,
                roadName: road.name,
                predictedStatus,
                emoji: prefixEmoji,
                region: region.region
            });
        }

        regionReport += `\n`; // Spacing between regions
        if (hasContent) report += regionReport;
    }

    report += `--------------------------------\nสายด่วนตำรวจทางหลวง 1193`;

    return {
        text: report,
        metadata: reportMetadata,
        direction,
        timestamp: now.getTime()
    };
};

export const generateStartupSummary = (rawData) => {
    const now = new Date();
    const todayStr = getThaiDateStr(now);

    // Filter for today's data
    const todayData = rawData.filter(d => d.date === todayStr);

    // 1. Drunk Driving (Enforcement)
    const drunkCount = todayData.filter(d => d.category.includes('เมา') || d.detail.includes('เมา')).length;

    // 2. Accidents
    const accidentCount = todayData.filter(d => d.category.includes('อุบัติเหตุ')).length;

    // 3. Special Lanes (Active)
    // We need to use valid open/close pairs to determine active lanes
    // Simple approach: Count 'Live' or use existing helper if possible, 
    // but here we can just do a quick count of Open vs Close for today or rely on rawData logic
    // Better: Filter 'ช่องทางพิเศษ' and check if there is a later 'ปิดช่องทางพิเศษ'
    // For summary, let's just count "Open" events for today that don't have "Close" yet?
    // Actually, calculateSpecialLaneStats is in dataProcessor.js, we can't easily import it here without circular dependency risks if dataProcessor imports helpers.
    // Let's do a simple count of "Opened" events today for now, or just generic traffic incidents.
    const specialLaneOpenCount = todayData.filter(d => d.category === 'ช่องทางพิเศษ').length;

    // 4. Traffic Jams (Manual Reports)
    const jamCount = todayData.filter(d =>
        (d.category === 'จราจรติดขัด' || d.detail.includes('ติดขัด') || d.detail.includes('หนาแน่น')) &&
        !d.category.includes('ช่องทางพิเศษ') // Exclude special lane openings from jam count
    ).length;

    return `📊 สรุปสถานการณ์ภาพรวม (${todayStr})\n` +
        `🚔 เมาแล้วขับ: ${drunkCount} ราย\n` +
        `💥 อุบัติเหตุ: ${accidentCount} ครั้ง\n` +
        `🚧 ช่องทางพิเศษ (เปิดวันนี้): ${specialLaneOpenCount} จุด\n` +
        `🚗 จราจรติดขัด: ${jamCount} จุด`;
};
