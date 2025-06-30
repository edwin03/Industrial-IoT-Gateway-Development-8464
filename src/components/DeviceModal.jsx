import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import DeviceTemplates from './DeviceTemplates';
import BACnetDiscovery from './BACnetDiscovery';
import BACnetObjectBrowser from './BACnetObjectBrowser';

const { FiX, FiSave, FiTemplate, FiPlus, FiTrash2, FiInfo, FiSearch, FiEye, FiSettings } = FiIcons;

// Modbus function codes and their descriptions
const MODBUS_FUNCTIONS = [
  { code: 1, name: 'Read Coils', description: 'Read discrete outputs (00001-09999)', addressPrefix: '0' },
  { code: 2, name: 'Read Discrete Inputs', description: 'Read discrete inputs (10001-19999)', addressPrefix: '1' },
  { code: 3, name: 'Read Holding Registers', description: 'Read analog outputs (40001-49999)', addressPrefix: '4' },
  { code: 4, name: 'Read Input Registers', description: 'Read analog inputs (30001-39999)', addressPrefix: '3' },
  { code: 5, name: 'Write Single Coil', description: 'Write single discrete output', addressPrefix: '0' },
  { code: 6, name: 'Write Single Register', description: 'Write single analog output', addressPrefix: '4' },
  { code: 15, name: 'Write Multiple Coils', description: 'Write multiple discrete outputs', addressPrefix: '0' },
  { code: 16, name: 'Write Multiple Registers', description: 'Write multiple analog outputs', addressPrefix: '4' }
];

const READ_FUNCTIONS = [1, 2, 3, 4];

// Common scaling presets
const SCALING_PRESETS = [
  { name: 'No Scaling', multiplier: 1, offset: 0, decimals: 0, unit: '' },
  { name: 'Temperature (°C)', multiplier: 0.1, offset: 0, decimals: 1, unit: '°C' },
  { name: 'Temperature (°F)', multiplier: 0.1, offset: 32, decimals: 1, unit: '°F' },
  { name: 'Pressure (kPa)', multiplier: 0.1, offset: 0, decimals: 1, unit: 'kPa' },
  { name: 'Flow (L/min)', multiplier: 0.01, offset: 0, decimals: 2, unit: 'L/min' },
  { name: 'Percentage (%)', multiplier: 0.01, offset: 0, decimals: 1, unit: '%' },
  { name: 'Voltage (V)', multiplier: 0.001, offset: 0, decimals: 3, unit: 'V' },
  { name: 'Current (A)', multiplier: 0.001, offset: 0, decimals: 3, unit: 'A' },
  { name: 'Power (W)', multiplier: 1, offset: 0, decimals: 0, unit: 'W' },
  { name: 'Energy (kWh)', multiplier: 0.001, offset: 0, decimals: 3, unit: 'kWh' }
];

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
    pollInterval: 5000,
    modbusConfig: {
      functions: [],
      timeout: 3000,
      retries: 3,
      scaling: [] // New scaling configuration
    },
    bacnetConfig: {
      networkNumber: 0,
      macAddress: '',
      maxApduLength: 1476,
      segmentationSupported: 'segmented-both',
      vendorId: '',
      objectList: []
    }
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBACnetDiscovery, setShowBACnetDiscovery] = useState(false);
  const [showBACnetObjectBrowser, setShowBACnetObjectBrowser] = useState(false);
  const [showModbusHelper, setShowModbusHelper] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({
        ...device,
        modbusConfig: device.modbusConfig || {
          functions: [],
          timeout: 3000,
          retries: 3,
          scaling: []
        },
        bacnetConfig: device.bacnetConfig || {
          networkNumber: 0,
          macAddress: '',
          maxApduLength: 1476,
          segmentationSupported: 'segmented-both',
          vendorId: '',
          objectList: []
        }
      });
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
        pollInterval: 5000,
        modbusConfig: {
          functions: [],
          timeout: 3000,
          retries: 3,
          scaling: []
        },
        bacnetConfig: {
          networkNumber: 0,
          macAddress: '',
          maxApduLength: 1476,
          segmentationSupported: 'segmented-both',
          vendorId: '',
          objectList: []
        }
      });
    }
  }, [device, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.host || !formData.port) {
      alert('Please fill in all required fields (Name, Host, Port)');
      return;
    }

    // Generate registers string from Modbus functions if protocol is Modbus
    let finalRegisters = formData.registers;
    if (formData.protocol === 'modbus' && formData.modbusConfig.functions.length > 0) {
      finalRegisters = formData.modbusConfig.functions
        .map(func => `${func.functionCode}:${func.startAddress}:${func.quantity}`)
        .join(',');
    }

    // For BACnet, if no registers specified, use object instances from objectList
    if (formData.protocol === 'bacnet' && !finalRegisters && formData.bacnetConfig.objectList.length > 0) {
      finalRegisters = formData.bacnetConfig.objectList
        .map((obj, index) => obj.instance !== undefined ? obj.instance : index)
        .slice(0, 10) // Limit to first 10 objects
        .join(',');
    }

    // Default registers for protocols if none specified
    if (!finalRegisters) {
      switch (formData.protocol) {
        case 'modbus':
          finalRegisters = '40001,40002,40003,40004,40005';
          break;
        case 'bacnet':
          finalRegisters = '0,1,2,3,4';
          break;
        case 'snmp':
          finalRegisters = '1.3.6.1.2.1.1.1.0,1.3.6.1.2.1.1.3.0';
          break;
        default:
          finalRegisters = '1,2,3,4,5';
      }
    }

    const deviceData = {
      ...formData,
      registers: finalRegisters,
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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleModbusConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      modbusConfig: {
        ...prev.modbusConfig,
        [field]: value
      }
    }));
  };

  const handleBACnetConfigChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      bacnetConfig: {
        ...prev.bacnetConfig,
        [field]: value
      }
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

  const handleTemplateSelect = (template) => {
    setFormData(prev => ({
      ...prev,
      name: template.name,
      description: template.description,
      protocol: template.protocol,
      port: template.port,
      deviceId: template.deviceId,
      registers: template.registers,
      pollInterval: template.pollInterval,
      modbusConfig: template.modbusConfig || prev.modbusConfig,
      bacnetConfig: template.bacnetConfig || prev.bacnetConfig
    }));
  };

  const handleBACnetDeviceSelect = (deviceConfig) => {
    console.log('BACnet device selected:', deviceConfig);
    setFormData(prev => ({
      ...prev,
      ...deviceConfig,
      bacnetConfig: deviceConfig.bacnetConfig || prev.bacnetConfig
    }));
    setShowBACnetDiscovery(false);
  };

  const handleBACnetObjectsSelect = (selectedObjects) => {
    console.log('BACnet objects selected:', selectedObjects);
    
    // Update object list in BACnet config
    const updatedBACnetConfig = {
      ...formData.bacnetConfig,
      objectList: selectedObjects
    };

    // Generate registers string from selected objects
    const registers = selectedObjects.map(obj => obj.instance).join(',');

    setFormData(prev => ({
      ...prev,
      registers: registers,
      bacnetConfig: updatedBACnetConfig
    }));

    setShowBACnetObjectBrowser(false);
  };

  const addModbusFunction = () => {
    const newFunction = {
      id: Date.now(),
      functionCode: 3,
      startAddress: 40001,
      quantity: 1,
      name: 'Register'
    };

    handleModbusConfigChange('functions', [
      ...formData.modbusConfig.functions,
      newFunction
    ]);
  };

  const removeModbusFunction = (id) => {
    handleModbusConfigChange('functions',
      formData.modbusConfig.functions.filter(func => func.id !== id)
    );
  };

  const updateModbusFunction = (id, field, value) => {
    handleModbusConfigChange('functions',
      formData.modbusConfig.functions.map(func =>
        func.id === id ? { ...func, [field]: value } : func
      )
    );
  };

  // Scaling configuration functions
  const addScalingConfig = () => {
    const newScaling = {
      id: Date.now(),
      register: '',
      name: '',
      multiplier: 1,
      offset: 0,
      decimals: 2,
      unit: '',
      enabled: true
    };

    handleModbusConfigChange('scaling', [
      ...formData.modbusConfig.scaling,
      newScaling
    ]);
  };

  const removeScalingConfig = (id) => {
    handleModbusConfigChange('scaling',
      formData.modbusConfig.scaling.filter(scale => scale.id !== id)
    );
  };

  const updateScalingConfig = (id, field, value) => {
    handleModbusConfigChange('scaling',
      formData.modbusConfig.scaling.map(scale =>
        scale.id === id ? { ...scale, [field]: value } : scale
      )
    );
  };

  const applyScalingPreset = (scalingId, preset) => {
    updateScalingConfig(scalingId, 'multiplier', preset.multiplier);
    updateScalingConfig(scalingId, 'offset', preset.offset);
    updateScalingConfig(scalingId, 'decimals', preset.decimals);
    updateScalingConfig(scalingId, 'unit', preset.unit);
  };

  const getAvailableRegisters = () => {
    const registers = new Set();
    
    // From functions
    formData.modbusConfig.functions.forEach(func => {
      for (let i = 0; i < func.quantity; i++) {
        registers.add((func.startAddress + i).toString());
      }
    });

    // From legacy registers string
    if (formData.registers) {
      formData.registers.split(',').forEach(reg => {
        const regNum = reg.trim();
        if (regNum && !regNum.includes(':')) {
          registers.add(regNum);
        }
      });
    }

    return Array.from(registers).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getFunctionInfo = (functionCode) => {
    return MODBUS_FUNCTIONS.find(f => f.code === functionCode);
  };

  const validateModbusAddress = (functionCode, address) => {
    const func = getFunctionInfo(functionCode);
    if (!func) return false;

    const addressNum = parseInt(address);
    const prefix = func.addressPrefix;
    const expectedStart = parseInt(prefix + '0001');
    const expectedEnd = parseInt(prefix + '9999');

    return addressNum >= expectedStart && addressNum <= expectedEnd;
  };

  const generateSampleAddresses = (functionCode) => {
    const func = getFunctionInfo(functionCode);
    if (!func) return [];

    const prefix = func.addressPrefix;
    return [
      `${prefix}0001`,
      `${prefix}0010`,
      `${prefix}0100`,
      `${prefix}1000`
    ];
  };

  const calculateScaledValue = (rawValue, scaling) => {
    if (!scaling.enabled) return rawValue;
    const scaled = (rawValue * scaling.multiplier) + scaling.offset;
    return parseFloat(scaled.toFixed(scaling.decimals));
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
          className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {device ? 'Edit Device' : 'Add New Device'}
            </h3>
            <div className="flex items-center space-x-2">
              {!device && (
                <>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowTemplates(true)}
                    className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
                  >
                    <SafeIcon icon={FiTemplate} className="w-4 h-4" />
                    <span>Templates</span>
                  </motion.button>
                  {formData.protocol === 'bacnet' && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowBACnetDiscovery(true)}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <SafeIcon icon={FiSearch} className="w-4 h-4" />
                      <span>Discover BACnet</span>
                    </motion.button>
                  )}
                </>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Name *
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

            {/* BACnet Discovery Button in Form */}
            {formData.protocol === 'bacnet' && !device && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-3">
                    <SafeIcon icon={FiInfo} className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <h5 className="text-sm font-medium text-green-900 mb-1">BACnet Device Discovery</h5>
                      <p className="text-sm text-green-800">
                        Automatically find and configure BACnet devices on your network
                      </p>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowBACnetDiscovery(true)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors font-medium"
                  >
                    <SafeIcon icon={FiSearch} className="w-5 h-5" />
                    <span>Start Discovery</span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Connection Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Host/IP Address *
                </label>
                <input
                  type="text"
                  name="host"
                  value={formData.host}
                  onChange={handleChange}
                  required
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port *
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
                  {formData.protocol === 'modbus' ? 'Unit ID' : 'Device ID'}
                </label>
                <input
                  type="text"
                  name="deviceId"
                  value={formData.deviceId}
                  onChange={handleChange}
                  placeholder={formData.protocol === 'snmp' ? 'public' : '1'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Modbus-specific Configuration */}
            {formData.protocol === 'modbus' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Modbus Configuration</h4>
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowModbusHelper(!showModbusHelper)}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-blue-200 transition-colors text-sm"
                  >
                    <SafeIcon icon={FiSettings} className="w-4 h-4" />
                    <span>Advanced Config</span>
                  </motion.button>
                </div>

                {/* Modbus Functions */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Modbus Functions
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addModbusFunction}
                      className="bg-primary-600 text-white px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors text-sm"
                    >
                      <SafeIcon icon={FiPlus} className="w-4 h-4" />
                      <span>Add Function</span>
                    </motion.button>
                  </div>

                  {formData.modbusConfig.functions.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <SafeIcon icon={FiSettings} className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600 mb-2">No Modbus functions configured</p>
                      <p className="text-sm text-gray-500">Add functions to specify which registers to read</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.modbusConfig.functions.map((func) => (
                        <div key={func.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Function Code
                              </label>
                              <select
                                value={func.functionCode}
                                onChange={(e) => updateModbusFunction(func.id, 'functionCode', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                {MODBUS_FUNCTIONS.filter(f => READ_FUNCTIONS.includes(f.code)).map(f => (
                                  <option key={f.code} value={f.code}>
                                    FC{f.code} - {f.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Start Address
                              </label>
                              <input
                                type="number"
                                value={func.startAddress}
                                onChange={(e) => updateModbusFunction(func.id, 'startAddress', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                value={func.quantity}
                                onChange={(e) => updateModbusFunction(func.id, 'quantity', parseInt(e.target.value))}
                                min="1"
                                max="125"
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Name
                              </label>
                              <input
                                type="text"
                                value={func.name}
                                onChange={(e) => updateModbusFunction(func.id, 'name', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                            </div>
                            <div className="flex items-end">
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => removeModbusFunction(func.id)}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Remove function"
                              >
                                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Value Scaling Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Value Scaling Configuration
                    </label>
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addScalingConfig}
                      className="bg-green-600 text-white px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors text-sm"
                    >
                      <SafeIcon icon={FiPlus} className="w-4 h-4" />
                      <span>Add Scaling</span>
                    </motion.button>
                  </div>

                  {formData.modbusConfig.scaling.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <SafeIcon icon={FiSettings} className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-600 mb-2">No scaling configured</p>
                      <p className="text-sm text-gray-500">Add scaling to convert raw values to engineering units</p>
                      <div className="mt-3 text-xs text-gray-500">
                        <p>Formula: Scaled Value = (Raw Value × Multiplier) + Offset</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formData.modbusConfig.scaling.map((scaling) => (
                        <div key={scaling.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Basic Configuration */}
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Register/Address
                                  </label>
                                  <select
                                    value={scaling.register}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'register', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  >
                                    <option value="">Select Register</option>
                                    {getAvailableRegisters().map(reg => (
                                      <option key={reg} value={reg}>{reg}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Display Name
                                  </label>
                                  <input
                                    type="text"
                                    value={scaling.name}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'name', e.target.value)}
                                    placeholder="e.g., Temperature"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Multiplier
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={scaling.multiplier}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'multiplier', parseFloat(e.target.value))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Offset
                                  </label>
                                  <input
                                    type="number"
                                    step="any"
                                    value={scaling.offset}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'offset', parseFloat(e.target.value))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Decimals
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={scaling.decimals}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'decimals', parseInt(e.target.value))}
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-700 mb-1">
                                    Unit
                                  </label>
                                  <input
                                    type="text"
                                    value={scaling.unit}
                                    onChange={(e) => updateScalingConfig(scaling.id, 'unit', e.target.value)}
                                    placeholder="e.g., °C, %, kW"
                                    className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  />
                                </div>
                                <div className="flex items-center space-x-2">
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={scaling.enabled}
                                      onChange={(e) => updateScalingConfig(scaling.id, 'enabled', e.target.checked)}
                                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span className="ml-2 text-xs text-gray-700">Enabled</span>
                                  </label>
                                  <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => removeScalingConfig(scaling.id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Remove scaling"
                                  >
                                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                                  </motion.button>
                                </div>
                              </div>
                            </div>

                            {/* Presets and Preview */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Quick Presets
                                </label>
                                <select
                                  onChange={(e) => {
                                    const preset = SCALING_PRESETS.find(p => p.name === e.target.value);
                                    if (preset) applyScalingPreset(scaling.id, preset);
                                  }}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                                  defaultValue=""
                                >
                                  <option value="">Select preset...</option>
                                  {SCALING_PRESETS.map(preset => (
                                    <option key={preset.name} value={preset.name}>
                                      {preset.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="bg-white border border-gray-200 rounded p-3">
                                <div className="text-xs font-medium text-gray-700 mb-2">Formula & Preview</div>
                                <div className="text-xs text-gray-600 mb-2">
                                  Scaled = (Raw × {scaling.multiplier}) + {scaling.offset}
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Raw: 1000</span>
                                    <span className="font-medium">
                                      → {calculateScaledValue(1000, scaling)} {scaling.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Raw: 2500</span>
                                    <span className="font-medium">
                                      → {calculateScaledValue(2500, scaling)} {scaling.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Raw: 5000</span>
                                    <span className="font-medium">
                                      → {calculateScaledValue(5000, scaling)} {scaling.unit}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Advanced Settings */}
                {showModbusHelper && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Timeout (ms)
                        </label>
                        <input
                          type="number"
                          value={formData.modbusConfig.timeout}
                          onChange={(e) => handleModbusConfigChange('timeout', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Retries
                        </label>
                        <input
                          type="number"
                          value={formData.modbusConfig.retries}
                          onChange={(e) => handleModbusConfigChange('retries', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {/* BACnet-specific Configuration */}
            {formData.protocol === 'bacnet' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">BACnet Configuration</h4>
                  {formData.host && formData.port && (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowBACnetObjectBrowser(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors font-medium"
                    >
                      <SafeIcon icon={FiEye} className="w-4 h-4" />
                      <span>Browse Objects</span>
                    </motion.button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Network Number
                    </label>
                    <input
                      type="number"
                      value={formData.bacnetConfig.networkNumber}
                      onChange={(e) => handleBACnetConfigChange('networkNumber', parseInt(e.target.value))}
                      min="0"
                      max="65535"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      MAC Address (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.bacnetConfig.macAddress}
                      onChange={(e) => handleBACnetConfigChange('macAddress', e.target.value)}
                      placeholder="e.g., 10:20:30:40:50:60"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max APDU Length
                    </label>
                    <select
                      value={formData.bacnetConfig.maxApduLength}
                      onChange={(e) => handleBACnetConfigChange('maxApduLength', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={50}>50 bytes</option>
                      <option value={128}>128 bytes</option>
                      <option value={206}>206 bytes</option>
                      <option value={480}>480 bytes</option>
                      <option value={1024}>1024 bytes</option>
                      <option value={1476}>1476 bytes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Segmentation Support
                    </label>
                    <select
                      value={formData.bacnetConfig.segmentationSupported}
                      onChange={(e) => handleBACnetConfigChange('segmentationSupported', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="segmented-both">Both</option>
                      <option value="segmented-transmit">Transmit Only</option>
                      <option value="segmented-receive">Receive Only</option>
                      <option value="no-segmentation">No Segmentation</option>
                    </select>
                  </div>
                </div>

                {formData.bacnetConfig.vendorId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={formData.bacnetConfig.vendorId}
                      onChange={(e) => handleBACnetConfigChange('vendorId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      readOnly
                    />
                  </div>
                )}

                {/* Object List Display */}
                {formData.bacnetConfig.objectList && formData.bacnetConfig.objectList.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Discovered Objects ({formData.bacnetConfig.objectList.length})
                    </label>
                    <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                      <div className="space-y-1">
                        {formData.bacnetConfig.objectList.map((obj, index) => (
                          <div key={index} className="text-sm flex items-center justify-between">
                            <span className="font-medium">{obj.objectName || obj.name}</span>
                            <span className="text-gray-500">
                              {obj.objectType || obj.type} ({obj.instance}) - {obj.units}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Non-BACnet Configuration */}
            {formData.protocol !== 'bacnet' && formData.protocol !== 'modbus' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.protocol === 'snmp' ? 'OIDs' : 'Object IDs'} (comma-separated)
                </label>
                <input
                  type="text"
                  name="registers"
                  value={formData.registers}
                  onChange={handleChange}
                  placeholder={
                    formData.protocol === 'snmp' 
                      ? 'e.g., 1.3.6.1.2.1.1.1.0,1.3.6.1.2.1.1.3.0'
                      : 'e.g., 40001,40002,40003,40004,40005'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {/* Legacy Modbus Registers (if no functions configured) */}
            {formData.protocol === 'modbus' && formData.modbusConfig.functions.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Modbus Registers (comma-separated)
                </label>
                <input
                  type="text"
                  name="registers"
                  value={formData.registers}
                  onChange={handleChange}
                  placeholder="e.g., 40001,40002,40003,40004,40005"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use the "Add Function" button above for more advanced configuration with scaling.
                </p>
              </div>
            )}

            {/* BACnet Object IDs Configuration */}
            {formData.protocol === 'bacnet' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Object Instances (comma-separated)
                  </label>
                  {formData.host && formData.port && (
                    <button
                      type="button"
                      onClick={() => setShowBACnetObjectBrowser(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    >
                      <SafeIcon icon={FiEye} className="w-4 h-4" />
                      <span>Browse Objects</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  name="registers"
                  value={formData.registers}
                  onChange={handleChange}
                  placeholder="e.g., 0,1,2,3,4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Object instances to read. Use "Browse Objects" button to discover available objects on the device.
                </p>
              </div>
            )}

            {/* Common Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
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

      {/* BACnet Discovery Modal */}
      <BACnetDiscovery
        isOpen={showBACnetDiscovery}
        onClose={() => setShowBACnetDiscovery(false)}
        onDeviceSelect={handleBACnetDeviceSelect}
      />

      {/* BACnet Object Browser Modal */}
      <BACnetObjectBrowser
        isOpen={showBACnetObjectBrowser}
        onClose={() => setShowBACnetObjectBrowser(false)}
        device={formData}
        onObjectsSelect={handleBACnetObjectsSelect}
      />
    </AnimatePresence>
  );
}

export default DeviceModal;