import React, { useEffect, useRef } from 'react';
import { CATEGORY_COLORS } from '../constants/config';

const LongdoMapViewer = ({ data }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // 1. โหลด Script ของ Longdo Map API
    const script = document.createElement('script');
    script.src = `https://api.longdo.com/map/?key=43c345d5dae4db42926bd41ae0b5b0fa`; // ใส่ Key ที่นี่
    script.id = 'longdo-map-script';
    document.body.appendChild(script);

    script.onload = () => {
      // 2. เริ่มสร้างแผนที่เมื่อ Script โหลดเสร็จ
      window.longdo = window.longdo || {};
      const longdo = window.longdo;
      
      mapInstance.current = new longdo.Map({
        placeholder: mapRef.current,
        zoom: 10,
        lastView: false,
        location: { lon: 100.5, lat: 13.75 }
      });

      // 3. เปิด Layer จราจร (พระเอกของเรา)
      mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
      
      // ปรับเป็น Dark Mode (Optional)
      mapInstance.current.Layers.add(longdo.Layers.GRAY); 
    };

    return () => {
      // Cleanup (ถ้าจำเป็น)
      // document.body.removeChild(script); 
    }
  }, []);

  // 4. อัปเดตหมุด (Marker) เมื่อ data เปลี่ยน
  useEffect(() => {
    if (!mapInstance.current || !window.longdo) return;
    const longdo = window.longdo;

    // ลบหมุดเก่าออกให้หมดก่อน
    mapInstance.current.Overlays.clear();

    // วนลูปสร้างหมุดใหม่
    data.forEach(item => {
      if(item.lat && item.lng) {
        // กำหนดสีตามประเภท
        const color = item.category.includes('อุบัติเหตุ') ? '#FF0000' : (CATEGORY_COLORS[item.category] || '#999');
        
        // สร้าง Pin แบบจุดวงกลม (Custom Html Marker)
        const markerHtml = `
          <div style="
            width: 12px; height: 12px; 
            background-color: ${color}; 
            border: 2px solid white; 
            border-radius: 50%; 
            box-shadow: 0 0 4px rgba(0,0,0,0.5);
            cursor: pointer;">
          </div>`;
          
        const marker = new longdo.Marker(
          { lon: item.lng, lat: item.lat },
          { 
            icon: { html: markerHtml, offset: { x: 6, y: 6 } },
            title: item.category,
            detail: item.detail 
          }
        );
        mapInstance.current.Overlays.add(marker);
      }
    });

  }, [data]);

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
};

export default LongdoMapViewer;