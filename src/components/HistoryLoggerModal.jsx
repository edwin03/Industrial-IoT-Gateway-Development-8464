import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';

const { FiX, FiSave, FiClock, FiDatabase, FiInfo } = FiIcons;

const INTERVAL_OPTIONS = [
  { value: 1000, label: '1 second' },
  { value: 5000, label: '5 seconds' },
  { value: 10000, label: '10 seconds' },
  { value: 30000, label: '30 seconds' },
  { value: 60000, label: '1 minute' },
  { value: 300000, label: '5 minutes' },
  { value: 600000, label: '10 minutes' },
  { value: 1800000, label: '30 minutes' },
  { value: 3600000, label: '1 hour' }
];

function HistoryLoggerModal({ isOpen, onClose, logger = null, devices }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deviceId: '',
    dataPoints: [],
    interval: 60000,
    enabled: true,
    retentionDays: 30
  });
  
  const [availableDataPoints, setAvailableDataPoints] = useState([]);

  useEffect(() => {
    if (logger) {
      setFormData(logger);
    } else {
      setFormData({
        name: '',
        description: '',
        deviceId: '',
        dataPoints: [],
        interval: 60000,
        enabled: true,
        retentionDays: 30
      });
    }
  }, [logger, isOpen]);

  useEffect(() => {
    // Update available data points when device changes
    if (formData.deviceId) {
      const device = devices.find(d => d.id === formData.deviceId);
      if (device && device.lastData) {
        setAvailableDataPoints(Object.keys(device.lastData));
      } else {
        setAvailableDataPoints([]);
      }
    }
  }, [formData.deviceId, devices]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const loggerData = {
      ...formData,
      id: logger?.id || Date.now().toString(),
      createdAt: logger?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to localStorage
    const existingLoggers = JSON.parse(localStorage.getItem('historyLoggers') || '[]');
    let updatedLoggers;
    
    if (logger) {
      updatedLoggers = existingLoggers.map(l => l.id === logger.id ? loggerData : l);
    } else {
      updatedLoggers = [...existingLoggers, loggerData];
    }
    
    localStorage.setItem('historyLoggers', JSON.stringify(updatedLoggers));

    // Emit to server for real-time processing
    if (window.socketInstance) {
      window.socketInstance.emit('updateHistoryLoggers', updatedLoggers);
    }

    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDataPointToggle = (dataPoint) => {
    setFormData(prev => ({
      ...prev,
      dataPoints: prev.dataPoints.includes(dataPoint)
        ? prev.dataPoints.filter(p => p !== dataPoint)
        : [...prev.dataPoints, dataPoint]
    }));
  };

  const getSelectedDevice = () => {
    return devices.find(d => d.id === formData.deviceId);
  };

  const estimateStorageSize = () => {
    const selectedDevice = getSelectedDevice();
    if (!selectedDevice || formData.dataPoints.length === 0) return '0 MB/day';

    // Estimate: ~100 bytes per log entry (timestamp + data)
    const entriesPerDay = (24 * 60 * 60 * 1000) / formData.interval;
    const bytesPerDay = entriesPerDay * 100;
    const mbPerDay = bytesPerDay / (1024 * 1024);
    
    return `${mbPerDay.toFixed(2)} MB/day`;
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
          className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiDatabase} className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {logger ? 'Edit History Logger' : 'Create History Logger'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Basic Information</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logger Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., Temperature History"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Optional description of what this logger tracks"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device *
                </label>
                <select
                  value={formData.deviceId}
                  onChange={(e) => handleChange('deviceId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Device</option>
                  {onlineDevices.map(device => (
                    <option key={device.id} value={device.id}>
                      {device.name} ({device.protocol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Points Selection */}
            {formData.deviceId && availableDataPoints.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-md font-semibold text-gray-900">Data Points to Log</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
                  <div className="space-y-2">
                    {availableDataPoints.map(dataPoint => (
                      <label key={dataPoint} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.dataPoints.includes(dataPoint)}
                          onChange={() => handleDataPointToggle(dataPoint)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{dataPoint}</span>
                        {getSelectedDevice()?.lastData && (
                          <span className="text-xs text-gray-500">
                            (current: {getSelectedDevice().lastData[dataPoint]})
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
                {formData.dataPoints.length === 0 && (
                  <p className="text-sm text-yellow-600">
                    ⚠️ Please select at least one data point to log
                  </p>
                )}
              </div>
            )}

            {/* Logging Settings */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Logging Settings</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logging Interval
                  </label>
                  <select
                    value={formData.interval}
                    onChange={(e) => handleChange('interval', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {INTERVAL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention Period (days)
                  </label>
                  <input
                    type="number"
                    value={formData.retentionDays}
                    onChange={(e) => handleChange('retentionDays', parseInt(e.target.value))}
                    min="1"
                    max="365"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">Enable this logger</span>
                </label>
              </div>
            </div>

            {/* Storage Estimation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Storage Information</h4>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Estimated Storage:</strong> {estimateStorageSize()}</p>
                    <p><strong>Data Points:</strong> {formData.dataPoints.length} selected</p>
                    <p><strong>Retention:</strong> {formData.retentionDays} days</p>
                    <p><strong>Format:</strong> JSON Lines (.jsonl) format for efficient storage</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
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
                disabled={formData.dataPoints.length === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4" />
                <span>{logger ? 'Update' : 'Create'} Logger</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default HistoryLoggerModal;