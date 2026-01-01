
import { TRAFFIC_DATA } from '../constants/traffic_nodes';
import { getThaiDateStr } from './helpers';
import { analyzeTrafficText, getTrafficFromCoords } from './trafficUtils';

export const generateTrafficReport = async (rawData, direction) => {
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
                d.road === road.id &&
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
                    const result = await getTrafficFromCoords(start, end, road.id);
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
                        finalStatus = "⚫ อยู่ระหว่างตรวจสอบ";
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
