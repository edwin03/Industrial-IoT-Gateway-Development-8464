import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';

const { FiX, FiSave, FiAlertTriangle, FiBell } = FiIcons;

const ALARM_TYPES = [
  { id: 'threshold', name: 'Threshold', description: 'Trigger when value crosses a threshold' },
  { id: 'range', name: 'Range', description: 'Trigger when value is outside a range' },
  { id: 'change', name: 'Change', description: 'Trigger when value changes by amount' },
  { id: 'status', name: 'Status', description: 'Trigger when device status changes' }
];

const CONDITION_OPERATORS = [
  { id: 'gt', name: '>', description: 'Greater than' },
  { id: 'gte', name: '≥', description: 'Greater than or equal' },
  { id: 'lt', name: '<', description: 'Less than' },
  { id: 'lte', name: '≤', description: 'Less than or equal' },
  { id: 'eq', name: '=', description: 'Equal to' },
  { id: 'ne', name: '≠', description: 'Not equal to' }
];

const SEVERITY_LEVELS = [
  { id: 'low', name: 'Low', color: 'bg-blue-100 text-blue-800' },
  { id: 'medium', name: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'high', name: 'High', color: 'bg-orange-100 text-orange-800' },
  { id: 'critical', name: 'Critical', color: 'bg-red-100 text-red-800' }
];

function AlarmModal({ isOpen, onClose, alarm = null, devices }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deviceId: '',
    dataKey: '',
    type: 'threshold',
    operator: 'gt',
    value: '',
    minValue: '',
    maxValue: '',
    changeAmount: '',
    severity: 'medium',
    enabled: true,
    emailNotification: true,
    cooldownPeriod: 300000, // 5 minutes
    conditions: []
  });

  const [availableDataKeys, setAvailableDataKeys] = useState([]);

  useEffect(() => {
    if (alarm) {
      setFormData(alarm);
    } else {
      setFormData({
        name: '',
        description: '',
        deviceId: '',
        dataKey: '',
        type: 'threshold',
        operator: 'gt',
        value: '',
        minValue: '',
        maxValue: '',
        changeAmount: '',
        severity: 'medium',
        enabled: true,
        emailNotification: true,
        cooldownPeriod: 300000,
        conditions: []
      });
    }
  }, [alarm, isOpen]);

  useEffect(() => {
    // Update available data keys when device changes
    if (formData.deviceId) {
      const device = devices.find(d => d.id === formData.deviceId);
      if (device && device.lastData) {
        setAvailableDataKeys(Object.keys(device.lastData));
      } else {
        setAvailableDataKeys([]);
      }
    }
  }, [formData.deviceId, devices]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const alarmData = {
      ...formData,
      id: alarm?.id || Date.now().toString(),
      createdAt: alarm?.createdAt || new Date().toISOString(),
      lastTriggered: alarm?.lastTriggered || null,
      triggerCount: alarm?.triggerCount || 0
    };
    
    // Save to localStorage
    const existingAlarms = JSON.parse(localStorage.getItem('deviceAlarms') || '[]');
    let updatedAlarms;
    
    if (alarm) {
      updatedAlarms = existingAlarms.map(a => a.id === alarm.id ? alarmData : a);
    } else {
      updatedAlarms = [...existingAlarms, alarmData];
    }
    
    localStorage.setItem('deviceAlarms', JSON.stringify(updatedAlarms));
    
    // Emit to server for real-time processing
    if (window.socketInstance) {
      window.socketInstance.emit('updateAlarms', updatedAlarms);
    }
    
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderConditionFields = () => {
    switch (formData.type) {
      case 'threshold':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operator
              </label>
              <select
                value={formData.operator}
                onChange={(e) => handleChange('operator', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CONDITION_OPERATORS.map(op => (
                  <option key={op.id} value={op.id}>
                    {op.name} - {op.description}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Threshold Value
              </label>
              <input
                type="number"
                step="any"
                value={formData.value}
                onChange={(e) => handleChange('value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
        );

      case 'range':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Value
              </label>
              <input
                type="number"
                step="any"
                value={formData.minValue}
                onChange={(e) => handleChange('minValue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Value
              </label>
              <input
                type="number"
                step="any"
                value={formData.maxValue}
                onChange={(e) => handleChange('maxValue', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
        );

      case 'change':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Change Amount (trigger when value changes by this amount)
            </label>
            <input
              type="number"
              step="any"
              value={formData.changeAmount}
              onChange={(e) => handleChange('changeAmount', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        );

      case 'status':
        return (
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              This alarm will trigger when the device status changes to offline or error.
              No additional configuration needed.
            </p>
          </div>
        );

      default:
        return null;
    }
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
              <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 text-orange-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {alarm ? 'Edit Alarm' : 'Create Alarm'}
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
                  Alarm Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="e.g., High Temperature Alert"
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
                  placeholder="Optional description of the alarm condition"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity Level
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {SEVERITY_LEVELS.map(level => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Alarm Type */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Alarm Type</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ALARM_TYPES.map(type => (
                  <motion.button
                    key={type.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleChange('type', type.id)}
                    className={`p-4 border rounded-lg text-left transition-colors ${
                      formData.type === type.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="font-medium">{type.name}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Data Point Selection */}
            {formData.deviceId && formData.type !== 'status' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data Point *
                </label>
                <select
                  value={formData.dataKey}
                  onChange={(e) => handleChange('dataKey', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required={formData.type !== 'status'}
                >
                  <option value="">Select Data Point</option>
                  {availableDataKeys.map(key => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Condition Configuration */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Condition</h4>
              {renderConditionFields()}
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900">Settings</h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cooldown Period (minutes)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={formData.cooldownPeriod / 60000}
                    onChange={(e) => handleChange('cooldownPeriod', parseInt(e.target.value) * 60000)}
                    min="1"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">
                    Minimum time between alarm triggers
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enabled}
                    onChange={(e) => handleChange('enabled', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable this alarm</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.emailNotification}
                    onChange={(e) => handleChange('emailNotification', e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Send email notifications</span>
                </label>
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
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4" />
                <span>{alarm ? 'Update' : 'Create'} Alarm</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AlarmModal;