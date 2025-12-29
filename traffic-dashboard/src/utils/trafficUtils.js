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

// Helper: Try Google Maps API first
async function tryGoogleTraffic(start, end) {
  try {
    const res = await fetch(`/api/google-traffic?start=${start}&end=${end}`);

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      // Quota exceeded - expected fallback scenario
      if (res.status === 429 || errorData.error === 'OVER_QUERY_LIMIT') {
        console.log('🔄 Google quota exceeded, using Longdo fallback');
        return null;
      }

      // Other errors - log and fallback
      console.warn('⚠️ Google API error:', errorData.error || res.status);
      return null;
    }

    const data = await res.json();
    console.log(`✅ Using Google Maps data: ${data.status}`);
    return data;
  } catch (error) {
    console.warn('⚠️ Google API request failed:', error.message);
    return null;
  }
}

// Helper: Longdo traffic analysis (existing logic)
async function getLongdoTraffic(start, end) {
  const [slat, slon] = start.split(',');
  const [elat, elon] = end.split(',');

  const url = `/api/traffic?slat=${slat}&slon=${slon}&elat=${elat}&elon=${elon}`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const json = await res.json();

    if (json && json.data && json.data.length > 0) {
      const route = json.data[0];
      const distanceKm = route.distance / 1000;
      const timeSec = route.interval;
      const penalty = route.penalty || 0;
      const timeHour = timeSec / 3600;

      if (timeHour <= 0) return { status: "ตรวจสอบไม่ได้", code: 0 };

      const speed = distanceKm / timeHour;
      const delayRatio = penalty / timeSec;

      // Time-based sensitivity (Rush Hour Detection)
      const now = new Date();
      const currentHour = now.getHours();
      const isRushHour = (currentHour >= 7 && currentHour < 9) || (currentHour >= 17 && currentHour < 19);

      const congestedDelayThreshold = isRushHour ? 0.30 : 0.35;
      const denseDelayThreshold = isRushHour ? 0.18 : 0.20;
      const congestedSpeedThreshold = isRushHour ? 12 : 15;
      const denseSpeedThreshold = isRushHour ? 35 : 40;

      let result = { code: 0, status: "", source: "longdo" };

      if (delayRatio > congestedDelayThreshold || speed < congestedSpeedThreshold) {
        result.status = "ติดขัด";
        result.code = 3;
      }
      else if (delayRatio > denseDelayThreshold || speed < denseSpeedThreshold) {
        result.status = "หนาแน่น";
        result.code = 2;
      }
      else {
        result.status = "คล่องตัว";
        result.code = 1;
      }

      console.log(`🗺️ Using Longdo data: ${result.status} (speed: ${speed.toFixed(1)} km/h, delay: ${(delayRatio * 100).toFixed(1)}%)`);
      return result;
    }
  } catch (err) {
    console.warn("Longdo API Warning:", err.message);
  }

  return { status: "ตรวจสอบไม่ได้/ปิดถนน", code: 0, source: "error" };
}

// Main function: Hybrid approach (Google → Longdo fallback)
export const getTrafficFromCoords = async (start, end) => {
  // 1. Try Google Maps first (most accurate)
  const googleResult = await tryGoogleTraffic(start, end);
  if (googleResult) {
    return googleResult;
  }

  // 2. Fallback to Longdo (free, always available)
  return await getLongdoTraffic(start, end);
};