
const https = require('https');

const API_KEY = "43c345d5dae4db42926bd41ae0b5b0fa";
const url = `https://api.longdo.com/RouteService/json/route/guide?flon=100.6175&flat=14.1085&tlon=100.6155&tlat=14.1265&mode=d&key=${API_KEY}`;

console.log("Testing URL:", url);

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log("Status Code:", res.statusCode);
        try {
            const json = JSON.parse(data);
            console.log("Response Data:", JSON.stringify(json, null, 2));
        } catch (e) {
            console.log("Raw Body:", data);
        }
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});
