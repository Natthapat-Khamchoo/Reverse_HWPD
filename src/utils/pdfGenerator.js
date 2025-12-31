import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDFReport = async (reportText, stats, metadata) => {
   try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pdfHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 20; // 20mm margin
      const contentWidth = 210; // HTML width matches A4 width
      const contentHeight = 297 - (margin * 2); // Usable height in mm

      // Helper to capture a DOM element to Image Data
      const captureElement = async (element) => {
         // Need to append to body to capture, but keep it hidden/absolute
         document.body.appendChild(element);
         const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
         document.body.removeChild(element);
         return canvas.toDataURL('image/jpeg', 0.95);
      };

      // Helper to create a Page Container
      const createPageContainer = () => {
         const container = document.createElement('div');
         container.style.width = '210mm';
         container.style.minHeight = '297mm';
         container.style.padding = '20mm';
         container.style.backgroundColor = 'white';
         container.style.fontFamily = "'Sarabun', 'Prompt', sans-serif";
         container.style.position = 'absolute';
         container.style.left = '-9999px';
         container.style.top = '0';
         container.style.boxSizing = 'border-box';

         // Add Header/Footer structure if needed, or just blank canvas
         return container;
      };

      // 1. Prepare Header Content (First Page Only or Repeated?) -> Usually First Page
      const dateStr = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

      const headerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; margin: 0; color: #1e293b;">รายงานสรุปสถานการณ์จราจรและอุบัติเหตุ</h1>
                <p style="font-size: 14px; color: #64748b; margin-top: 5px;">Traffic & Accident Daily Report</p>
            </div>
            <div style="border-bottom: 2px solid #334155; margin-bottom: 20px;"></div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px;">
                <div><strong>วันที่ออกรายงาน:</strong> ${dateStr}</div>
                <div><strong>หน่วยงาน:</strong> กองบังคับการตำรวจทางหลวง</div>
            </div>
        `;

      const statsHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
               <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background-color: #f8fafc;">
                  <div style="font-size: 12px; color: #64748b;">จับกุมเมา</div>
                  <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${stats.drunkCount || 0}</div>
               </div>
               <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background-color: #f8fafc;">
                  <div style="font-size: 12px; color: #64748b;">อุบัติเหตุ</div>
                  <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${stats.accidentCount || '-'}</div>
               </div>
               <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background-color: #f8fafc;">
                  <div style="font-size: 12px; color: #64748b;">เปิดช่องทางฯ</div>
                  <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.openLaneCount || 0}</div>
               </div>
               <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: center; background-color: #f8fafc;">
                  <div style="font-size: 12px; color: #64748b;">รถมาก/ติดขัด</div>
                  <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.trafficCount || '-'}</div>
               </div>
            </div>
            <h3 style="font-size: 18px; font-weight: bold; border-left: 4px solid #3b82f6; padding-left: 10px; margin-bottom: 15px; color: #1e293b;">รายละเอียดรายงาน</h3>
        `;

      // 2. Logic to Split Content
      // We will create a "Tester Container" to measure heights before finalizing pages.
      const tester = document.createElement('div');
      tester.style.width = '170mm'; // Width inside padding (210 - 40)
      tester.style.position = 'absolute';
      tester.style.left = '-9999px';
      tester.style.fontFamily = "'Sarabun', 'Prompt', sans-serif";
      tester.style.fontSize = '12px';
      tester.style.lineHeight = '1.5';
      document.body.appendChild(tester);

      // Parse Report Text into Blocks
      // Strategy: Split by "📍" or "🛣️" to treat them as atomic blocks that shouldn't be split internally if possible
      // But the report text format has changed. Let's use newline splitting but group by paragraphs.
      const lines = (reportText || '').split('\n');

      let pages = [];
      let currentPageElements = [];
      let currentHeight = 0;

      // Initial Height include Header & Stats
      tester.innerHTML = headerHTML + statsHTML;
      const initialHeaderHeight = tester.offsetHeight; // Pixel height

      // Convert A4 usable height (257mm) to pixels (approx conversion for screen)
      // Since we are capturing at screen DPI then scaling, we should use offsetHeight comparisons directly.
      // We can approximate A4 height in screen pixels by comparing to the container's rendered height? 
      // No, better to define a "Max Pixel Height".
      // 297mm height at 96dpi is ~1123px. Padding 40mm total is ~150px. Usable ~970px.
      // Let's use a safe limit, maybe 900px to be safe.
      const MAX_PAGE_HEIGHT_PX = 950;

      // Start Page 1
      currentPageElements.push({ type: 'html', content: headerHTML + statsHTML });
      currentHeight += initialHeaderHeight;

      for (let i = 0; i < lines.length; i++) {
         const line = lines[i];
         if (!line.trim()) continue; // Skip empty lines, or add as spacer?

         // Create a test element for this line
         const p = document.createElement('div');
         // Check if it's a header line to style it
         if (line.includes('📍') || line.includes('🛣️')) {
            p.style.fontWeight = 'bold';
            p.style.marginTop = '10px';
            p.style.color = '#1e293b';
            p.style.backgroundColor = '#f1f5f9';
            p.style.padding = '5px';
            p.style.borderRadius = '4px';
         } else if (line.includes('✅') || line.includes('🔴') || line.includes('🟡') || line.includes('⚫')) {
            p.style.marginLeft = '15px';
            p.style.marginBottom = '5px';
         } else if (line.startsWith('   ') || line.startsWith('\t')) {
            p.style.marginLeft = '30px';
            p.style.color = '#475569';
         } else {
            p.style.marginTop = '5px';
         }

         p.innerText = line;
         tester.innerHTML = '';
         tester.appendChild(p);
         const lineHeight = tester.offsetHeight;

         if (currentHeight + lineHeight > MAX_PAGE_HEIGHT_PX) {
            // Page Full -> Push Current Page
            pages.push(currentPageElements);
            currentPageElements = [];
            currentHeight = 0;

            // Add header for continuation pages? Or just spacing
            const spacer = { type: 'html', content: '<div style="height: 20px;"></div>' };
            currentPageElements.push(spacer);
            currentHeight += 20;
         }

         currentPageElements.push({ type: 'element', node: p.cloneNode(true) });
         currentHeight += lineHeight;
      }

      // Push last page
      if (currentPageElements.length > 0) {
         pages.push(currentPageElements);
      }

      document.body.removeChild(tester);

      // 3. Render and Capture Pages
      for (let i = 0; i < pages.length; i++) {
         const pageContainer = createPageContainer();
         const elements = pages[i];

         // Add Footer
         const footer = document.createElement('div');
         footer.style.position = 'absolute';
         footer.style.bottom = '10mm';
         footer.style.width = '100%';
         footer.style.textAlign = 'center';
         footer.style.fontSize = '10px';
         footer.style.color = '#94a3b8';
         footer.innerHTML = `รายงานอัตโนมัติ Traffic Dashboard - หน้า ${i + 1}/${pages.length}`;
         pageContainer.appendChild(footer);

         // Append Content
         const contentBox = document.createElement('div');
         // contentBox.style.border = '1px solid red'; // Debug
         elements.forEach(el => {
            if (el.type === 'html') {
               const div = document.createElement('div');
               div.innerHTML = el.content;
               contentBox.appendChild(div);
            } else if (el.type === 'element') {
               contentBox.appendChild(el.node);
            }
         });
         pageContainer.appendChild(contentBox);

         // Capture
         const imgData = await captureElement(pageContainer);
         if (i > 0) doc.addPage();
         doc.addImage(imgData, 'JPEG', 0, 0, 210, 297); // Full A4
      }

      doc.save(`Traffic-Report-${new Date().getTime()}.pdf`);
      return true;

   } catch (error) {
      console.error("Error generating PDF:", error);
      alert("เกิดข้อผิดพลาด: " + error.message);
      return false;
   }
};
