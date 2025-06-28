import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import ReactECharts from 'echarts-for-react';

const { FiX, FiSave, FiBarChart3, FiTrendingUp, FiPieChart, FiActivity } = FiIcons;

const CHART_TYPES = [
  { id: 'line', name: 'Line Chart', icon: FiTrendingUp },
  { id: 'bar', name: 'Bar Chart', icon: FiBarChart3 },
  { id: 'pie', name: 'Pie Chart', icon: FiPieChart },
  { id: 'gauge', name: 'Gauge Chart', icon: FiActivity }
];

const COLOR_SCHEMES = [
  { name: 'Blue', colors: ['#3b82f6', '#1d4ed8', '#1e40af', '#1e3a8a'] },
  { name: 'Green', colors: ['#10b981', '#059669', '#047857', '#065f46'] },
  { name: 'Purple', colors: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6'] },
  { name: 'Orange', colors: ['#f59e0b', '#d97706', '#b45309', '#92400e'] },
  { name: 'Red', colors: ['#ef4444', '#dc2626', '#b91c1c', '#991b1b'] },
  { name: 'Rainbow', colors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'] }
];

function ChartBuilder({ isOpen, onClose, onSave, chart = null }) {
  const { devices } = useGateway();
  const [formData, setFormData] = useState({
    title: '',
    type: 'line',
    deviceIds: [],
    dataKeys: [],
    colorScheme: 'Blue',
    showLegend: true,
    showGrid: true,
    height: 300
  });

  const [availableDataKeys, setAvailableDataKeys] = useState([]);
  const [previewData, setPreviewData] = useState(null);

  useEffect(() => {
    if (chart) {
      setFormData(chart);
    } else {
      setFormData({
        title: '',
        type: 'line',
        deviceIds: [],
        dataKeys: [],
        colorScheme: 'Blue',
        showLegend: true,
        showGrid: true,
        height: 300
      });
    }
  }, [chart, isOpen]);

  useEffect(() => {
    // Update available data keys when selected devices change
    const keys = new Set();
    formData.deviceIds.forEach(deviceId => {
      const device = devices.find(d => d.id === deviceId);
      if (device && device.lastData) {
        Object.keys(device.lastData).forEach(key => keys.add(key));
      }
    });
    setAvailableDataKeys(Array.from(keys));
  }, [formData.deviceIds, devices]);

  useEffect(() => {
    // Generate preview data
    if (formData.deviceIds.length > 0 && formData.dataKeys.length > 0) {
      generatePreviewData();
    }
  }, [formData]);

  const generatePreviewData = () => {
    const selectedDevices = devices.filter(d => formData.deviceIds.includes(d.id));
    const colorScheme = COLOR_SCHEMES.find(c => c.name === formData.colorScheme);
    
    if (formData.type === 'pie') {
      // For pie charts, show current values
      const data = [];
      selectedDevices.forEach(device => {
        if (device.lastData) {
          formData.dataKeys.forEach(key => {
            if (device.lastData[key] !== undefined) {
              data.push({
                name: `${device.name} - ${key}`,
                value: Math.abs(device.lastData[key]) || 0
              });
            }
          });
        }
      });

      setPreviewData({
        title: { text: formData.title || 'Chart Preview', left: 'center' },
        tooltip: { trigger: 'item' },
        legend: formData.showLegend ? { bottom: 0, textStyle: { fontSize: 10 } } : {},
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
    } else if (formData.type === 'gauge') {
      // For gauge charts, show first selected data key from first device
      const device = selectedDevices[0];
      const dataKey = formData.dataKeys[0];
      const value = device?.lastData?.[dataKey] || 0;

      setPreviewData({
        title: { text: formData.title || 'Gauge Preview', left: 'center' },
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
      // For line and bar charts, simulate time series data
      const timestamps = Array.from({ length: 10 }, (_, i) => 
        new Date(Date.now() - (9 - i) * 60000).toLocaleTimeString()
      );

      const series = [];
      let colorIndex = 0;

      selectedDevices.forEach(device => {
        formData.dataKeys.forEach(key => {
          if (device.lastData && device.lastData[key] !== undefined) {
            const baseValue = device.lastData[key] || 0;
            series.push({
              name: `${device.name} - ${key}`,
              type: formData.type,
              data: timestamps.map(() => 
                Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.2)
              ),
              color: colorScheme.colors[colorIndex % colorScheme.colors.length],
              smooth: formData.type === 'line'
            });
            colorIndex++;
          }
        });
      });

      setPreviewData({
        title: { text: formData.title || 'Chart Preview', left: 'center' },
        tooltip: { trigger: 'axis' },
        legend: formData.showLegend ? { bottom: 0, textStyle: { fontSize: 10 } } : {},
        grid: formData.showGrid ? { left: '10%', right: '10%', top: '15%', bottom: '20%' } : {},
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const chartData = {
      ...formData,
      id: chart?.id || Date.now().toString(),
      createdAt: chart?.createdAt || new Date().toISOString()
    };
    onSave(chartData);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDeviceToggle = (deviceId) => {
    setFormData(prev => ({
      ...prev,
      deviceIds: prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter(id => id !== deviceId)
        : [...prev.deviceIds, deviceId],
      dataKeys: [] // Reset data keys when devices change
    }));
  };

  const handleDataKeyToggle = (key) => {
    setFormData(prev => ({
      ...prev,
      dataKeys: prev.dataKeys.includes(key)
        ? prev.dataKeys.filter(k => k !== key)
        : [...prev.dataKeys, key]
    }));
  };

  if (!isOpen) return null;

  const onlineDevices = devices.filter(d => d.status === 'online' && d.lastData);

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
            <h3 className="text-lg font-semibold text-gray-900">
              {chart ? 'Edit Chart' : 'Create Chart'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <div className="flex h-[600px]">
            {/* Configuration Panel */}
            <div className="w-1/2 p-6 border-r border-gray-200 overflow-y-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Enter chart title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {CHART_TYPES.map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => handleChange('type', type.id)}
                        className={`p-3 border rounded-lg flex items-center space-x-2 transition-colors ${
                          formData.type === type.id
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <SafeIcon icon={type.icon} className="w-4 h-4" />
                        <span className="text-sm">{type.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Devices ({formData.deviceIds.length} selected)
                  </label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md">
                    {onlineDevices.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500 text-center">
                        No online devices with data available
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {onlineDevices.map(device => (
                          <label key={device.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.deviceIds.includes(device.id)}
                              onChange={() => handleDeviceToggle(device.id)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">{device.name}</div>
                              <div className="text-xs text-gray-500">{device.protocol.toUpperCase()}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {availableDataKeys.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Data Points ({formData.dataKeys.length} selected)
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md">
                      <div className="divide-y divide-gray-200">
                        {availableDataKeys.map(key => (
                          <label key={key} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.dataKeys.includes(key)}
                              onChange={() => handleDataKeyToggle(key)}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-3 text-sm text-gray-900">{key}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color Scheme
                  </label>
                  <select
                    value={formData.colorScheme}
                    onChange={(e) => handleChange('colorScheme', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {COLOR_SCHEMES.map(scheme => (
                      <option key={scheme.name} value={scheme.name}>
                        {scheme.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart Height (px)
                  </label>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleChange('height', parseInt(e.target.value))}
                    min="200"
                    max="600"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.showLegend}
                      onChange={(e) => handleChange('showLegend', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Legend</span>
                  </label>
                  
                  {(formData.type === 'line' || formData.type === 'bar') && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.showGrid}
                        onChange={(e) => handleChange('showGrid', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Show Grid</span>
                    </label>
                  )}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    disabled={formData.deviceIds.length === 0 || formData.dataKeys.length === 0}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SafeIcon icon={FiSave} className="w-4 h-4" />
                    <span>{chart ? 'Update' : 'Create'} Chart</span>
                  </motion.button>
                </div>
              </form>
            </div>

            {/* Preview Panel */}
            <div className="w-1/2 p-6">
              <div className="h-full flex flex-col">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Preview</h4>
                <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  {previewData ? (
                    <ReactECharts
                      option={previewData}
                      style={{ height: `${formData.height}px` }}
                      className="w-full"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <SafeIcon icon={FiBarChart3} className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Select devices and data points to see preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default ChartBuilder;