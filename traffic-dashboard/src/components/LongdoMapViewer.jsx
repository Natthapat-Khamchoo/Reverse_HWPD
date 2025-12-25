import React, { useEffect, useRef } from 'react';
import { CATEGORY_COLORS, DIVISION_COLORS } from '../constants/config';

const LongdoMapViewer = ({ data, apiKey }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const existingScript = document.getElementById('longdo-map-script');

  useEffect(() => {
    // 1. ฟังก์ชันเริ่มสร้างแผนที่
    const initMap = () => {
      if (!window.longdo || mapInstance.current) return;

      const longdo = window.longdo;
      mapInstance.current = new longdo.Map({
        placeholder: mapRef.current,
        zoom: 10,
        lastView: false,
        location: { lon: 100.6, lat: 13.8 } // พิกัดกลางๆ (กทม/ปริมณฑล) หรือเปลี่ยนได้
      });

      // 2. พระเอกของเรา: เปิด Traffic Layer (เส้นสีจราจร)
      mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
      
      // ปรับโทนสีให้มืดลงนิดหน่อยเพื่อให้เข้ากับ Dashboard (Optional)
      mapInstance.current.Layers.add(longdo.Layers.GRAY); 
    };

    // 3. โหลด Script Longdo API
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://api.longdo.com/map/?key=${apiKey}`;
      script.id = 'longdo-map-script';
      document.body.appendChild(script);
      script.onload = () => {
        initMap();
        // Force update markers after map load
        if(data && data.length > 0) updateMarkers(); 
      };
    } else {
      // ถ้ามี script อยู่แล้ว ให้รอจังหวะแล้ว init เลย
      setTimeout(initMap, 500); 
    }

    return () => {
        // Cleanup ถ้าจำเป็น
    };
  }, [apiKey]);

  // 4. ฟังก์ชันอัปเดตหมุด (Markers)
  const updateMarkers = () => {
    if (!mapInstance.current || !window.longdo) return;
    const longdo = window.longdo;
    
    // ลบหมุดเก่าออกก่อน
    mapInstance.current.Overlays.clear();

    data.forEach(item => {
      if (item.lat && item.lng) {
        // กำหนดสีหมุด
        const color = item.category.includes('อุบัติเหตุ') 
                      ? '#FF0000' 
                      : (CATEGORY_COLORS[item.category] || '#94a3b8');

        // สร้าง HTML Marker (จุดวงกลม)
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
              <div style="color: #000; font-family: sans-serif; min-width: 200px;">
                <div style="font-weight: bold; color: ${DIVISION_COLORS[item.div] || '#333'}; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 5px;">
                  กก.${item.div} ส.ทล.${item.st} (${item.time} น.)
                </div>
                <div style="font-size: 14px; font-weight: bold; color: #555;">${item.category}</div>
                <div style="font-size: 13px; margin-bottom: 5px;">${item.detail}</div>
                <div style="font-size: 12px; color: #888;">
                  📍 ทล.${item.road} กม.${item.km} (${item.dir})
                </div>
              </div>
            `
          }
        );
        mapInstance.current.Overlays.add(marker);
      }
    });
  };

  // เรียก updateMarkers เมื่อ data เปลี่ยน
  useEffect(() => {
    updateMarkers();
  }, [data]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }} />;
};

export default LongdoMapViewer;