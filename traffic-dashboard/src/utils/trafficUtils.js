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

// Road Type Classification Helper
function getRoadType(roadId) {
  if (['7', '9'].includes(roadId)) return 'motorway';
  if (['1', '2', '3', '4', '11', '21', '32'].includes(roadId)) return 'highway';
  return 'urban';
}

// Get Road-Specific Thresholds (COMPREHENSIVE)
function getThresholds(roadId, isRushHour, isWeekend) {
  const roadType = getRoadType(roadId);

  // Base thresholds (VERY RELAXED)
  let baseThresholds = {
    motorway: {
      fluidSpeed: 50, denseSpeed: 30, congestedSpeed: 18,
      denseDelay: 0.40, congestedDelay: 0.65
    },
    highway: {
      fluidSpeed: 35, denseSpeed: 20, congestedSpeed: 10,
      denseDelay: 0.45, congestedDelay: 0.70
    },
    urban: {
      fluidSpeed: 25, denseSpeed: 15, congestedSpeed: 6,
      denseDelay: 0.50, congestedDelay: 0.75
    }
  };

  let thresholds = baseThresholds[roadType];
  const now = new Date();
  const currentHour = now.getHours();
  const isLateNightEarlyMorning = currentHour >= 20 || currentHour < 6;

  // PRIORITY 1: Late night/Early morning (20:00-06:00)
  if (isLateNightEarlyMorning) {
    thresholds = {
      ...thresholds,
      denseSpeed: thresholds.denseSpeed * 0.70,
      congestedSpeed: thresholds.congestedSpeed * 0.60,
      denseDelay: thresholds.denseDelay * 1.50,
      congestedDelay: thresholds.congestedDelay * 1.50
    };
  }
  // Rush hour
  else if (isRushHour && !isWeekend) {
    thresholds = {
      ...thresholds,
      denseSpeed: thresholds.denseSpeed * 0.95,
      congestedSpeed: thresholds.congestedSpeed * 0.90,
      denseDelay: thresholds.denseDelay * 0.95,
      congestedDelay: thresholds.congestedDelay * 0.95
    };
  }
  // Weekend
  else if (isWeekend) {
    thresholds = {
      ...thresholds,
      denseSpeed: thresholds.denseSpeed * 1.25,
      congestedSpeed: thresholds.congestedSpeed * 1.30,
      denseDelay: thresholds.denseDelay * 1.25,
      congestedDelay: thresholds.congestedDelay * 1.25
    };
  }

  // PRIORITY 2: Special case for problematic roads (ทล.1,2,4,7)
  if (['1', '2', '4', '7'].includes(roadId)) {
    thresholds = {
      ...thresholds,
      denseSpeed: thresholds.denseSpeed * 0.85,
      congestedSpeed: thresholds.congestedSpeed * 0.80,
      denseDelay: thresholds.denseDelay * 1.20,
      congestedDelay: thresholds.congestedDelay * 1.20
    };
  }

  return thresholds;
}

// Main Traffic Analysis Function
export const getTrafficFromCoords = async (start, end, roadId = null) => {
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

      const now = new Date();
      const currentHour = now.getHours();
      const currentDay = now.getDay();
      const isRushHour = (currentHour >= 7 && currentHour < 9) || (currentHour >= 17 && currentHour < 19);
      const isWeekend = currentDay === 0 || currentDay === 6;

      const thresholds = getThresholds(roadId, isRushHour, isWeekend);
      let result = { code: 0, status: "", source: "longdo" };

      if (delayRatio > thresholds.congestedDelay || speed < thresholds.congestedSpeed) {
        result.status = "ติดขัด";
        result.code = 3;
      }
      else if (delayRatio > thresholds.denseDelay || speed < thresholds.denseSpeed) {
        result.status = "หนาแน่น";
        result.code = 2;
      }
      else {
        result.status = "คล่องตัว";
        result.code = 1;
      }

      const roadType = roadId ? getRoadType(roadId) : 'unknown';
      const context = isWeekend ? '(Weekend)' : isRushHour ? '(Rush Hour)' : currentHour >= 20 || currentHour < 6 ? '(Late Night)' : '(Normal)';

      console.log(`🗺️ ${result.status} | Type: ${roadType} | Speed: ${speed.toFixed(1)} km/h | Delay: ${(delayRatio * 100).toFixed(1)}% ${context}`);

      return result;
    }
  } catch (err) {
    console.warn("Traffic API Warning:", err.message);
  }

  return { status: "ตรวจสอบไม่ได้/ปิดถนน", code: 0, source: "error" };
};