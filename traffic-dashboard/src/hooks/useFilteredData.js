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
  trendEnd
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
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [rawData, filterStartDate, filterEndDate]);

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
      const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
      const laneKey = `LANE-${locKey}`;

      if (row.category === 'ช่องทางพิเศษ') {
        activeStates.set(laneKey, { ...row, pinType: 'lane', status: 'open', category: 'ช่องทางพิเศษ' });
      } else if (row.category === 'ปิดช่องทางพิเศษ') {
        activeStates.delete(laneKey);
      }

      if (row.category === 'อุบัติเหตุ' && row.div === '8') {
        otherEvents.push({ ...row, pinType: 'event' });
      }

      const content = `${row.category || ''} ${row.detail || ''}`.toLowerCase();
      if (content.includes('เมา') && (content.includes('จับกุม') || row.reportFormat === 'ENFORCE')) {
        otherEvents.push({ ...row, pinType: 'drunk', category: 'จับกุมเมาแล้วขับ' });
      }
    });

    return [...otherEvents, ...activeStates.values()];
  }, [logData]);

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
    sortedLogDataForLanes.forEach(row => {
      const locKey = `${row.div}-${row.st}-${row.road}-${row.dir}`;
      const laneKey = `LANE-${locKey}`;
      if (row.category === 'ช่องทางพิเศษ') activeLaneStates.set(laneKey, row);
      else if (row.category === 'ปิดช่องทางพิเศษ') activeLaneStates.delete(laneKey);
    });

    const accidentData = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && item.category === 'อุบัติเหตุ';
    });

    const trafficData = rawData.filter(item => {
      let passDate = true;
      if (filterStartDate && filterEndDate) passDate = item.date >= filterStartDate && item.date <= filterEndDate;
      return passDate && (item.category === 'จราจรติดขัด' || (item.detail && item.detail.includes('รถมาก')));
    });

    return {
      drunkCount,
      activeLaneCount: activeLaneStates.size,
      openLaneCount: logData.filter(d => d.category === 'ช่องทางพิเศษ').length,
      closeLaneCount: logData.filter(d => d.category === 'ปิดช่องทางพิเศษ').length,
      accidentCount: accidentData.length,
      trafficCount: trafficData.length,
      divChartConfig: (() => {
        const divisions = ["1", "2", "3", "4", "5", "6", "7", "8"];
        const mainCats = ['อุบัติเหตุ', 'จับกุม', 'ช่องทางพิเศษ', 'จราจรติดขัด', 'ว.43'];
        const datasets = mainCats.map(cat => ({
          label: cat,
          data: divisions.map(div => visualData.filter(d => d.div === div && d.category === cat).length),
          backgroundColor: CATEGORY_COLORS[cat] || '#cbd5e1',
          stack: 'Stack 0',
        }));
        return { labels: divisions.map(d => `กก.${d}`), datasets };
      })()
    };
  }, [visualData, rawData, filterStartDate, filterEndDate, logData]);

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
    visualData,
    mapData,
    stats,
    trendChartConfig
  };
};
