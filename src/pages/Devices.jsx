import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import DeviceModal from '../components/DeviceModal';
import DeviceTemplates from '../components/DeviceTemplates';

const { FiPlus, FiEdit2, FiTrash2, FiWifi, FiWifiOff, FiAlertCircle, FiTemplate } = FiIcons;

function Devices() {
  const { devices, deleteDevice, addDevice } = useGateway();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const handleEdit = (device) => {
    setEditingDevice(device);
    setIsModalOpen(true);
  };

  const handleDelete = (deviceId) => {
    if (confirm('Are you sure you want to delete this device?')) {
      deleteDevice(deviceId);
    }
  };

  const handleTemplateSelect = (template) => {
    // Create a new device from template
    const deviceData = {
      ...template,
      id: Date.now().toString(),
      status: 'offline',
      lastUpdated: null,
      host: '', // User needs to fill this
      name: template.name, // Keep template name as starting point
      lastError: null,
      lastData: null
    };
    
    // Add device and then open edit modal for host configuration
    addDevice(deviceData);
    setEditingDevice(deviceData);
    setIsModalOpen(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'online': return { icon: FiWifi, color: 'text-green-500' };
      case 'offline': return { icon: FiWifiOff, color: 'text-gray-500' };
      case 'error': return { icon: FiAlertCircle, color: 'text-red-500' };
      default: return { icon: FiWifiOff, color: 'text-gray-500' };
    }
  };

  const getProtocolBadge = (protocol) => {
    const colors = {
      'modbus': 'bg-blue-100 text-blue-800',
      'bacnet': 'bg-green-100 text-green-800',
      'snmp': 'bg-purple-100 text-purple-800'
    };
    return colors[protocol] || 'bg-gray-100 text-gray-800';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Device Management</h2>
        <div className="flex items-center space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTemplates(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
          >
            <SafeIcon icon={FiTemplate} className="w-4 h-4" />
            <span>Templates</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditingDevice(null);
              setIsModalOpen(true);
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Device</span>
          </motion.button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Protocol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <AnimatePresence>
                {devices.map((device) => {
                  const statusIcon = getStatusIcon(device.status);
                  return (
                    <motion.tr
                      key={device.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{device.name}</div>
                          <div className="text-sm text-gray-500">{device.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getProtocolBadge(device.protocol)}`}>
                          {device.protocol.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {device.host}:{device.port}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <SafeIcon icon={statusIcon.icon} className={`w-4 h-4 mr-2 ${statusIcon.color}`} />
                          <span className="text-sm text-gray-900 capitalize">{device.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {device.lastUpdated ? new Date(device.lastUpdated).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(device)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(device.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
          
          {devices.length === 0 && (
            <div className="text-center py-12">
              <SafeIcon icon={FiTemplate} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No devices configured</h3>
              <p className="text-gray-600 mb-4">Get started by adding a device or using a template</p>
              <div className="flex justify-center space-x-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowTemplates(true)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors"
                >
                  <SafeIcon icon={FiTemplate} className="w-4 h-4" />
                  <span>Browse Templates</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setEditingDevice(null);
                    setIsModalOpen(true);
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
                >
                  <SafeIcon icon={FiPlus} className="w-4 h-4" />
                  <span>Add Device</span>
                </motion.button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Device Modal */}
      <DeviceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDevice(null);
        }}
        device={editingDevice}
      />

      {/* Device Templates Modal */}
      <DeviceTemplates
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
      />
    </motion.div>
  );
}

export default Devices;