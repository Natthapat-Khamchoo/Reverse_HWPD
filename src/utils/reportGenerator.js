
import { TRAFFIC_DATA } from '../constants/traffic_nodes';
import { getThaiDateStr } from './helpers';
import { analyzeTrafficText, getTrafficFromCoords } from './trafficUtils';

export const generateTrafficReport = async (rawData, direction) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const todayFilterStr = getThaiDateStr(now);
    const directionText = direction === 'outbound' ? '(ขาออก)' : '(ขาเข้า)';

    let report = `บก.ทล.\nรายงานสภาพการจราจร ${directionText}\nวันที่ ${dateStr} เวลา ${timeStr} น. ดังนี้\n\n`;

    for (const region of TRAFFIC_DATA) {
        let regionHasRoads = false;
        let regionReport = `${region.region}\n`;

        for (const road of region.roads) {
            regionHasRoads = true;
            // Find existing report from officer
            const officerReport = rawData.find(d =>
                d.road === road.id &&
                d.date === todayFilterStr &&
                (d.category === 'จราจรติดขัด' || d.category === 'สภาพจราจร' || d.category === 'ช่องทางพิเศษ' || d.detail.includes('จราจร') || d.detail.includes('รถ'))
            );

            let finalStatus = "";
            let prefixEmoji = "";

            if (officerReport) {
                // Priority 1: Use Officer's Report
                const analysis = analyzeTrafficText(officerReport.detail);
                const laneInfo = officerReport.category.includes('ช่องทางพิเศษ') || officerReport.detail.includes('เปิดช่องทาง') ? ' (เปิดช่องทางพิเศษ)' : '';
                prefixEmoji = analysis.emoji;
                let cleanDetail = officerReport.detail.replace(/^(สภาพจราจร|รายละเอียด)[:\s-]*/g, '');
                finalStatus = `${prefixEmoji} ${cleanDetail}${laneInfo} (จนท.รายงาน)`;
            } else {
                // Priority 2: Use API Data (Longdo / Mock)
                const segmentPromises = road.segments.map(async (seg) => {
                    let start = seg.start;
                    let end = seg.end;
                    if (direction === 'inbound') { start = seg.end; end = seg.start; } // Swap logic for inbound
                    const result = await getTrafficFromCoords(start, end);
                    return { label: seg.label, ...result };
                });

                const results = await Promise.all(segmentPromises);
                const problematic = results.filter(r => r.code >= 2);
                const allGreen = results.every(r => r.code === 1);
                const apiError = results.every(r => r.code === 0);

                if (problematic.length > 0) {
                    prefixEmoji = "🟡";
                    if (problematic.some(r => r.code >= 3)) prefixEmoji = "🔴";
                    finalStatus = problematic.map(p => `${p.label} ${p.status}`).join(', ');
                    finalStatus = `${prefixEmoji} ${finalStatus}`;
                } else if (allGreen) {
                    finalStatus = "✅ สภาพการจราจรคล่องตัวตลอดสาย";
                } else if (apiError) {
                    finalStatus = "⚫ อยู่ระหว่างตรวจสอบข้อมูล";
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
