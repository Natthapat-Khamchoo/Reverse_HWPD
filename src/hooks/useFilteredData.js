import { useMemo } from 'react';
import { ORG_STRUCTURE, CATEGORY_COLORS } from '../constants/config';
import { getThaiDateStr } from '../utils/helpers';
import { formatBlock } from '../utils/problemReportGenerator';

export const useFilteredData = ({
  rawData,
  filterStartDate,
  filterEndDate,
  filterDiv,
  filterSt,
  selectedCategories,
  selectedRoads,
  trendStart,
  trendEnd,
  manuallyClosedIds
}) => {
  // 1. Unique Roads
  const uniqueRoads = useMemo(() => 
    Array.from(new Set(rawData.map(d => d.road).filter(r => r && r !== '-' && r.length < 10 && r !== 'ไม่ระบุ'))).sort()
  , [rawData]);

  // 2. Stations based on Division
  const stations = useMemo(() => 
    (filterDiv && ORG_STRUCTURE[filterDiv]) ? Array.from({ length: ORG_STRUCTURE[filterDiv] }, (_, i) => i + 1) : []
  , [filterDiv]);

  // 3. Log Data (Filtered)
  const logData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;

      let passCategory = true;
      if (selectedCategories.length > 0) {
        passCategory = selectedCategories.includes(item.category);
        if (selectedCategories.includes('ช่องทางพิเศษ') && item.category === 'ปิดช่องทางพิเศษ') {
          passCategory = true;
        }
      }

      const passRoad = selectedRoads.length === 0 || selectedRoads.includes(item.road);
      const passDiv = !filterDiv || item.div === filterDiv;
      const passSt = !filterSt || item.st === filterSt;
      return passDate && passCategory && passRoad && passDiv && passSt;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, selectedCategories, selectedRoads]);

  // 4. Accident Data (Global for comparison/stats)
  const accidentLogData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ';
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

  // 5. Special Lane Data
  const specialLaneLogData = useMemo(() => {
    return rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const isSpecialLane = item.category === 'ช่องทางพิเศษ' || item.category === 'ปิดช่องทางพิเศษ';
      return passDate && isSpecialLane;
    }).map(item => ({
      ...item,
      laneKey: `LANE-${item.div}-${item.st}-${item.road}-${item.dir}`
    })).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

  // --- NEW: Unified Special Lane Processing ---
    const processedSpecialLanes = useMemo(() => {
    const locationSessions = {};
    const results = [];
    
    // Process ALL historical data first to build sessions correctly
    const allEvents = rawData
      .filter(d => d.category === 'ช่องทางพิเศษ' || d.category === 'ปิดช่องทางพิเศษ')
      .sort((a, b) => a.timestamp - b.timestamp);

    allEvents.forEach(evt => {
      const key = `${evt.div}-${evt.st}-${evt.road}-${evt.km}-${evt.dir}`;
      if (!locationSessions[key]) locationSessions[key] = [];
      
      if (evt.category === 'ช่องทางพิเศษ') {
        const laneKey = `LANE-${evt.div}-${evt.st}-${evt.road}-${evt.dir}`;
        const newSession = {
          ...evt,
          laneKey,
          locationKey: key,
          isStillActive: !manuallyClosedIds.includes(evt.id),
          closeInfo: null,
          duration: null,
          durationText: null
        };
        locationSessions[key].push(newSession);
        results.push(newSession);
      } else if (evt.category === 'ปิดช่องทางพิเศษ') {
        const sessionToClose = locationSessions[key] && locationSessions[key].pop();
        if (sessionToClose && evt.timestamp && sessionToClose.timestamp) {
          sessionToClose.isStillActive = false;
          sessionToClose.closeInfo = {
            time: evt.time || '?',
            date: evt.date || '?',
            timestamp: evt.timestamp
          };
          const durationMinutes = (evt.timestamp - sessionToClose.timestamp) / 1000 / 60;
          sessionToClose.duration = durationMinutes;
          const h = Math.floor(durationMinutes / 60);
          const m = Math.round(durationMinutes % 60);
          sessionToClose.durationText = h > 0 ? `${h} ชม. ${m} นาที` : `${m} นาที`;
        }
      }
    });

    // NOW apply filters to the built sessions for analysis
    return results.filter(session => {
        // Must overlap with date filter
        let passDate = true;
        if (filterStartDate && filterEndDate) {
            // Include if session started in range OR ended in range OR is active
            const startStr = session.date;
            const endStr = session.closeInfo ? session.closeInfo.date : '9999-99-99'; // Assume far future if active
            passDate = (startStr >= filterStartDate && startStr <= filterEndDate) || 
                      (endStr >= filterStartDate && endStr <= filterEndDate);
        }
        
        let passDiv = !filterDiv || session.div === filterDiv;
        let passSt = !filterSt || session.st === filterSt;
        
        return passDate && passDiv && passSt;
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate, filterDiv, filterSt, manuallyClosedIds]);

  // 6. Visual Data (Applied logic for charts)
  const visualData = useMemo(() => {
    return logData.filter(item => {
      if (item.category === 'อุบัติเหตุ') return item.div === '8';
      return true;
    });
  }, [logData]);

  // 7. Map Data
  const mapData = useMemo(() => {
    const sortedData = [...logData].sort((a, b) => a.timestamp - b.timestamp);
    const activeStates = new Map();
    const otherEvents = [];

    sortedData.forEach(row => {
      if (!row.lat || !row.lng) return;

      if (row.category === 'อุบัติเหตุ' && row.div === '8') {
        otherEvents.push({ ...row, pinType: 'event' });
      }

      const content = `${row.category || ''} ${row.detail || ''}`.toLowerCase();
      if (content.includes('เมา') && (content.includes('จับกุม') || row.reportFormat === 'ENFORCE')) {
        otherEvents.push({ ...row, pinType: 'drunk', category: 'จับกุมเมาแล้วขับ' });
      }
    });

    // --- SPECIAL LANCE MAP PINS ---
    // Use the unified processedSpecialLanes to show pins only for truly active sessions
    processedSpecialLanes
      .filter(lane => lane.isStillActive)
      .forEach(lane => {
        activeStates.set(lane.laneKey, { 
          ...lane, 
          pinType: 'lane', 
          status: 'open', 
          category: 'ช่องทางพิเศษ' 
        });
      });

    return [...otherEvents, ...activeStates.values()];
  }, [logData, processedSpecialLanes]);

  // 8. Stats Calculation
  const stats = useMemo(() => {
    const drunkCount = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const allText = `${item.category} ${item.detail} ${item.reportFormat}`.toLowerCase();
      const isEnforceContext = allText.includes('จับกุม') || item.reportFormat === 'ENFORCE';
      const isDrunk = allText.includes('เมา');
      return passDate && isEnforceContext && isDrunk;
    }).length;

    const activeLaneStates = new Map();
    const sortedLogDataForLanes = [...logData].sort((a, b) => a.timestamp - b.timestamp);
    
    // 1. Unified Special Lane Stats (from processedSpecialLanes)
    const inPeriodLanes = processedSpecialLanes.filter(l => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = l.date >= filterStartDate && l.date <= filterEndDate;
      return passDate;
    });

    const activeLanes = inPeriodLanes.filter(l => l.isStillActive);
    const closedLanes = inPeriodLanes.filter(l => !l.isStillActive);

    // 2. Accidents Breakdown
    const accidentData = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ' && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    });

    const div8Accidents = accidentData.filter(a => a.div === '8' || a.road === '7' || a.road === '9');
    const otherAccidents = accidentData.filter(a => a.div !== '8' && a.road !== '7' && a.road !== '9');

    // 3. Traffic Jams
    const trafficData = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      const allText = `${item.category} ${item.detail}`.toLowerCase();
      return passDate && (item.category === 'จราจรติดขัด' || allText.includes('รถมาก')) && (!filterDiv || item.div === filterDiv) && (!filterSt || item.st === filterSt);
    });

    return {
      drunkCount,
      activeLaneCount: activeLanes.length, // Shown on Card
      openLaneCount: inPeriodLanes.length,  // "สะสม"
      closeLaneCount: closedLanes.length,   // "ปิดแล้ว"
      accidentCount: accidentData.length,
      trafficCount: trafficData.length,
      details: {
        accidents: {
          all: accidentData,
          div8: div8Accidents,
          others: otherAccidents
        },
        lanes: {
          active: activeLanes,
          closed: closedLanes,
          open: inPeriodLanes
        },
        drunk: rawData.filter(item => {
          let passDate = true;
          if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
          const allText = `${item.category} ${item.detail} ${item.reportFormat}`.toLowerCase();
          return passDate && (allText.includes('จับกุม') || item.reportFormat === 'ENFORCE') && allText.includes('เมา');
        }),
        traffic: trafficData
      },
      divChartConfig: (() => {
        const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
        const datasets = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'].map(cat => ({
          label: cat,
          data: divisions.map(div => visualData.filter(d => d.div === div && d.category === cat).length),
          backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
          stack: 'Stack 0',
        }));
        return { labels: divisions.map(d => `กก.${d}`), datasets };
      })()
    };
  }, [visualData, rawData, filterStartDate, filterEndDate, logData, processedSpecialLanes, manuallyClosedIds]);

  // 9. Trend Chart Config
  const trendChartConfig = useMemo(() => {
    const trendFiltered = rawData.filter(item => {
      const inDate = item.date >= trendStart && item.date <= trendEnd;
      const visualRule = (item.category === 'อุบัติเหตุ') ? (item.div === '8') : true;
      return inDate && visualRule;
    });
    const labels = [];
    let curr = new Date(trendStart);
    const end = new Date(trendEnd);
    while (curr <= end) {
      labels.push(getThaiDateStr(curr));
      curr.setDate(curr.getDate() + 1);
    }
    const categories = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
    const datasets = categories.map(cat => ({
      label: cat,
      data: labels.map(date => trendFiltered.filter(item => item.date === date && item.category === cat).length),
      backgroundColor: CATEGORY_COLORS[cat] || '#94a3b8',
      stack: 'stack1',
    }));
    return { labels: labels.map(d => d.split('-').slice(1).join('/')), datasets };
  }, [rawData, trendStart, trendEnd]);

  return {
    uniqueRoads,
    stations,
    logData,
    accidentLogData,
    specialLaneLogData,
    processedSpecialLanes,
    visualData,
    mapData,
    stats,
    trendChartConfig
  };
};
