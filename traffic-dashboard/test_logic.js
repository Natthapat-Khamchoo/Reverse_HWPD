// Test the new traffic detection logic
const testCases = [
    {
        name: "ทดสอบ 1: ทล.1 (จากข้อมูลจริง)",
        distance: 2417,
        interval: 195,
        penalty: 75,
        expected: "ควรเป็น คล่องตัว (speed 44.62, delay 38%)"
    },
    {
        name: "ทดสอบ 2: มอเตอร์เวย์ ไม่มีการจราจร",
        distance: 10000,
        interval: 360, // 100 km/h
        penalty: 10,
        expected: "ควรเป็น คล่องตัว"
    },
    {
        name: "ทดสอบ 3: ถนนในเมือง ติดปานกลาง",
        distance: 5000,
        interval: 600, // 30 km/h
        penalty: 120,
        expected: "ควรเป็น หนาแน่น"
    },
    {
        name: "ทดสอบ 4: ถนนติดมาก",
        distance: 3000,
        interval: 900, // 12 km/h
        penalty: 400,
        expected: "ควรเป็น ติดขัด"
    }
];

function analyzeTraffic(distance, interval, penalty = 0) {
    const distanceKm = distance / 1000;
    const timeHour = interval / 3600;
    const speed = distanceKm / timeHour;
    const delayRatio = penalty / interval;

    let status = "";
    let code = 0;

    if (delayRatio > 0.3 || speed < 15) {
        status = "ติดขัด";
        code = 3;
    }
    else if (delayRatio > 0.15 || speed < 40) {
        status = "หนาแน่น";
        code = 2;
    }
    else {
        status = "คล่องตัว";
        code = 1;
    }

    return { status, code, speed: speed.toFixed(2), delayRatio: (delayRatio * 100).toFixed(1) };
}

console.log("🚗 ทดสอบ Logic การตรวจจับสภาพจราจร\n");
console.log("=".repeat(70));

testCases.forEach((test, i) => {
    console.log(`\n${test.name}`);
    console.log("-".repeat(70));

    const result = analyzeTraffic(test.distance, test.interval, test.penalty);

    console.log(`📊 ข้อมูล Input:`);
    console.log(`   - ระยะทาง: ${test.distance} m`);
    console.log(`   - เวลา: ${test.interval} s`);
    console.log(`   - Penalty: ${test.penalty} s`);

    console.log(`\n📈 การคำนวณ:`);
    console.log(`   - ความเร็ว: ${result.speed} km/h`);
    console.log(`   - Delay Ratio: ${result.delayRatio}%`);

    console.log(`\n✅ ผลลัพธ์: ${result.status} (code: ${result.code})`);
    console.log(`💭 ${test.expected}`);
});

console.log("\n" + "=".repeat(70));
