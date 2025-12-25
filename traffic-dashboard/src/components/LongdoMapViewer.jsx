import React, { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS, DIVISION_COLORS } from '../constants/config';

const LongdoMapViewer = ({ data, apiKey }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // ฟังก์ชันสำหรับเริ่มสร้างแผนที่
    const initMap = () => {
      // ถ้าไม่มี window.longdo แสดงว่า Script ยังไม่มา -> ให้จบฟังก์ชันไปก่อน
      if (!window.longdo) return;
      // ถ้ามีแผนที่อยู่แล้ว ไม่ต้องสร้างซ้ำ
      if (mapInstance.current) return;

      const longdo = window.longdo;
      
      try {
        mapInstance.current = new longdo.Map({
          placeholder: mapRef.current,
          zoom: 10,
          lastView: false,
          location: { lon: 100.6, lat: 13.8 },
          language: 'th'
        });

        // เปิด Traffic Layer
        mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
        
        // ทำให้แผนที่มืดลงนิดหน่อย (Dark Dim) เพื่อให้เข้ากับ Dashboard
        mapInstance.current.Layers.add(longdo.Layers.GRAY);

        // ตั้งค่า Event เมื่อแผนที่พร้อม
        mapInstance.current.Event.bind('ready', function() {
           setIsLoaded(true); // บอก State ว่าโหลดเสร็จแล้ว
           updateMarkers();   // วาดหมุดทันที
        });

      } catch (error) {
        console.error("Error initializing Longdo Map:", error);
      }
    };

    // --- LOGIC การโหลด SCRIPT ---
    const existingScript = document.getElementById('longdo-map-script');

    if (!existingScript) {
      // กรณี 1: ยังไม่มี Script ในหน้าเว็บ -> สร้างใหม่
      const script = document.createElement('script');
      script.src = `https://api.longdo.com/map/?key=${apiKey}`;
      script.id = 'longdo-map-script';
      document.body.appendChild(script);
      
      script.onload = () => {
        // เมื่อโหลดเสร็จ ให้รออีกนิดนึงเพื่อให้ object longdo พร้อมใช้งานชัวร์ๆ
        setTimeout(initMap, 500); 
      };
    } else {
      // กรณี 2: มี Script อยู่แล้ว (เช่น เปลี่ยนหน้าไปมา) -> เช็คว่า longdo พร้อมไหม
      if (window.longdo) {
        initMap();
      } else {
        // ถ้ามี Tag Script แต่ window.longdo ยังไม่มา -> ให้วนเช็คทุก 100ms
        const checkInterval = setInterval(() => {
          if (window.longdo) {
            clearInterval(checkInterval);
            initMap();
          }
        }, 100);
      }
    }

    // Cleanup function
    return () => {
       // ไม่ต้อง destroy map เพราะ Longdo จัดการตัวเองได้ค่อนข้างดี 
       // หรือถ้าจะ clear: mapInstance.current = null;
    };
  }, [apiKey]);

  // ฟังก์ชันวาดหมุด (แยกออกมาเพื่อให้เรียกใช้ได้เมื่อ data เปลี่ยน)
  const updateMarkers = () => {
    if (!mapInstance.current || !window.longdo) return;
    const longdo = window.longdo;
    
    try {
      mapInstance.current.Overlays.clear(); // ลบหมุดเก่า

      data.forEach(item => {
        if (item.lat && item.lng) {
          // กำหนดสีหมุด
          const color = item.category.includes('อุบัติเหตุ') 
                        ? '#FF0000' 
                        : (CATEGORY_COLORS[item.category] || '#94a3b8');

          // HTML Marker Style
          const markerHtml = `
            <div style="
              width: 14px; height: 14px; 
              background-color: ${color}; 
              border: 2px solid white; 
              border-radius: 50%; 
              box-shadow: 0 0 5px rgba(0,0,0,0.8);
              cursor: pointer;
            "></div>
          `;

          const marker = new longdo.Marker(
            { lon: item.lng, lat: item.lat },
            {
              title: item.category,
              icon: { html: markerHtml, offset: { x: 7, y: 7 } },
              detail: `
                <div style="color: #000; font-family: 'Sarabun', sans-serif; min-width: 220px;">
                  <div style="font-weight: bold; color: ${DIVISION_COLORS[item.div] || '#333'}; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 5px;">
                    กก.${item.div} ส.ทล.${item.st} (${item.time} น.)
                  </div>
                  <div style="font-size: 14px; font-weight: bold; color: #333; margin-bottom: 2px;">${item.category}</div>
                  <div style="font-size: 13px; color: #555; margin-bottom: 5px; line-height: 1.4;">${item.detail}</div>
                  <div style="font-size: 11px; color: #888; background: #f5f5f5; padding: 2px 5px; border-radius: 4px; display: inline-block;">
                    📍 ทล.${item.road} กม.${item.km} (${item.dir})
                  </div>
                </div>
              `
            }
          );
          mapInstance.current.Overlays.add(marker);
        }
      });
    } catch (e) {
      console.error("Error updating markers:", e);
    }
  };

  // เมื่อ Data เปลี่ยน ให้วาดหมุดใหม่
  useEffect(() => {
    if(isLoaded) {
      updateMarkers();
    }
  }, [data, isLoaded]);

  return (
    <div className="w-full h-full relative bg-slate-900">
      {/* Loading Indicator (แสดงตอนแผนที่ยังไม่มา) */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs z-10 bg-slate-800/50">
          กำลังโหลดแผนที่ Longdo...
        </div>
      )}
      <div id="longdo-map" ref={mapRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LongdoMapViewer;