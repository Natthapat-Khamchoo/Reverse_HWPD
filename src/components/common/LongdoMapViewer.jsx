import React, { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS, DIVISION_COLORS } from '../../constants/config';

const LongdoMapViewer = ({ data, apiKey }) => {
  const mapInstance = useRef(null);
  const [status, setStatus] = useState("Loading...");
  const [errorDetails, setErrorDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const mapId = "longdo-map-container";

  // 1. ฟังก์ชันวาดหมุด (Marker)
  const updateMarkers = () => {
    if (!mapInstance.current || !window.longdo) return;

    try {
      const longdo = window.longdo;
      mapInstance.current.Overlays.clear(); // ลบหมุดเก่า

      data.forEach(item => {
        if (item.lat && item.lng) {
          const color = item.category.includes('อุบัติเหตุ')
            ? '#FF0000'
            : (CATEGORY_COLORS[item.category] || '#94a3b8');

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
                <div style="color: #000; min-width: 200px;">
                   <div style="font-weight:bold; color:blue; border-bottom:1px solid #ccc;">${item.category}</div>
                   <div style="margin-top:4px;">${item.detail || '-'}</div>
                   <div style="font-size:10px; color:#666; margin-top:4px;">${item.time} น. | กก.${item.div}</div>
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
    // 2. ฟังก์ชันเริ่มสร้าง Map
    const initMap = () => {
      if (!window.longdo || !window.longdo.Map) {
        // กรณี Script โหลดแล้วแต่ Object ไม่มา (มักเกิดจาก Key/Domain ผิด)
        console.error("Longdo Script loaded but 'longdo' object missing.");
        return false;
      }

      const mapDiv = document.getElementById(mapId);
      if (!mapDiv) return false;
      if (mapInstance.current) return true; // มีแล้วไม่ต้องสร้างใหม่

      try {
        const longdo = window.longdo;
        mapInstance.current = new longdo.Map({
          placeholder: mapDiv,
          zoom: 10,
          lastView: false,
          location: { lon: 100.6, lat: 13.8 },
          language: 'th'
        });

        // Add Layers
        mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
        mapInstance.current.Layers.add(longdo.Layers.GRAY);

        // Bind Ready Event
        mapInstance.current.Event.bind('ready', function () {
          setStatus("Ready");
          updateMarkers();
        });

        return true;
      } catch (e) {
        console.error("Map Init Error:", e);
        setStatus("Map Error: " + e.message);
        return false;
      }
    };

    // 3. Logic โหลด Script และ Polling
    const scriptId = 'longdo-map-script';
    let checkInterval = null;

    if (!document.getElementById(scriptId)) {
      setStatus("Downloading Map Script...");
      const script = document.createElement('script');
      script.src = `https://api.longdo.com/map/?key=${apiKey}`;
      script.id = scriptId;

      script.onerror = () => {
        setStatus("Network Error: Cannot connect to Longdo API");
        setErrorDetails("ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
      };

      document.body.appendChild(script);

      script.onload = () => {
        if (!window.longdo) {
          setStatus("Script Loaded but API Missing (Invalid Key?)");
        }
      };
    }

    // วนเช็คทุก 500ms (สูงสุด 20 วินาที)
    let attempts = 0;
    checkInterval = setInterval(() => {
      attempts++;
      if (initMap()) {
        clearInterval(checkInterval); // สำเร็จ! หยุดเช็ค
      } else {
        if (attempts > 40) {
          clearInterval(checkInterval);
          setStatus("Connection Timeout");
          setErrorDetails("เชื่อมต่อไม่ได้ (อาจเกิดจาก Key ผิด หรือ Domain ไม่ได้รับอนุญาต)");
        } else {
          // ยังไม่พร้อม... รอต่อไป
          if (window.longdo) setStatus("Initializing Map...");
          else setStatus(`Connecting to Map API... (${Math.floor(attempts / 2)}s)`);
        }
      }
    }, 500);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [apiKey, retryCount]); // Add retryCount dependency

  const handleRetry = () => {
    // Remove existing script to force reload
    const existingScript = document.getElementById('longdo-map-script');
    if (existingScript) existingScript.remove();

    setStatus("Retrying...");
    setErrorDetails(null);
    setRetryCount(prev => prev + 1);
  };

  // อัปเดตหมุดเมื่อข้อมูลเปลี่ยน
  useEffect(() => {
    if (status === 'Ready') updateMarkers();
  }, [data, status]);

  return (
    <div className="w-full h-full relative bg-slate-900 rounded-lg overflow-hidden" style={{ minHeight: '300px' }}>
      {/* Loading Overlay */}
      {status !== 'Ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 z-10 bg-slate-800/95 p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mb-2"></div>
          <span className="text-xs font-mono font-bold text-yellow-400">{status}</span>
          {errorDetails && <span className="text-xs text-red-400 mt-1">{errorDetails}</span>}

          <button
            onClick={handleRetry}
            className="mt-3 px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded border border-slate-500 transition-colors"
          >
            🔄 ลองเชื่อมต่อใหม่ (Retry)
          </button>

          <div className="mt-4 text-[10px] text-slate-400 max-w-xs border border-slate-600 p-2 rounded">
            <strong>คำแนะนำแก้ไข:</strong><br />
            1. ไปที่ <a href="https://map.longdo.com/console" target="_blank" className="text-blue-400 underline">Longdo Console</a><br />
            2. เมนู My Keys &rarr; แก้ไข Key<br />
            3. ช่อง Referer/Domain ใส่ <code>*</code> แล้ว Save<br />
            4. รอ 2 นาทีแล้วกดปุ่ม Retry
          </div>
        </div>
      )}

      <div id={mapId} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default LongdoMapViewer;