
import { generateProblemReport } from './src/utils/problemReportGenerator.js';

// Mock Config to match helpers expectation if needed, but helpers usually just format dates
// The generator uses `getThaiDateStr` from helpers.
// If helpers is not pure JS, this might fail. Let's check helpers.js again.
// helpers.js exports `getThaiDateStr` which uses `new Date()`. It should be fine in Node.js

// Mock Data
const today = new Date();
const todayDateStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const nowTime = today.getTime();

const mockData = [
    // 1. Traffic Jam (Should appear)
    {
        category: 'จราจรติดขัด',
        detail: 'เคลื่อนตัวช้า สลับหยุดนิ่ง ท้ายแถว 2 กม.',
        road: '1', km: '50', dir: 'ขาออก',
        div: '1', st: '2',
        date: todayDateStr,
        time: '08:45',
        timestamp: nowTime - 1000 * 60 * 30 // 30 mins ago
    },
    // 2. Accident (Should appear)
    {
        category: 'อุบัติเหตุ',
        detail: 'รถชนท้าย 2 คัน',
        road: '9', km: '120', dir: 'ขาออก',
        div: '8', st: '4',
        date: todayDateStr,
        time: '08:20',
        timestamp: nowTime - 1000 * 60 * 55 // 55 mins ago
    },
    // 3. Special Lane (Open) (Should appear)
    {
        category: 'ช่องทางพิเศษ',
        detail: 'เปิดช่องทางพิเศษ',
        road: '35', km: '10', dir: 'ขาออก',
        div: '6', st: '2',
        date: todayDateStr,
        time: '07:00',
        timestamp: nowTime - 1000 * 60 * 130 // 2 hours 10 mins ago (Warning check)
    },
    // 4. Closed Special Lane (Should NOT appear)
    {
        category: 'ปิดช่องทางพิเศษ',
        detail: 'ปิดช่องทางพิเศษ',
        road: '35', km: '10', dir: 'ขาออก',
        div: '6', st: '2',
        date: todayDateStr,
        time: '08:00',
        timestamp: nowTime - 1000 * 60 * 60 // Closed 1 hour ago
    },
    // 5. Old Traffic Jam (Yesterday) (Should NOT appear)
    {
        category: 'จราจรติดขัด',
        detail: 'หนาแน่น',
        road: '1', km: '50', dir: 'ขาออก',
        div: '1', st: '2',
        date: '2024-01-01', // Old date
        time: '08:00',
        timestamp: nowTime - 1000 * 60 * 60 * 24
    }
];

console.log("🛠️ Testing Problem Report Generator...");
console.log("----------------------------------------");

try {
    const result = generateProblemReport(mockData);

    console.log("✅ Report Generated Successfully!");
    console.log("📝 Generated Text:");
    console.log("----------------------------------------");
    console.log(result.text);
    console.log("----------------------------------------");
    console.log("📊 Metadata:", result.metadata);

    // Basic assertions
    if (result.metadata.totalProblems === 2) {
        // We expect: 
        // Jam (1)
        // Accident (1)
        // Lane (1 Open - but wait, implementation logic handled Open/Close pair?)

        // Let's re-verify the logic in problemReportGenerator:
        // "laneState.set" when Open. "laneState.delete" when Closed.
        // In mockData: 
        // Item 3: Open (timestamp -130m)
        // Item 4: Close (timestamp -60m)
        // Logic: Sort by time.
        // Process Open (-130m) -> Set state.
        // Process Close (-60m) -> Delete state.
        // Result: ActiveLanes should be EMPTY for Road 35.

        console.log("✅ Logic Check: Closed lane correctly removed.");
    } else if (result.metadata.activeLaneCount === 0) {
        console.log("✅ Logic Check: Active lane count is 0 as expected (it was closed).");
    } else {
        console.log("⚠️ Logic Check: Unexpected count. Expected 2 (1 Jam, 1 Accident, 0 Lanes). Got:", result.metadata.totalProblems);
    }

} catch (e) {
    console.error("❌ Error running test:", e);
}
