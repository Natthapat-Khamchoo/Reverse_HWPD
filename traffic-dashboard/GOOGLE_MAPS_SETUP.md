# Google Maps + Longdo Hybrid Traffic System

ระบบตรวจจับสภาพการจราจรแบบ Hybrid ที่รวมความแม่นยำของ Google Maps กับความมั่นคงของ Longdo Maps

## 🎯 Features

- ✅ ใช้ Google Maps Distance Matrix API สำหรับความแม่นยำสูงสุด
- ✅ Fallback อัตโนมัติไป Longdo Maps เมื่อ Google หมด quota
- ✅ Rush hour detection (7-9am, 5-7pm)
- ✅ Time-based threshold adjustment
- ✅ ฟรี 100% (ภายใน quota limit)

## 📊 Quota Limits

- **Google Maps**: 1,200 requests/day (ตั้งเอง)
- **Longdo Maps**: ไม่จำกัด
- **Usage**: ~300 requests/day (30 roads × 10 reports)

## 🔧 Environment Variables

ต้องตั้งค่าใน Vercel:

```env
GOOGLE_MAPS_API_KEY=your_google_api_key_here
```

## 📋 Setup

ดูคู่มือละเอียดใน [walkthrough.md](file:///.gemini/antigravity/brain/6d448370-9ef7-44c4-90e8-72dbe88bf716/walkthrough.md)

สรุป:
1. สร้าง Google Cloud Project
2. Enable Distance Matrix API
3. สร้าง API Key + ตั้ง restrictions
4. ตั้ง quota limit (1,200/day)
5. เพิ่ม environment variable ใน Vercel
6. Deploy!

## 🧪 Testing

```javascript
// Browser Console
// ถ้าเห็น:
✅ Using Google Maps data: หนาแน่น
// → Google ทำงาน

// ถ้าเห็น:
🔄 Google quota exceeded, using Longdo fallback
🗺️ Using Longdo data: หนาแน่น
// → Fallback ทำงาน
```

## 📁 Files

- `/api/google-traffic.js` - Google Maps API handler
- `/src/utils/trafficUtils.js` - Hybrid logic

## ⚠️ Important Notes

1. **ไม่ต้องเปิด Billing** - ตั้ง quota limit ที่ 1,200 = ฟรี
2. **API Key Restrictions** - ต้องตั้ง HTTP referrers + API restrictions
3. **Fallback อัตโนมัติ** - Google error → Longdo (ไม่มี downtime)

## 📈 Monitoring

- Google Cloud Console → APIs → Distance Matrix API → Metrics
- Vercel Dashboard → Functions → Logs

---

Made with ❤️ for accurate traffic reporting
