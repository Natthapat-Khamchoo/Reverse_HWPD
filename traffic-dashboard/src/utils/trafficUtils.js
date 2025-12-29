export const fallbackCopyTextToClipboard = (text) => {
  var textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try { document.execCommand('copy'); } catch (err) { console.error('Fallback copy failed', err); }
  document.body.removeChild(textArea);
};

export const copyToClipboard = async (text) => {
  if (!navigator.clipboard) { fallbackCopyTextToClipboard(text); return; }
  try { await navigator.clipboard.writeText(text); } catch (err) { fallbackCopyTextToClipboard(text); }
};

export const analyzeTrafficText = (text) => {
  if (!text) return { emoji: "📝", status: "รายงานทั่วไป" };
  const lowerText = text.toLowerCase();
  if (lowerText.includes("ติดขัด") || lowerText.includes("หยุดนิ่ง") || lowerText.includes("หนาแน่นมาก"))
    return { emoji: "🔴", status: "หนาแน่น/ติดขัด" };
  if (lowerText.includes("ชะลอตัว") || lowerText.includes("หนาแน่น") || lowerText.includes("รถมาก"))
    return { emoji: "🟡", status: "ชะลอตัว/หนาแน่น" };
  if (lowerText.includes("คล่องตัว") || lowerText.includes("รถน้อย") || lowerText.includes("เบาบาง"))
    return { emoji: "✅", status: "คล่องตัว" };
  return { emoji: "📝", status: "รายงานตามข้อความ" };
};

export const getTrafficFromCoords = async (start, end) => {
  const [slat, slon] = start.split(',');
  const [elat, elon] = end.split(',');

  // Use Vercel API route (works in both dev and production)
  const url = `/api/traffic?slat=${slat}&slon=${slon}&elat=${elat}&elon=${elon}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();

    if (json && json.data && json.data.length > 0) {
      const route = json.data[0];
      const distanceKm = route.distance / 1000;
      const timeSec = route.interval;
      const penalty = route.penalty || 0; // Traffic delay penalty (signals, congestion)
      const timeHour = timeSec / 3600;

      if (timeHour <= 0) return { status: "ตรวจสอบไม่ได้", code: 0 };

      // Calculate actual speed
      const speed = distanceKm / timeHour;

      // Calculate delay ratio (penalty as % of total time)
      const delayRatio = penalty / timeSec;

      let result = { code: 0, status: "" };

      // Enhanced Logic:
      // 1. Base on speed (adjusted for urban roads: 40 km/h threshold)
      // 2. Factor in penalty/delay ratio (high penalty = likely traffic)

      // High delay (penalty > 30% of time) OR very slow = Congested
      if (delayRatio > 0.3 || speed < 15) {
        result.status = "ติดขัด";
        result.code = 3;
      }
      // Moderate delay (15-30%) OR moderate speed = Dense
      else if (delayRatio > 0.15 || speed < 40) {
        result.status = "หนาแน่น";
        result.code = 2;
      }
      // Low delay and good speed = Fluid
      else {
        result.status = "คล่องตัว";
        result.code = 1;
      }

      return result;
    }
  } catch (err) {
    console.warn("Traffic API Warning:", err.message);
  }
  return { status: "ตรวจสอบไม่ได้/ปิดถนน", code: 0 };
};