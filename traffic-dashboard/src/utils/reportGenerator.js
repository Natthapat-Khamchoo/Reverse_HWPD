
import { TRAFFIC_DATA } from '../constants/traffic_nodes';
import { getThaiDateStr } from './helpers';
import { analyzeTrafficText, getTrafficFromCoords } from './trafficUtils';

export const generateTrafficReport = async (rawData, direction) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const todayFilterStr = getThaiDateStr(now);
    const directionText = direction === 'outbound' ? '(ขาออก)' : '(ขาเข้า)';
    const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 Hours

    let report = `บก.ทล.\nรายงานสภาพการจราจร ${directionText}\nวันที่ ${dateStr} เวลา ${timeStr} น. ดังนี้\n\n`;

    for (const region of TRAFFIC_DATA) {
        let regionHasRoads = false;
        let regionReport = `${region.region}\n`;

        for (const road of region.roads) {
            regionHasRoads = true;

            // 1. Get Latest Officer Report
            const relevantReports = rawData.filter(d =>
                d.road === road.id &&
                d.date === todayFilterStr &&
                (d.category === 'จราจรติดขัด' || d.category === 'สภาพจราจร' || d.category === 'ช่องทางพิเศษ' || d.detail.includes('จราจร') || d.detail.includes('รถ'))
            );
            // Sort Descending (Newest first)
            relevantReports.sort((a, b) => b.timestamp - a.timestamp);

            const latestReport = relevantReports[0];
            let useOfficerReport = false;
            let timeLabel = "";

            // 2. Stale Check
            if (latestReport) {
                const diff = now.getTime() - latestReport.timestamp;
                if (diff < STALE_THRESHOLD_MS) {
                    useOfficerReport = true;
                    timeLabel = ` (${latestReport.time} น.)`;
                }
            }

            let finalStatus = "";
            let prefixEmoji = "";

            if (useOfficerReport) {
                // Use Manual Report
                const analysis = analyzeTrafficText(latestReport.detail);
                const laneInfo = latestReport.category.includes('ช่องทางพิเศษ') || latestReport.detail.includes('เปิดช่องทาง') ? ' (เปิดช่องทางพิเศษ)' : '';
                prefixEmoji = analysis.emoji;
                let cleanDetail = latestReport.detail.replace(/^(สภาพจราจร|รายละเอียด)[:\s-]*/g, '');
                finalStatus = `${prefixEmoji} ${cleanDetail}${laneInfo}${timeLabel} (จนท.รายงาน)`;
            } else {
                // Use API (Real-time)
                const segmentPromises = road.segments.map(async (seg) => {
                    let start = seg.start;
                    let end = seg.end;
                    if (direction === 'inbound') { start = seg.end; end = seg.start; }
                    const result = await getTrafficFromCoords(start, end, road.id); // Pass road ID
                    return { label: seg.label, ...result };
                });

                const results = await Promise.all(segmentPromises);
                const problematic = results.filter(r => r.code >= 2);
                const allGreen = results.every(r => r.code === 1);
                const apiError = results.every(r => r.code === 0);

                if (problematic.length > 0) {
                    // Logic: Yellow if any code 2, Red if any code 3
                    prefixEmoji = "🟡";
                    if (problematic.some(r => r.code >= 3)) prefixEmoji = "🔴";

                    finalStatus = problematic.map(p => `${p.label} ${p.status}`).join(', ');
                    finalStatus = `${prefixEmoji} ${finalStatus}`;
                } else if (allGreen) {
                    finalStatus = "✅ สภาพการจราจรคล่องตัวตลอดสาย";
                } else if (apiError) {
                    // If API completely fails, fallback to stale report if exists
                    if (latestReport) {
                        const analysis = analyzeTrafficText(latestReport.detail);
                        finalStatus = `${analysis.emoji} ${latestReport.detail} (ข้อมูลเดิม ${latestReport.time} น.)`;
                    } else {
                        finalStatus = "⚫ อยู่ระหว่างตรวจสอบข้อมูล";
                    }
                } else {
                    finalStatus = "✅ สภาพการจราจรเคลื่อนตัวได้ดี";
                }
            }
            regionReport += `- ${road.name} : ${finalStatus}\n`;
        }
        if (regionHasRoads) report += regionReport;
    }
    return report;
};
