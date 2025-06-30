import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import DeviceTemplates from './DeviceTemplates';
import BACnetDiscovery from './BACnetDiscovery';

const { FiX, FiSave, FiTemplate, FiPlus, FiTrash2, FiInfo, FiSearch } = FiIcons;

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
      retries: 3
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
  const [showModbusHelper, setShowModbusHelper] = useState(false);

  useEffect(() => {
    if (device) {
      setFormData({
        ...device,
        modbusConfig: device.modbusConfig || {
          functions: [],
          timeout: 3000,
          retries: 3
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
          retries: 3
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

    // Generate registers string from Modbus functions if protocol is Modbus
    let finalRegisters = formData.registers;
    if (formData.protocol === 'modbus' && formData.modbusConfig.functions.length > 0) {
      finalRegisters = formData.modbusConfig.functions
        .map(func => `${func.functionCode}:${func.startAddress}:${func.quantity}`)
        .join(',');
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
    setFormData(prev => ({
      ...prev,
      ...deviceConfig,
      bacnetConfig: deviceConfig.bacnetConfig || prev.bacnetConfig
    }));
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
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
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

                  {/* BACnet Discovery Button - Always visible when protocol is BACnet */}
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
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.protocol === 'modbus' ? 'Unit ID' : 'Device ID'}
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

            {/* BACnet-specific Configuration */}
            {formData.protocol === 'bacnet' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">BACnet Configuration</h4>
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
                            <span className="font-medium">{obj.name}</span>
                            <span className="text-gray-500">
                              {obj.type} ({obj.instance}) - {obj.units}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Modbus-specific Configuration */}
            {formData.protocol === 'modbus' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-gray-900">Modbus Functions</h4>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowModbusHelper(!showModbusHelper)}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      <SafeIcon icon={FiInfo} className="w-4 h-4 inline mr-1" />
                      Help
                    </button>
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
                </div>

                {/* Modbus Help Panel */}
                {showModbusHelper && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                  >
                    <h5 className="font-semibold text-blue-900 mb-2">Modbus Address Ranges</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                      <div>
                        <p><strong>Coils (FC 01, 05, 15):</strong> 00001-09999</p>
                        <p><strong>Discrete Inputs (FC 02):</strong> 10001-19999</p>
                      </div>
                      <div>
                        <p><strong>Input Registers (FC 04):</strong> 30001-39999</p>
                        <p><strong>Holding Registers (FC 03, 06, 16):</strong> 40001-49999</p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Modbus Functions List */}
                <div className="space-y-3">
                  {formData.modbusConfig.functions.map((func, index) => (
                    <motion.div
                      key={func.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Function
                          </label>
                          <select
                            value={func.functionCode}
                            onChange={(e) => updateModbusFunction(func.id, 'functionCode', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          >
                            {READ_FUNCTIONS.map(code => {
                              const funcInfo = getFunctionInfo(code);
                              return (
                                <option key={code} value={code}>
                                  FC{code.toString().padStart(2, '0')} - {funcInfo.name}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Address
                          </label>
                          <input
                            type="number"
                            value={func.startAddress}
                            onChange={(e) => updateModbusFunction(func.id, 'startAddress', parseInt(e.target.value))}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm ${
                              validateModbusAddress(func.functionCode, func.startAddress)
                                ? 'border-gray-300'
                                : 'border-red-300 bg-red-50'
                            }`}
                            min="1"
                            max="49999"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            value={func.quantity}
                            onChange={(e) => updateModbusFunction(func.id, 'quantity', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                            min="1"
                            max="125"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            value={func.name}
                            onChange={(e) => updateModbusFunction(func.id, 'name', e.target.value)}
                            placeholder="e.g., Temperature"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                          />
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => removeModbusFunction(func.id)}
                            className="w-full bg-red-100 text-red-600 px-3 py-2 rounded-md hover:bg-red-200 transition-colors text-sm"
                          >
                            <SafeIcon icon={FiTrash2} className="w-4 h-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      {/* Function Description and Sample Addresses */}
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-start justify-between text-xs text-gray-600">
                          <div>
                            <p><strong>Description:</strong> {getFunctionInfo(func.functionCode)?.description}</p>
                            {!validateModbusAddress(func.functionCode, func.startAddress) && (
                              <p className="text-red-600 mt-1">
                                ⚠️ Invalid address for this function. Expected range: {getFunctionInfo(func.functionCode)?.addressPrefix}0001-{getFunctionInfo(func.functionCode)?.addressPrefix}9999
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p><strong>Sample addresses:</strong></p>
                            <p>{generateSampleAddresses(func.functionCode).join(', ')}</p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {formData.modbusConfig.functions.length === 0 && (
                    <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="mb-2">No Modbus functions configured</p>
                      <p className="text-sm">Add functions to specify what data to read from the device</p>
                    </div>
                  )}
                </div>

                {/* Modbus Advanced Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (ms)
                    </label>
                    <input
                      type="number"
                      value={formData.modbusConfig.timeout}
                      onChange={(e) => handleModbusConfigChange('timeout', parseInt(e.target.value))}
                      min="1000"
                      max="10000"
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
                      min="0"
                      max="5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Non-Modbus and Non-BACnet Configuration */}
            {formData.protocol !== 'modbus' && formData.protocol !== 'bacnet' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.protocol === 'snmp' ? 'OIDs' : 'Object IDs'} (comma-separated)
                </label>
                <input
                  type="text"
                  name="registers"
                  value={formData.registers}
                  onChange={handleChange}
                  placeholder={formData.protocol === 'snmp' ? 'e.g., 1.3.6.1.2.1.1.1.0' : 'e.g., 1,2,3,4,5'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
    </AnimatePresence>
  );
}

export default DeviceModal;