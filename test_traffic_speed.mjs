import https from 'https';

const API_KEY = "43c345d5dae4db42926bd41ae0b5b0fa";

// Test locations (major highways in Thailand)
const testLocations = [
    { name: "ทล.1 นวนคร", lat: 14.1085, lon: 100.6175 },
    { name: "ทล.2 มวกเหล็ก", lat: 14.6400, lon: 101.1950 },
    { name: "ทล.7 บางนา", lat: 13.6650, lon: 100.6250 },
    { name: "ทล.35 พระราม 2", lat: 13.6850, lon: 100.4750 },
    { name: "วงแหวน รามอินทรา", lat: 13.8550, lon: 100.6850 }
];

async function testTrafficSpeed(location) {
    return new Promise((resolve, reject) => {
        const url = `https://api.longdo.com/RouteService/json/traffic/speed?lon=${location.lon}&lat=${location.lat}&key=${API_KEY}`;

        console.log(`\n${"=".repeat(70)}`);
        console.log(`📍 ${location.name}`);
        console.log(`📌 Coordinates: ${location.lat}, ${location.lon}`);
        console.log(`🔗 URL: ${url}`);
        console.log("-".repeat(70));

        const req = https.get(url, {
            headers: {
                'Referer': 'https://reverse-hwpd.vercel.app'
            }
        }, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                console.log(`📊 Status Code: ${res.statusCode}`);

                if (res.statusCode !== 200) {
                    console.log(`❌ Error Response`);
                    console.log(data);
                    resolve({ error: true, status: res.statusCode, body: data });
                    return;
                }

                try {
                    const json = JSON.parse(data);
                    console.log(`✅ Success!`);
                    console.log(`📦 Response:`, JSON.stringify(json, null, 2));

                    // Analyze structure
                    console.log(`\n🔍 Available Fields:`);
                    if (typeof json === 'object' && json !== null) {
                        Object.keys(json).forEach(key => {
                            console.log(`   - ${key}: ${typeof json[key]} = ${JSON.stringify(json[key])}`);
                        });
                    }

                    resolve({ success: true, data: json });
                } catch (e) {
                    console.log(`⚠️ JSON Parse Error`);
                    console.log(`Raw Body:`, data);
                    resolve({ error: true, parseError: e.message, body: data });
                }
            });
        });

        req.on('error', (err) => {
            console.log(`❌ Request Error:`, err.message);
            reject(err);
        });

        req.end();
    });
}

async function runTests() {
    console.log("🚗 Testing Longdo Traffic Speed API");
    console.log("=".repeat(70));

    const results = [];

    for (const location of testLocations) {
        try {
            const result = await testTrafficSpeed(location);
            results.push({ location: location.name, ...result });

            // Wait a bit between requests to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(`Error testing ${location.name}:`, error);
        }
    }

    console.log("\n" + "=".repeat(70));
    console.log("📋 Summary");
    console.log("=".repeat(70));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => r.error);

    console.log(`✅ Successful: ${successful.length}/${results.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);

    if (successful.length > 0) {
        console.log("\n🎯 Successful Responses Structure:");
        successful.forEach(r => {
            console.log(`\n${r.location}:`);
            if (r.data) {
                console.log(JSON.stringify(r.data, null, 2));
            }
        });
    }
}

runTests().catch(console.error);
