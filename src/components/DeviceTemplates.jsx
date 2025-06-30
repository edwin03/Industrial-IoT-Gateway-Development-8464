import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiTemplate, FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiCopy } = FiIcons;

// Updated built-in device templates with Modbus functions
const DEFAULT_TEMPLATES = [
  {
    id: 'modbus_power_meter',
    name: 'Power Meter (Schneider PM3250)',
    description: 'Schneider Electric PM3250 power meter with voltage, current, and power readings',
    protocol: 'modbus',
    port: '502',
    deviceId: '1',
    registers: '',
    pollInterval: 5000,
    isBuiltIn: true,
    category: 'Energy',
    modbusConfig: {
      functions: [
        { id: 1, functionCode: 3, startAddress: 3027, quantity: 2, name: 'L1_Voltage' },
        { id: 2, functionCode: 3, startAddress: 3029, quantity: 2, name: 'L2_Voltage' },
        { id: 3, functionCode: 3, startAddress: 3031, quantity: 2, name: 'L3_Voltage' },
        { id: 4, functionCode: 3, startAddress: 3053, quantity: 2, name: 'L1_Current' },
        { id: 5, functionCode: 3, startAddress: 3055, quantity: 2, name: 'L2_Current' },
        { id: 6, functionCode: 3, startAddress: 3057, quantity: 2, name: 'L3_Current' },
        { id: 7, functionCode: 3, startAddress: 3059, quantity: 2, name: 'Total_Power' }
      ]
    }
  },
  {
    id: 'modbus_temp_sensor',
    name: 'Temperature Sensor (Modbus)',
    description: 'Generic temperature and humidity sensor',
    protocol: 'modbus',
    port: '502',
    deviceId: '1',
    registers: '',
    pollInterval: 10000,
    isBuiltIn: true,
    category: 'Environmental',
    modbusConfig: {
      functions: [
        { id: 1, functionCode: 4, startAddress: 30001, quantity: 1, name: 'Temperature' },
        { id: 2, functionCode: 4, startAddress: 30002, quantity: 1, name: 'Humidity' },
        { id: 3, functionCode: 4, startAddress: 30003, quantity: 1, name: 'Pressure' }
      ]
    }
  },
  {
    id: 'modbus_flow_meter',
    name: 'Flow Meter (ABB FlowMaster)',
    description: 'ABB FlowMaster water/gas flow measurement device',
    protocol: 'modbus',
    port: '502',
    deviceId: '1',
    registers: '',
    pollInterval: 5000,
    isBuiltIn: true,
    category: 'Utilities',
    modbusConfig: {
      functions: [
        { id: 1, functionCode: 3, startAddress: 40001, quantity: 2, name: 'Flow_Rate' },
        { id: 2, functionCode: 3, startAddress: 40003, quantity: 2, name: 'Total_Volume' },
        { id: 3, functionCode: 3, startAddress: 40005, quantity: 1, name: 'Temperature' },
        { id: 4, functionCode: 3, startAddress: 40006, quantity: 1, name: 'Pressure' }
      ]
    }
  },
  {
    id: 'modbus_vfd',
    name: 'Variable Frequency Drive',
    description: 'Generic VFD with speed, current, and status monitoring',
    protocol: 'modbus',
    port: '502',
    deviceId: '1',
    registers: '',
    pollInterval: 2000,
    isBuiltIn: true,
    category: 'Motor Control',
    modbusConfig: {
      functions: [
        { id: 1, functionCode: 3, startAddress: 40001, quantity: 1, name: 'Output_Frequency' },
        { id: 2, functionCode: 3, startAddress: 40002, quantity: 1, name: 'Output_Current' },
        { id: 3, functionCode: 3, startAddress: 40003, quantity: 1, name: 'Motor_Speed' },
        { id: 4, functionCode: 1, startAddress: 1, quantity: 8, name: 'Status_Bits' },
        { id: 5, functionCode: 3, startAddress: 40010, quantity: 1, name: 'DC_Bus_Voltage' }
      ]
    }
  },
  {
    id: 'snmp_switch',
    name: 'Network Switch (SNMP)',
    description: 'Standard network switch monitoring',
    protocol: 'snmp',
    port: '161',
    deviceId: 'public',
    registers: '1.3.6.1.2.1.1.1.0,1.3.6.1.2.1.1.3.0,1.3.6.1.2.1.2.2.1.10.1',
    pollInterval: 30000,
    isBuiltIn: true,
    category: 'Network'
  },
  {
    id: 'bacnet_hvac',
    name: 'HVAC Controller (BACnet)',
    description: 'Building automation HVAC controller',
    protocol: 'bacnet',
    port: '47808',
    deviceId: '1001',
    registers: '1,2,3,4,5',
    pollInterval: 15000,
    isBuiltIn: true,
    category: 'HVAC'
  },
  {
    id: 'snmp_ups',
    name: 'UPS System (SNMP)',
    description: 'Uninterruptible Power Supply monitoring',
    protocol: 'snmp',
    port: '161',
    deviceId: 'public',
    registers: '1.3.6.1.4.1.318.1.1.1.2.2.1.0,1.3.6.1.4.1.318.1.1.1.4.2.1.0',
    pollInterval: 60000,
    isBuiltIn: true,
    category: 'Power'
  }
];

function DeviceTemplates({ isOpen, onClose, onSelectTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    // Load templates from localStorage and merge with defaults
    const savedTemplates = localStorage.getItem('deviceTemplates');
    const customTemplates = savedTemplates ? JSON.parse(savedTemplates) : [];
    setTemplates([...DEFAULT_TEMPLATES, ...customTemplates]);
  }, []);

  const saveTemplates = (newTemplates) => {
    const customTemplates = newTemplates.filter(t => !t.isBuiltIn);
    localStorage.setItem('deviceTemplates', JSON.stringify(customTemplates));
    setTemplates(newTemplates);
  };

  const categories = ['All', ...new Set(templates.map(t => t.category))];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteTemplate = (templateId) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const newTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(newTemplates);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDuplicateTemplate = (template) => {
    const duplicated = {
      ...template,
      id: `custom_${Date.now()}`,
      name: `${template.name} (Copy)`,
      isBuiltIn: false
    };
    setEditingTemplate(duplicated);
    setShowCreateModal(true);
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
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiTemplate} className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">Device Templates</h3>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Create Template</span>
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
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {!template.isBuiltIn && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditTemplate(template);
                            }}
                            className="text-gray-400 hover:text-primary-600 p-1"
                          >
                            <SafeIcon icon={FiEdit2} className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(template.id);
                            }}
                            className="text-gray-400 hover:text-red-600 p-1"
                          >
                            <SafeIcon icon={FiTrash2} className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateTemplate(template);
                        }}
                        className="text-gray-400 hover:text-primary-600 p-1"
                        title="Duplicate template"
                      >
                        <SafeIcon icon={FiCopy} className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Template Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.protocol === 'modbus' ? 'bg-blue-100 text-blue-800' :
                        template.protocol === 'bacnet' ? 'bg-green-100 text-green-800' :
                        template.protocol === 'snmp' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {template.protocol.toUpperCase()}
                      </span>
                      <span className="text-gray-500">{template.category}</span>
                    </div>

                    {/* Show Modbus functions if available */}
                    {template.protocol === 'modbus' && template.modbusConfig?.functions && (
                      <div className="text-xs text-gray-600">
                        <p className="font-medium">Functions:</p>
                        <div className="space-y-1">
                          {template.modbusConfig.functions.slice(0, 3).map((func, index) => (
                            <p key={index}>
                              FC{func.functionCode.toString().padStart(2, '0')}: {func.name} ({func.startAddress}:{func.quantity})
                            </p>
                          ))}
                          {template.modbusConfig.functions.length > 3 && (
                            <p className="text-gray-500">+{template.modbusConfig.functions.length - 3} more...</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {template.isBuiltIn && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Built-in
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <SafeIcon icon={FiTemplate} className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No templates found matching your criteria</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Create/Edit Template Modal */}
      {showCreateModal && (
        <CreateTemplateModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
          template={editingTemplate}
          onSave={(template) => {
            if (editingTemplate && !editingTemplate.isBuiltIn) {
              // Update existing template
              const newTemplates = templates.map(t =>
                t.id === template.id ? template : t
              );
              saveTemplates(newTemplates);
            } else {
              // Create new template
              const newTemplate = {
                ...template,
                id: `custom_${Date.now()}`,
                isBuiltIn: false
              };
              saveTemplates([...templates, newTemplate]);
            }
            setShowCreateModal(false);
            setEditingTemplate(null);
          }}
        />
      )}
    </AnimatePresence>
  );
}

// Create Template Modal Component
function CreateTemplateModal({ isOpen, onClose, template, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    protocol: 'modbus',
    port: '502',
    deviceId: '',
    registers: '',
    pollInterval: 5000,
    category: 'Custom',
    modbusConfig: {
      functions: []
    }
  });

  useEffect(() => {
    if (template) {
      setFormData({ ...template });
    } else {
      setFormData({
        name: '',
        description: '',
        protocol: 'modbus',
        port: '502',
        deviceId: '',
        registers: '',
        pollInterval: 5000,
        category: 'Custom',
        modbusConfig: {
          functions: []
        }
      });
    }
  }, [template, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
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
            {template ? 'Edit Template' : 'Create Template'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <SafeIcon icon={FiX} className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
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
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={formData.category}
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
                Default Port
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Device ID
              </label>
              <input
                type="text"
                name="deviceId"
                value={formData.deviceId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {formData.protocol !== 'modbus' && (
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
          )}

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
              <span>{template ? 'Update' : 'Create'} Template</span>
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default DeviceTemplates;