import React, { useEffect, useRef, useState } from 'react';
import { CATEGORY_COLORS, DIVISION_COLORS } from '../constants/config';

const LongdoMapViewer = ({ data, apiKey }) => {
  const mapInstance = useRef(null);
  const [status, setStatus] = useState("Waiting for script...");

  useEffect(() => {
    // ฟังก์ชันสร้างแผนที่
    const initMap = () => {
      const mapDiv = document.getElementById('longdo-map-container');
      
      if (!window.longdo) {
        console.log("❌ Window.longdo not found yet");
        setStatus("Retrying... (Script not ready)");
        return;
      }
      if (!mapDiv) {
        console.log("❌ Map container div not found");
        return;
      }
      if (mapInstance.current) {
        console.log("⚠️ Map already initialized");
        return;
      }

      console.log("✅ Starting Map Initialization...");
      const longdo = window.longdo;
      
      try {
        // สร้างแผนที่
        mapInstance.current = new longdo.Map({
          placeholder: mapDiv,
          zoom: 10,
          lastView: false,
          location: { lon: 100.6, lat: 13.8 },
          language: 'th'
        });

        // เปิด Layer
        mapInstance.current.Layers.add(longdo.Layers.TRAFFIC);
        mapInstance.current.Layers.add(longdo.Layers.GRAY); // Dark mode-ish

        // Event เมื่อแผนที่พร้อม
        mapInstance.current.Event.bind('ready', function() {
           console.log("🎉 Map is READY!");
           setStatus("Ready");
           updateMarkers(); // วาดหมุด
        });

      } catch (error) {
        console.error("🔥 Error init map:", error);
        setStatus(`Error: ${error.message}`);
      }
    };

    // --- เช็ค Script ---
    const existingScript = document.getElementById('longdo-map-script');
    if (!existingScript) {
      console.log("📥 Loading Script...");
      const script = document.createElement('script');
      script.src = `https://api.longdo.com/map/?key=${apiKey}`;
      script.id = 'longdo-map-script';
      document.body.appendChild(script);
      
      script.onload = () => {
        console.log("📥 Script Loaded. Waiting 500ms...");
        setTimeout(initMap, 500); 
      };
      script.onerror = () => {
        setStatus("Failed to load Longdo Script (Check Internet/Key)");
      };
    } else {
      console.log("📦 Script exists. Checking readiness...");
      // รอจนกว่า longdo object จะมา
      const checkInterval = setInterval(() => {
        if (window.longdo) {
          clearInterval(checkInterval);
          initMap();
        }
      }, 500);
    }

    return () => {};
  }, [apiKey]);

  // ฟังก์ชันวาดหมุด
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
              detail: item.detail // ง่ายๆ ไปก่อน
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
    if(status === 'Ready') updateMarkers();
  }, [data, status]);

  return (
    <div className="w-full h-full relative bg-slate-900" style={{ minHeight: '300px' }}>
      {/* Debug Status Overlay (จะหายไปเมื่อ Ready) */}
      {status !== 'Ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 z-10 bg-slate-800/80 p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500 mb-2"></div>
          <span className="text-xs font-mono">{status}</span>
          <span className="text-[10px] text-slate-500 mt-1">Key: {apiKey ? apiKey.substring(0,5)+'...' : 'No Key'}</span>
        </div>
      )}
      
      {/* ใช้ ID แทน Ref เพื่อความชัวร์ */}
      <div id="longdo-map-container" style={{ width: '100%', height: '100%', minHeight: '300px' }} />
    </div>
  );
};

export default LongdoMapViewer;