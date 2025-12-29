// Test script to check Longdo API response with traffic mode
const API_KEY = "43c345d5dae4db42926bd41ae0b5b0fa";

// Test coordinates: นวนคร - ประตูน้ำพระอินทร์ (ทล.1)
const slat = "14.1085";
const slon = "100.6175";
const elat = "14.1265";
const elon = "100.6155";

const modes = ['d', 'e', 't']; // d=shortest, e=shortest with traffic, t=fastest

async function testMode(mode) {
    const url = `https://api.longdo.com/RouteService/json/route/guide?flon=${slon}&flat=${slat}&tlon=${elon}&tlat=${elat}&mode=${mode}&key=${API_KEY}`;

    console.log(`\n========== Testing Mode: ${mode} ==========`);
    console.log("URL:", url);

    try {
        const response = await fetch(url, {
            headers: {
                'Referer': 'https://reverse-hwpd.vercel.app'
            }
        });

        if (!response.ok) {
            console.log("❌ HTTP Error:", response.status);
            const text = await response.text();
            console.log("Body:", text);
            return;
        }

        const data = await response.json();
        console.log("✅ Success!");
        console.log("Full Response:", JSON.stringify(data, null, 2));

        if (data.data && data.data[0]) {
            const route = data.data[0];
            console.log("\n--- Route Info ---");
            console.log("Distance (m):", route.distance);
            console.log("Interval (s):", route.interval);
            console.log("Speed (km/h):", ((route.distance / 1000) / (route.interval / 3600)).toFixed(2));

            // Check for traffic-specific fields
            console.log("\n--- Checking Traffic Fields ---");
            console.log("Has 'traffic' field?", 'traffic' in route);
            console.log("Has 'color' field?", 'color' in route);
            console.log("Has 'level' field?", 'level' in route);
            console.log("Has 'speed' field?", 'speed' in route);

            console.log("\n--- All Fields ---");
            console.log(Object.keys(route));
        }
    } catch (error) {
        console.log("❌ Error:", error.message);
    }
}

(async () => {
    for (const mode of modes) {
        await testMode(mode);
    }
})();
