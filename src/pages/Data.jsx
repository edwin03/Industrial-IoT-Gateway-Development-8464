import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';
import { formatDistanceToNow } from 'date-fns';

const { FiDatabase, FiRefreshCw, FiDownload, FiEye, FiFilter, FiTrendingUp } = FiIcons;

function Data() {
  const { devices } = useGateway();
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);
  const [dataHistory, setDataHistory] = useState({});

  useEffect(() => {
    // Initialize data history for all devices
    devices.forEach(device => {
      if (device.lastData && !dataHistory[device.id]) {
        setDataHistory(prev => ({
          ...prev,
          [device.id]: [{
            timestamp: device.lastUpdated,
            data: device.lastData
          }]
        }));
      }
    });
  }, [devices]);

  useEffect(() => {
    // Update data history when devices update
    devices.forEach(device => {
      if (device.lastData && device.lastUpdated) {
        setDataHistory(prev => {
          const deviceHistory = prev[device.id] || [];
          const lastEntry = deviceHistory[deviceHistory.length - 1];
          
          // Only add if timestamp is different (new data)
          if (!lastEntry || lastEntry.timestamp !== device.lastUpdated) {
            const newHistory = [
              ...deviceHistory,
              {
                timestamp: device.lastUpdated,
                data: device.lastData
              }
            ].slice(-50); // Keep last 50 entries
            
            return {
              ...prev,
              [device.id]: newHistory
            };
          }
          
          return prev;
        });
      }
    });
  }, [devices]);

  const getChartData = (device) => {
    const history = dataHistory[device.id] || [];
    if (history.length === 0) return null;

    const dataKeys = Object.keys(history[0].data || {});
    if (dataKeys.length === 0) return null;

    const timestamps = history.map(entry => 
      new Date(entry.timestamp).toLocaleTimeString()
    );

    const series = dataKeys.map(key => ({
      name: key,
      type: 'line',
      smooth: true,
      data: history.map(entry => entry.data[key] || 0),
      connectNulls: false
    }));

    return {
      title: {
        text: `${device.name} - Data Trends`,
        left: 'center',
        textStyle: { fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: dataKeys,
        bottom: 0,
        textStyle: { fontSize: 10 }
      },
      xAxis: {
        type: 'category',
        data: timestamps,
        axisLabel: { fontSize: 10 }
      },
      yAxis: {
        type: 'value',
        axisLabel: { fontSize: 10 }
      },
      series: series,
      grid: {
        left: '10%',
        right: '10%',
        top: '15%',
        bottom: '20%'
      }
    };
  };

  const exportDeviceData = (device) => {
    const history = dataHistory[device.id] || [];
    const exportData = {
      device: {
        id: device.id,
        name: device.name,
        protocol: device.protocol,
        host: device.host,
        port: device.port
      },
      dataHistory: history,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${device.name.replace(/\s+/g, '_')}_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-gray-600 bg-gray-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProtocolColor = (protocol) => {
    switch (protocol) {
      case 'modbus': return 'bg-blue-100 text-blue-800';
      case 'bacnet': return 'bg-green-100 text-green-800';
      case 'snmp': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDataValue = (value) => {
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    return value?.toString() || 'N/A';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiDatabase} className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Device Data Monitor</h2>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4 text-gray-500" />
            <label className="text-sm text-gray-600">Auto Refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
            <span>Refresh</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <SafeIcon icon={FiFilter} className="w-5 h-5" />
                <span>Devices ({devices.length})</span>
              </h3>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {devices.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <SafeIcon icon={FiDatabase} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No devices configured</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {devices.map((device) => (
                    <motion.div
                      key={device.id}
                      whileHover={{ backgroundColor: '#f9fafb' }}
                      onClick={() => setSelectedDevice(device)}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedDevice?.id === device.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">{device.name}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(device.status)}`}>
                          {device.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs rounded ${getProtocolColor(device.protocol)}`}>
                          {device.protocol.toUpperCase()}
                        </span>
                        <span>{device.host}:{device.port}</span>
                      </div>
                      
                      {device.lastUpdated && (
                        <p className="text-xs text-gray-400 mt-1">
                          Last update: {formatDistanceToNow(new Date(device.lastUpdated), { addSuffix: true })}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="lg:col-span-2">
          {selectedDevice ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDevice.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Device Info Header */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{selectedDevice.name}</h3>
                      <p className="text-sm text-gray-600">{selectedDevice.description}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedDevice.status)}`}>
                        {selectedDevice.status}
                      </span>
                      
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => exportDeviceData(selectedDevice)}
                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
                      >
                        <SafeIcon icon={FiDownload} className="w-4 h-4" />
                        <span>Export</span>
                      </motion.button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Protocol:</span>
                      <p className="font-medium">{selectedDevice.protocol.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Address:</span>
                      <p className="font-medium">{selectedDevice.host}:{selectedDevice.port}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Poll Interval:</span>
                      <p className="font-medium">{selectedDevice.pollInterval || 5000}ms</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Last Update:</span>
                      <p className="font-medium">
                        {selectedDevice.lastUpdated 
                          ? new Date(selectedDevice.lastUpdated).toLocaleTimeString()
                          : 'Never'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Current Data */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                    <SafeIcon icon={FiEye} className="w-5 h-5" />
                    <span>Current Data</span>
                  </h4>
                  
                  {selectedDevice.lastData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(selectedDevice.lastData).map(([key, value]) => (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gray-50 rounded-lg p-4"
                        >
                          <div className="text-sm text-gray-600 mb-1">{key}</div>
                          <div className="text-xl font-semibold text-gray-900">
                            {formatDataValue(value)}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <SafeIcon icon={FiDatabase} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No data available</p>
                      {selectedDevice.status === 'error' && selectedDevice.lastError && (
                        <p className="text-red-600 text-sm mt-2">Error: {selectedDevice.lastError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Data Chart */}
                {getChartData(selectedDevice) && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                      <SafeIcon icon={FiTrendingUp} className="w-5 h-5" />
                      <span>Data Trends</span>
                    </h4>
                    
                    <ReactECharts
                      option={getChartData(selectedDevice)}
                      style={{ height: '300px' }}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Data History Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Recent Data History</h4>
                  
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Timestamp
                          </th>
                          {selectedDevice.lastData && Object.keys(selectedDevice.lastData).map(key => (
                            <th key={key} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(dataHistory[selectedDevice.id] || []).slice(-10).reverse().map((entry, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {new Date(entry.timestamp).toLocaleString()}
                            </td>
                            {Object.values(entry.data).map((value, valueIndex) => (
                              <td key={valueIndex} className="px-4 py-2 text-sm text-gray-900">
                                {formatDataValue(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {(!dataHistory[selectedDevice.id] || dataHistory[selectedDevice.id].length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No data history available</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <SafeIcon icon={FiEye} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Device</h3>
              <p className="text-gray-600">Choose a device from the list to view its data</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default Data;