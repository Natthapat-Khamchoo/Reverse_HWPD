// /api/traffic.js
export default async function handler(req, res) {
  // 1. รับค่าพิกัดที่ส่งมาจากหน้าบ้าน
  const { slat, slon, elat, elon } = req.query;
  const apiKey = "43c345d5dae4db42926bd41ae0b5b0fa"; // API Key ของคุณ

  if (!slat || !slon || !elat || !elon) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  // 2. URL ของ Longdo (ยิงจาก Server Vercel โดยตรง)
  const url = `https://api.longdo.com/RouteService/json/route/guide?flon=${slon}&flat=${slat}&tlon=${elon}&tlat=${elat}&mode=d&key=${apiKey}`;

  try {
    // 3. ยิงไปขอข้อมูล
    const response = await fetch(url);
    const data = await response.json();

    // 4. ส่งข้อมูลกลับไปให้หน้าบ้าน
    res.status(200).json(data);
  } catch (error) {
    console.error("Longdo API Error:", error);
    res.status(500).json({ error: 'Failed to fetch traffic data' });
  }
}