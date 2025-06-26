import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import DeviceTemplates from './DeviceTemplates';

const { FiX, FiSave, FiTemplate } = FiIcons;

function DeviceModal({ isOpen, onClose, device }) {
  const { addDevice, updateDevice } = useGateway();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    protocol: 'modbus',
    host: '',
    port: '',
    deviceId: '',
    registers: '',
    mqttTopic: '',
    pollInterval: 5000
  });
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({ ...device });
    } else {
      setFormData({
        name: '',
        description: '',
        protocol: 'modbus',
        host: '',
        port: '',
        deviceId: '',
        registers: '',
        mqttTopic: '',
        pollInterval: 5000
      });
    }
  }, [device, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const deviceData = {
      ...formData,
      id: device?.id || Date.now().toString(),
      status: 'offline',
      lastUpdated: null
    };

    if (device) {
      updateDevice(deviceData);
    } else {
      addDevice(deviceData);
    }
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getDefaultPort = (protocol) => {
    switch (protocol) {
      case 'modbus': return '502';
      case 'bacnet': return '47808';
      case 'snmp': return '161';
      default: return '';
    }
  };

  const handleProtocolChange = (e) => {
    const protocol = e.target.value;
    setFormData(prev => ({
      ...prev,
      protocol,
      port: getDefaultPort(protocol)
    }));
  };

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      protocol: template.protocol,
      port: template.port,
      deviceId: template.deviceId,
      registers: template.registers,
      pollInterval: template.pollInterval
    }));
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {device ? 'Edit Device' : 'Add New Device'}
            </h3>
            <div className="flex items-center space-x-2">
              {!device && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTemplates(true)}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
                >
                  <SafeIcon icon={FiTemplate} className="w-4 h-4" />
                  <span>Templates</span>
                </motion.button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protocol
              </label>
              <select
                name="protocol"
                value={formData.protocol}
                onChange={handleProtocolChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="modbus">Modbus TCP</option>
                <option value="bacnet">BACnet/IP</option>
                <option value="snmp">SNMP</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host/IP Address
                </label>
                <input
                  type="text"
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  name="port"
                  value={formData.port}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device ID / Unit ID
              </label>
              <input
                type="text"
                name="deviceId"
                value={formData.deviceId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registers/Points (comma-separated)
              </label>
              <input
                type="text"
                name="registers"
                value={formData.registers}
                onChange={handleChange}
                placeholder="e.g., 40001,40002,40003"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MQTT Topic
              </label>
              <input
                type="text"
                name="mqttTopic"
                value={formData.mqttTopic}
                onChange={handleChange}
                placeholder="e.g., devices/sensor1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poll Interval (ms)
              </label>
              <input
                type="number"
                name="pollInterval"
                value={formData.pollInterval}
                onChange={handleChange}
                min="1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                <span>{device ? 'Update' : 'Add'} Device</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>

      {/* Device Templates Modal */}
      <DeviceTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </AnimatePresence>
  );
}

export default DeviceModal;