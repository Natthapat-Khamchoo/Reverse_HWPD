import React, { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS, DIVISION_COLORS } from '../constants/config';

const LongdoMapViewer = ({ data, apiKey }) => {
  const mapInstance = useRef(null);
  const [status, setStatus] = useState("Initializing...");

  // 1. ฟังก์ชันวาดหมุด (แยกออกมาเพื่อให้เรียกได้ตลอด)
  const updateMarkers = () => {
    if (!mapInstance.current || !window.longdo) return;
    try {
      const longdo = window.longdo;
      mapInstance.current.Overlays.clear();

      data.forEach(item => {
        if (item.lat && item.lng) {
          const color = item.category.includes('อุบัติเหตุ') ? '#FF0000' : (CATEGORY_COLORS[item.category] || '#94a3b8');
          
          const markerHtml = `
            <div style="width: 14px; height: 14px; background-color: ${color}; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.8); cursor: pointer;"></div>
          `;
          
          const marker = new longdo.Marker(
            { lon: item.lng, lat: item.lat },
            {
              title: item.category,
              icon: { html: markerHtml, offset: { x: 7, y: 7 } },
              detail: `
                <div style="color: #000; font-family: sans-serif; min-width: 200px;">
                   <div style="font-weight:bold; color:blue;">${item.category}</div>
                   <div>${item.detail}</div>
                   <div style="font-size:10px; color:#666;">${item.time} น.</div>
                </div>`
            }
          );
          mapInstance.current.Overlays.add(marker);
        }
      });
    } catch (e) {
      console.error("Marker Error:", e);
    }
  };

  useEffect(() => {
    // 2. ฟังก์ชันเริ่มสร้าง Map (จะถูกเรียกเมื่อ script พร้อมแล้วจริงๆ)
    const initMap = () => {
      const mapDiv = document.getElementById('longdo-map-container');
      if (!mapDiv) return;
      if (mapInstance.current) return; // ถ้ามีแล้วไม่ต้องสร้างใหม่

      try {
        const longdo = window.longdo;
        mapInstance.current = new longdo.Map({
          placeholder: mapDiv,
          zoom: 10,
          lastView: false,
          location: { lon: 100.6, lat: 13.8 },
          language: 'th'
        });

        mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
        mapInstance.current.Layers.add(longdo.Layers.GRAY);

        mapInstance.current.Event.bind('ready', function() {
           setStatus("Ready");
           updateMarkers();
        });
      } catch (e) {
        console.error("Map Init Error:", e);
        setStatus("Map Error: " + e.message);
      }
    };

    // 3. Logic การโหลด Script และวนเช็ค (Polling)
    const checkAndInit = () => {
        // เช็คว่า object longdo มาหรือยัง?
        if (window.longdo && window.longdo.Map) {
            initMap();
            return true; // สำเร็จ
        }
        return false; // ยังไม่มา
    };

    // เริ่มโหลด Script ถ้ายังไม่มี
    if (!document.getElementById('longdo-map-script')) {
        setStatus("Downloading Script...");
        const script = document.createElement('script');
        script.src = `https://api.longdo.com/map/?key=${apiKey}`;
        script.id = 'longdo-map-script';
        document.body.appendChild(script);
    }

    // *** Key Fix: วนเช็คทุก 500ms จำนวน 40 ครั้ง (รวม 20 วินาที) ***
    let checks = 0;
    const timer = setInterval(() => {
        checks++;
        const isReady = checkAndInit();
        
        if (isReady) {
            clearInterval(timer); // หยุดเช็คเมื่อเจอ
        } else {
            setStatus(`Waiting for Longdo... (${checks})`);
            if (checks > 40) {
                clearInterval(timer);
                setStatus("Timeout: Longdo Script not loaded. Check Internet/Key.");
            }
        }
    }, 500);

    return () => clearInterval(timer);
  }, [apiKey]);

  // เมื่อ Data เปลี่ยน ให้วาดหมุดใหม่ (ถ้าแมพพร้อมแล้ว)
  useEffect(() => {
    if (status === 'Ready') {
        updateMarkers();
    }
  }, [data, status]);

  return (
    <div className="w-full h-full relative bg-slate-900" style={{ minHeight: '300px' }}>
      {/* Loading Overlay */}
      {status !== 'Ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 z-10 bg-slate-800/90 p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mb-2"></div>
          <span className="text-xs font-mono">{status}</span>
          <div className="mt-2 text-[10px] text-red-400">
             *หากรอนานเกิน 20วิ อาจเกิดจาก API Key ผิด หรือโดเมนไม่ถูกต้อง
          </div>
        </div>
      )}
      
      <div id="longdo-map-container" style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LongdoMapViewer;