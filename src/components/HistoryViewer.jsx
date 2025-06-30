import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import ReactECharts from 'echarts-for-react';
import { formatDistanceToNow } from 'date-fns';

const { FiX, FiDownload, FiRefreshCw, FiCalendar, FiBarChart3, FiTable } = FiIcons;

const TIME_RANGES = [
  { value: 'last1hour', label: 'Last 1 Hour', hours: 1 },
  { value: 'last6hours', label: 'Last 6 Hours', hours: 6 },
  { value: 'last24hours', label: 'Last 24 Hours', hours: 24 },
  { value: 'last7days', label: 'Last 7 Days', hours: 24 * 7 },
  { value: 'last30days', label: 'Last 30 Days', hours: 24 * 30 },
  { value: 'custom', label: 'Custom Range', hours: 0 }
];

function HistoryViewer({ isOpen, onClose, logger }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('last24hours');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isOpen && logger) {
      loadHistoryData();
      loadLoggerStats();
    }
  }, [isOpen, logger, timeRange, customStartDate, customEndDate]);

  const loadHistoryData = async () => {
    if (!logger) return;

    setLoading(true);
    try {
      const { startTime, endTime } = getTimeRange();
      
      // Request history data from server
      if (window.socketInstance) {
        window.socketInstance.emit('getHistoryData', {
          loggerId: logger.id,
          startTime,
          endTime,
          limit: 1000
        });

        // Listen for response
        window.socketInstance.once('historyDataResponse', (data) => {
          setHistoryData(data || []);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Failed to load history data:', error);
      setLoading(false);
    }
  };

  const loadLoggerStats = async () => {
    if (!logger) return;

    try {
      if (window.socketInstance) {
        window.socketInstance.emit('getLoggerStats', logger.id);
        
        window.socketInstance.once('loggerStatsResponse', (statsData) => {
          setStats(statsData);
        });
      }
    } catch (error) {
      console.error('Failed to load logger stats:', error);
    }
  };

  const getTimeRange = () => {
    if (timeRange === 'custom') {
      return {
        startTime: new Date(customStartDate).getTime(),
        endTime: new Date(customEndDate).getTime()
      };
    }

    const selectedRange = TIME_RANGES.find(r => r.value === timeRange);
    const endTime = Date.now();
    const startTime = endTime - (selectedRange.hours * 60 * 60 * 1000);

    return { startTime, endTime };
  };

  const getChartData = () => {
    if (historyData.length === 0) return null;

    const timestamps = historyData.map(entry => 
      new Date(entry.timestamp).toLocaleString()
    );

    const series = logger.dataPoints.map((dataPoint, index) => ({
      name: dataPoint,
      type: 'line',
      smooth: true,
      data: historyData.map(entry => entry.data[dataPoint] || null),
      connectNulls: false,
      lineStyle: {
        width: 2
      },
      symbol: 'circle',
      symbolSize: 4
    }));

    return {
      title: {
        text: `${logger.name} - History Data`,
        left: 'center',
        textStyle: { fontSize: 16 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: logger.dataPoints,
        bottom: 0,
        textStyle: { fontSize: 12 }
      },
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%'
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: {
          fontSize: 10,
          rotate: 45
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 }
      },
      series: series,
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none'
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'none',
          height: 20,
          bottom: 40
        }
      ]
    };
  };

  const exportData = (format) => {
    if (historyData.length === 0) return;

    try {
      if (window.socketInstance) {
        const { startTime, endTime } = getTimeRange();
        
        window.socketInstance.emit('exportHistoryData', {
          loggerId: logger.id,
          startTime,
          endTime,
          format
        });

        window.socketInstance.once('exportDataResponse', (exportData) => {
          const blob = new Blob([exportData], { 
            type: format === 'csv' ? 'text/csv' : 'application/json' 
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${logger.name.replace(/\s+/g, '_')}_history.${format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen || !logger) return null;

  const chartData = getChartData();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiBarChart3} className="w-6 h-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{logger.name}</h3>
                <p className="text-sm text-gray-600">{logger.description}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'chart' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Chart
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Table
                </button>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => exportData('json')}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" />
                <span>JSON</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => exportData('csv')}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
              >
                <SafeIcon icon={FiDownload} className="w-4 h-4" />
                <span>CSV</span>
              </motion.button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Time Range Controls */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Range
                </label>
                <select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TIME_RANGES.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {timeRange === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date
                    </label>
                    <input
                      type="datetime-local"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="datetime-local"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-end">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadHistoryData}
                  disabled={loading}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
                >
                  <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </motion.button>
              </div>
            </div>

            {/* Statistics */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Total Records</div>
                  <div className="text-lg font-semibold">{stats.stats.totalRecords.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Storage Size</div>
                  <div className="text-lg font-semibold">{formatFileSize(stats.stats.totalSize)}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Oldest Record</div>
                  <div className="text-sm font-semibold">
                    {stats.stats.oldestRecord ? formatDistanceToNow(new Date(stats.stats.oldestRecord), { addSuffix: true }) : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm text-gray-600">Latest Record</div>
                  <div className="text-sm font-semibold">
                    {stats.stats.newestRecord ? formatDistanceToNow(new Date(stats.stats.newestRecord), { addSuffix: true }) : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="min-h-96">
              {loading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <SafeIcon icon={FiRefreshCw} className="w-8 h-8 mx-auto mb-2 animate-spin text-primary-600" />
                    <p className="text-gray-600">Loading history data...</p>
                  </div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-center">
                    <SafeIcon icon={FiBarChart3} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
                    <p className="text-gray-600">No history data found for the selected time range.</p>
                  </div>
                </div>
              ) : viewMode === 'chart' && chartData ? (
                <ReactECharts
                  option={chartData}
                  style={{ height: '400px' }}
                  className="w-full"
                />
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Timestamp
                          </th>
                          {logger.dataPoints.map(dataPoint => (
                            <th key={dataPoint} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              {dataPoint}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.slice(-100).reverse().map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            {logger.dataPoints.map(dataPoint => (
                              <td key={dataPoint} className="px-4 py-2 text-sm text-gray-900">
                                {entry.data[dataPoint] !== undefined ? entry.data[dataPoint] : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {historyData.length > 100 && (
                    <div className="bg-gray-50 px-4 py-2 text-sm text-gray-600">
                      Showing last 100 of {historyData.length} records
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default HistoryViewer;