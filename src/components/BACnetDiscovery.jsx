import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSearch, FiRefreshCw, FiWifi, FiX, FiPlus, FiInfo, FiMapPin, FiHardDrive } = FiIcons;

function BACnetDiscovery({ isOpen, onClose, onDeviceSelect }) {
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState('local');
  const [customNetwork, setCustomNetwork] = useState('192.168.1.0/24');
  const [scanSettings, setScanSettings] = useState({
    timeout: 5000,
    maxDevices: 50,
    includeObjects: true
  });

  // Simulated BACnet device discovery
  const simulatedDevices = [
    {
      id: '12345',
      name: 'HVAC Controller 1',
      description: 'Main Building HVAC System',
      address: '192.168.1.100',
      port: 47808,
      networkNumber: 0,
      macAddress: '10:20:30:40:50:01',
      vendor: 'Honeywell',
      modelName: 'Excel 5000',
      firmwareVersion: '2.1.3',
      applicationSoftwareVersion: '1.5.2',
      objectList: [
        { type: 'analog-input', instance: 0, name: 'Zone 1 Temperature', description: 'Zone 1 Room Temperature', units: 'degrees-celsius' },
        { type: 'analog-input', instance: 1, name: 'Zone 1 Humidity', description: 'Zone 1 Relative Humidity', units: 'percent' },
        { type: 'analog-output', instance: 0, name: 'Zone 1 Setpoint', description: 'Zone 1 Temperature Setpoint', units: 'degrees-celsius' },
        { type: 'binary-input', instance: 0, name: 'Zone 1 Occupancy', description: 'Zone 1 Occupancy Sensor', units: 'no-units' },
        { type: 'binary-output', instance: 0, name: 'Zone 1 Fan', description: 'Zone 1 Fan Control', units: 'no-units' }
      ]
    },
    {
      id: '23456',
      name: 'Lighting Controller',
      description: 'Floor 2 Lighting System',
      address: '192.168.1.101',
      port: 47808,
      networkNumber: 0,
      macAddress: '10:20:30:40:50:02',
      vendor: 'Johnson Controls',
      modelName: 'LightManager Pro',
      firmwareVersion: '3.2.1',
      applicationSoftwareVersion: '2.1.0',
      objectList: [
        { type: 'binary-output', instance: 0, name: 'Zone A Lights', description: 'Zone A Light Control', units: 'no-units' },
        { type: 'binary-output', instance: 1, name: 'Zone B Lights', description: 'Zone B Light Control', units: 'no-units' },
        { type: 'analog-output', instance: 0, name: 'Zone A Dimmer', description: 'Zone A Dimmer Level', units: 'percent' },
        { type: 'analog-input', instance: 0, name: 'Light Sensor', description: 'Ambient Light Level', units: 'lux' }
      ]
    },
    {
      id: '34567',
      name: 'Energy Meter',
      description: 'Main Electrical Panel Monitor',
      address: '192.168.1.102',
      port: 47808,
      networkNumber: 0,
      macAddress: '10:20:30:40:50:03',
      vendor: 'Schneider Electric',
      modelName: 'PowerLogic PM8000',
      firmwareVersion: '1.4.2',
      applicationSoftwareVersion: '4.1.1',
      objectList: [
        { type: 'analog-input', instance: 0, name: 'Total Power', description: 'Total Active Power', units: 'kilowatts' },
        { type: 'analog-input', instance: 1, name: 'Voltage L1', description: 'Line 1 Voltage', units: 'volts' },
        { type: 'analog-input', instance: 2, name: 'Current L1', description: 'Line 1 Current', units: 'amperes' },
        { type: 'analog-input', instance: 3, name: 'Power Factor', description: 'Total Power Factor', units: 'no-units' },
        { type: 'analog-input', instance: 4, name: 'Frequency', description: 'Line Frequency', units: 'hertz' }
      ]
    },
    {
      id: '45678',
      name: 'VAV Box Controller',
      description: 'Variable Air Volume Control',
      address: '192.168.1.103',
      port: 47808,
      networkNumber: 0,
      macAddress: '10:20:30:40:50:04',
      vendor: 'Trane',
      modelName: 'Tracer ZN510',
      firmwareVersion: '2.3.1',
      applicationSoftwareVersion: '1.8.3',
      objectList: [
        { type: 'analog-input', instance: 0, name: 'Room Temperature', description: 'Zone Temperature', units: 'degrees-celsius' },
        { type: 'analog-input', instance: 1, name: 'Airflow Rate', description: 'Current Airflow', units: 'cubic-feet-per-minute' },
        { type: 'analog-output', instance: 0, name: 'Damper Position', description: 'Damper Control Signal', units: 'percent' },
        { type: 'analog-output', instance: 1, name: 'Reheat Valve', description: 'Reheat Coil Valve Position', units: 'percent' }
      ]
    }
  ];

  const startDiscovery = async () => {
    setScanning(true);
    setScanProgress(0);
    setDiscoveredDevices([]);

    // Simulate progressive discovery
    const totalSteps = 20;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setScanProgress((i / totalSteps) * 100);

      // Add devices at different progress points
      if (i === 5) setDiscoveredDevices([simulatedDevices[0]]);
      if (i === 10) setDiscoveredDevices([...simulatedDevices.slice(0, 2)]);
      if (i === 15) setDiscoveredDevices([...simulatedDevices.slice(0, 3)]);
      if (i === 20) setDiscoveredDevices(simulatedDevices);
    }

    setScanning(false);
  };

  const handleDeviceSelect = (device) => {
    // Create device configuration from discovered device
    const deviceConfig = {
      name: device.name,
      description: device.description,
      protocol: 'bacnet',
      host: device.address,
      port: device.port.toString(),
      deviceId: device.id,
      registers: device.objectList.slice(0, 10).map((obj, index) => index + 1).join(','), // Use first 10 object instances
      pollInterval: 10000,
      bacnetConfig: {
        networkNumber: device.networkNumber,
        macAddress: device.macAddress,
        maxApduLength: 1476,
        segmentationSupported: 'segmented-both',
        vendorId: device.vendor,
        objectList: device.objectList
      }
    };

    onDeviceSelect(deviceConfig);
    onClose();
  };

  const getObjectTypeIcon = (type) => {
    switch (type) {
      case 'analog-input':
      case 'analog-output':
        return '📊';
      case 'binary-input':
      case 'binary-output':
        return '🔘';
      case 'multi-state-input':
      case 'multi-state-output':
        return '🎛️';
      default:
        return '📋';
    }
  };

  const getVendorColor = (vendor) => {
    const colors = {
      'Honeywell': 'bg-red-100 text-red-800',
      'Johnson Controls': 'bg-blue-100 text-blue-800',
      'Schneider Electric': 'bg-green-100 text-green-800',
      'Trane': 'bg-purple-100 text-purple-800',
      'Siemens': 'bg-yellow-100 text-yellow-800',
      'Carrier': 'bg-orange-100 text-orange-800'
    };
    return colors[vendor] || 'bg-gray-100 text-gray-800';
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
              <SafeIcon icon={FiSearch} className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">BACnet Device Discovery</h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Discovery Settings */}
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Discovery Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Network Range
                  </label>
                  <select
                    value={selectedNetwork}
                    onChange={(e) => setSelectedNetwork(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="local">Local Network</option>
                    <option value="broadcast">Broadcast (255.255.255.255)</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {selectedNetwork === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Network
                    </label>
                    <input
                      type="text"
                      value={customNetwork}
                      onChange={(e) => setCustomNetwork(e.target.value)}
                      placeholder="192.168.1.0/24"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timeout (ms)
                  </label>
                  <select
                    value={scanSettings.timeout}
                    onChange={(e) => setScanSettings(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={15000}>15 seconds</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Devices
                  </label>
                  <select
                    value={scanSettings.maxDevices}
                    onChange={(e) => setScanSettings(prev => ({ ...prev, maxDevices: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={10}>10 devices</option>
                    <option value={25}>25 devices</option>
                    <option value={50}>50 devices</option>
                    <option value={100}>100 devices</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={scanSettings.includeObjects}
                      onChange={(e) => setScanSettings(prev => ({ ...prev, includeObjects: e.target.checked }))}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Include Object List</span>
                  </label>
                </div>
              </div>

              {/* Start Discovery Button */}
              <div className="mt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startDiscovery}
                  disabled={scanning}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <SafeIcon 
                    icon={scanning ? FiRefreshCw : FiSearch} 
                    className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} 
                  />
                  <span>{scanning ? 'Discovering...' : 'Start Discovery'}</span>
                </motion.button>
              </div>

              {/* Progress Bar */}
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4"
                >
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                    <span>Scanning network...</span>
                    <span>{Math.round(scanProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scanProgress}%` }}
                      className="bg-primary-600 h-2 rounded-full"
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Discovery Results */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">
                  Discovered Devices ({discoveredDevices.length})
                </h4>
                {discoveredDevices.length > 0 && (
                  <span className="text-sm text-gray-500">
                    Click on a device to add it
                  </span>
                )}
              </div>

              {discoveredDevices.length === 0 && !scanning ? (
                <div className="text-center py-12 text-gray-500">
                  <SafeIcon icon={FiWifi} className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No devices discovered</p>
                  <p>Start a discovery scan to find BACnet devices on your network</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  <AnimatePresence>
                    {discoveredDevices.map((device, index) => (
                      <motion.div
                        key={device.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => handleDeviceSelect(device)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <SafeIcon icon={FiHardDrive} className="w-4 h-4 text-primary-600" />
                              <h5 className="font-semibold text-gray-900">{device.name}</h5>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{device.description}</p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <SafeIcon icon={FiMapPin} className="w-3 h-3" />
                                <span>{device.address}:{device.port}</span>
                              </span>
                              <span>ID: {device.id}</span>
                            </div>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeviceSelect(device);
                            }}
                            className="bg-primary-100 text-primary-700 p-2 rounded-lg hover:bg-primary-200 transition-colors"
                          >
                            <SafeIcon icon={FiPlus} className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {/* Device Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVendorColor(device.vendor)}`}>
                              {device.vendor}
                            </span>
                            <span className="text-xs text-gray-500">{device.modelName}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">Firmware:</span> {device.firmwareVersion}
                            </div>
                            <div>
                              <span className="font-medium">Software:</span> {device.applicationSoftwareVersion}
                            </div>
                          </div>

                          {/* Object List Preview */}
                          {device.objectList && device.objectList.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-gray-700">
                                  Objects ({device.objectList.length})
                                </span>
                              </div>
                              <div className="space-y-1">
                                {device.objectList.slice(0, 3).map((obj, objIndex) => (
                                  <div key={objIndex} className="flex items-center space-x-2 text-xs">
                                    <span>{getObjectTypeIcon(obj.type)}</span>
                                    <span className="font-medium">{obj.name}</span>
                                    <span className="text-gray-500">({obj.type})</span>
                                  </div>
                                ))}
                                {device.objectList.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{device.objectList.length - 3} more objects...
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Help Information */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">BACnet Discovery Tips</h5>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p>• Discovery uses WHO-IS broadcasts to find devices on the network</p>
                    <p>• Ensure your computer and BACnet devices are on the same network</p>
                    <p>• Some devices may require specific network configuration</p>
                    <p>• Discovery timeout affects how long to wait for device responses</p>
                    <p>• Object list discovery may take longer but provides more detail</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BACnetDiscovery;