import { useState, useEffect, useCallback } from 'react';
import { SHEET_TRAFFIC_URL, SHEET_ENFORCE_URL, SHEET_SAFETY_URL } from '../constants/config';
import { parseCSV } from '../utils/helpers';
import { processSheetData } from '../utils/dataProcessor';
import { generateTrafficReport } from '../utils/reportGenerator';

const AUTO_REFRESH_INTERVAL = 60000;

export const useTrafficData = () => {
  const [rawData, setRawData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [summaryText, setSummaryText] = useState("");

  const fetchData = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(false);

    try {
      const timestamp = new Date().getTime();
      const [resTraffic, resEnforce, resSafety] = await Promise.all([
        fetch(`${SHEET_TRAFFIC_URL}&t=${timestamp}`).then(r => r.text()),
        fetch(`${SHEET_ENFORCE_URL}&t=${timestamp}`).then(r => r.text()),
        fetch(`${SHEET_SAFETY_URL}&t=${timestamp}`).then(r => r.text())
      ]);

      const dataTraffic = processSheetData(parseCSV(resTraffic), 'TRAFFIC');
      const dataEnforce = processSheetData(parseCSV(resEnforce), 'ENFORCE');
      const dataSafety = processSheetData(parseCSV(resSafety), 'SAFETY');
      
      const allData = [...dataTraffic, ...dataEnforce, ...dataSafety];
      setRawData(allData);
      setLastUpdated(new Date());

      // If it's the initial load, prepare the summary report
      if (!isBackground) {
        const summaryReport = await generateTrafficReport(allData, 'outbound');
        setSummaryText(summaryReport.text);
      }
    } catch (err) {
      console.error('Fetch Error:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(false);
    
    let intervalId;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        fetchData(true);
        intervalId = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
      }
    };

    if (!document.hidden) {
      intervalId = setInterval(() => fetchData(true), AUTO_REFRESH_INTERVAL);
    }
    
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchData]);

  return { rawData, lastUpdated, loading, error, summaryText, refresh: () => fetchData(false) };
};
