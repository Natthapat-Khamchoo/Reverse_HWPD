// URL Google Sheets (CSV)
export const SHEET_TRAFFIC_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=617598886&single=true&output=csv"; 
export const SHEET_ENFORCE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=953397811&single=true&output=csv"; 
export const SHEET_SAFETY_URL  = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRwdOo14pW38cMImXNdEHIH7OTshrYf_6dGpEENgnYTa1kInJgosqeFGcpMpiOrq4Jw0nTJUn-02ogh/pub?gid=622673756&single=true&output=csv"; 

// สีประจำกองกำกับการ
export const DIVISION_COLORS = { 
  "1": "#EF4444", "2": "#3B82F6", "3": "#10B981", "4": "#FBBF24", 
  "5": "#A78BFA", "6": "#EC4899", "7": "#22D3EE", "8": "#6366F1" 
};

// โครงสร้างองค์กร (จำนวนสถานีในแต่ละ กก.)
export const ORG_STRUCTURE = { 
  "1": 6, "2": 6, "3": 5, "4": 5, 
  "5": 6, "6": 6, "7": 5, "8": 4 
};

// รายชื่อประเภทเหตุการณ์ (สำหรับ Dropdown ถ้ามีการเรียกใช้)
export const EVENT_CATEGORIES = [
  'อุบัติเหตุ', 'จับกุม', 'ว.43', 'ช่องทางพิเศษ', 
  'จราจรติดขัด', 'ปิดช่องทางพิเศษ', 'จราจรปกติ'
];

// สีประจำประเภทเหตุการณ์
export const CATEGORY_COLORS = {
  'อุบัติเหตุ': '#EF4444',     // สีแดง
  'จับกุม': '#A855F7',         // สีม่วง
  'เมาแล้วขับ': '#D946EF',     // สีชมพู
  'ว.43': '#3B82F6',          // สีน้ำเงิน
  'ช่องทางพิเศษ': '#22C55E',    // สีเขียว
  'ปิดช่องทางพิเศษ': '#64748B', // สีเทา
  'จราจรติดขัด': '#EAB308',     // สีเหลือง
  'จราจรปกติ': '#94A3B8',       // สีเทาอ่อน
  'ทั่วไป': '#64748B'           // สีเทา
};