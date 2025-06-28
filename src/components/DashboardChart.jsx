import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';

const { FiEdit2, FiTrash2, FiRefreshCw } = FiIcons;

const COLOR_SCHEMES = {
  Blue: ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a'],
  Green: ['#10b981', '#059669', '#047857', '#065f46'],
  Purple: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'],
  Orange: ['#f59e0b', '#d97706', '#b45309', '#92400e'],
  Red: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'],
  Rainbow: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
};

function DashboardChart({ chart, onEdit, onDelete }) {
  const { devices } = useGateway();
  const [chartData, setChartData] = useState(null);
  const [dataHistory, setDataHistory] = useState({});

  useEffect(() => {
    // Initialize data history for chart devices
    chart.deviceIds.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      if (device && device.lastData && !dataHistory[deviceId]) {
        setDataHistory(prev => ({
          ...prev,
          [deviceId]: [{
            timestamp: device.lastUpdated,
            data: device.lastData
          }]
        }));
      }
    });
  }, [devices, chart.deviceIds]);

  useEffect(() => {
    // Update data history when devices update
    chart.deviceIds.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      if (device && device.lastData && device.lastUpdated) {
        setDataHistory(prev => {
          const deviceHistory = prev[deviceId] || [];
          const lastEntry = deviceHistory[deviceHistory.length - 1];
          
          // Only add if timestamp is different (new data)
          if (!lastEntry || lastEntry.timestamp !== device.lastUpdated) {
            const newHistory = [
              ...deviceHistory,
              { timestamp: device.lastUpdated, data: device.lastData }
            ].slice(-20); // Keep last 20 entries
            
            return { ...prev, [deviceId]: newHistory };
          }
          return prev;
        });
      }
    });
  }, [devices, chart.deviceIds]);

  useEffect(() => {
    generateChartData();
  }, [chart, devices, dataHistory]);

  const generateChartData = () => {
    const selectedDevices = devices.filter(d => chart.deviceIds.includes(d.id));
    const colorScheme = COLOR_SCHEMES[chart.colorScheme] || COLOR_SCHEMES.Blue;

    if (chart.type === 'pie') {
      // For pie charts, show current values
      const data = [];
      selectedDevices.forEach(device => {
        if (device.lastData) {
          chart.dataKeys.forEach(key => {
            if (device.lastData[key] !== undefined) {
              data.push({
                name: `${device.name} - ${key}`,
                value: Math.abs(device.lastData[key]) || 0
              });
            }
          });
        }
      });

      setChartData({
        title: { text: chart.title, left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'item' },
        legend: chart.showLegend ? { bottom: 0, textStyle: { fontSize: 10 } } : {},
        series: [{
          type: 'pie',
          radius: '60%',
          data: data,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }]
      });
    } else if (chart.type === 'gauge') {
      // For gauge charts, show first selected data key from first device
      const device = selectedDevices[0];
      const dataKey = chart.dataKeys[0];
      const value = device?.lastData?.[dataKey] || 0;

      setChartData({
        title: { text: chart.title, left: 'center', textStyle: { fontSize: 14 } },
        series: [{
          type: 'gauge',
          radius: '80%',
          data: [{
            value: Math.abs(value),
            name: `${device?.name || 'Device'} - ${dataKey}`
          }],
          detail: { fontSize: 12 },
          axisLabel: { fontSize: 10 }
        }]
      });
    } else {
      // For line and bar charts, use historical data
      const allTimestamps = new Set();
      
      // Collect all timestamps
      chart.deviceIds.forEach(deviceId => {
        const history = dataHistory[deviceId] || [];
        history.forEach(entry => allTimestamps.add(entry.timestamp));
      });

      const sortedTimestamps = Array.from(allTimestamps).sort().slice(-10); // Last 10 data points
      const timestamps = sortedTimestamps.map(ts => 
        new Date(ts).toLocaleTimeString()
      );

      const series = [];
      let colorIndex = 0;

      selectedDevices.forEach(device => {
        chart.dataKeys.forEach(key => {
          const history = dataHistory[device.id] || [];
          const data = sortedTimestamps.map(timestamp => {
            const entry = history.find(h => h.timestamp === timestamp);
            return entry?.data[key] || null;
          });

          if (data.some(d => d !== null)) {
            series.push({
              name: `${device.name} - ${key}`,
              type: chart.type,
              data: data,
              color: colorScheme[colorIndex % colorScheme.length],
              smooth: chart.type === 'line',
              connectNulls: false
            });
            colorIndex++;
          }
        });
      });

      setChartData({
        title: { text: chart.title, left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis' },
        legend: chart.showLegend ? { bottom: 0, textStyle: { fontSize: 10 } } : {},
        grid: chart.showGrid ? { left: '10%', right: '10%', top: '15%', bottom: '20%' } : {},
        xAxis: {
          type: 'category',
          data: timestamps,
          axisLabel: { fontSize: 10 }
        },
        yAxis: {
          type: 'value',
          axisLabel: { fontSize: 10 }
        },
        series: series
      });
    }
  };

  const handleRefresh = () => {
    generateChartData();
  };

  if (!chartData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{chart.title}</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRefresh}
            className="text-gray-400 hover:text-gray-600 p-1"
            title="Refresh chart"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(chart)}
            className="text-gray-400 hover:text-primary-600 p-1"
            title="Edit chart"
          >
            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(chart.id)}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete chart"
          >
            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <ReactECharts
        option={chartData}
        style={{ height: `${chart.height}px` }}
        className="w-full"
      />
    </motion.div>
  );
}

export default DashboardChart;