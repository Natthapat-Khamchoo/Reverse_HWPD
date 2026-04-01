export default async function handler(req, res) {
  const { slat, slon, elat, elon } = req.query;
  const apiKey = process.env.VITE_LONGDO_API_KEY;

  if (!slat || !slon || !elat || !elon) {
    return res.status(400).json({ error: 'Missing coordinates' });
  }

  // Input Validation (OWASP: Prevent Injection / Invalid requests)
  const isValidCoord = (c) => !isNaN(parseFloat(c)) && isFinite(c);
  if (!isValidCoord(slat) || !isValidCoord(slon) || !isValidCoord(elat) || !isValidCoord(elon)) {
    return res.status(400).json({ error: 'Invalid coordinate format' });
  }

  const url = `https://api.longdo.com/RouteService/json/route/guide?flon=${slon}&flat=${slat}&tlon=${elon}&tlat=${elat}&mode=d&key=${apiKey}`;

  try {
    // 🔥 แก้ไขจุดนี้: เพิ่ม options { headers: ... } เข้าไป
    const response = await fetch(url, {
      headers: {
        // ใส่ชื่อเว็บของคุณตรงนี้ (ต้องตรงกับที่ลงทะเบียนใน Longdo)
        'Referer': 'https://reverse-hwpd.vercel.app' 
      }
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Longdo Error:", errorText);
        return res.status(response.status).json({ error: "Longdo API Error", details: errorText });
    }

    const data = await response.json();
    res.status(200).json(data);
    
  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}