import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiSearch, FiRefreshCw, FiWifi, FiX, FiPlus, FiInfo, FiMapPin, FiHardDrive, FiAlertTriangle } = FiIcons;

function BACnetDiscovery({ isOpen, onClose, onDeviceSelect }) {
  const [scanning, setScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [scanProgress, setScanProgress] = useState(0);
  const [selectedNetwork, setSelectedNetwork] = useState('local');
  const [customNetwork, setCustomNetwork] = useState('192.168.1.0/24');
  const [error, setError] = useState('');
  const [scanSettings, setScanSettings] = useState({
    timeout: 5000,
    maxDevices: 50,
    includeObjects: true
  });

  // Real BACnet device discovery
  const startDiscovery = async () => {
    if (!window.socketInstance) {
      setError('No connection to server. Please check if the server is running.');
      return;
    }

    setScanning(true);
    setScanProgress(0);
    setDiscoveredDevices([]);
    setError('');

    try {
      // Prepare discovery options
      const discoveryOptions = {
        networkRange: selectedNetwork === 'custom' ? customNetwork : selectedNetwork,
        timeout: scanSettings.timeout,
        maxDevices: scanSettings.maxDevices,
        includeObjects: scanSettings.includeObjects
      };

      console.log('Starting BACnet discovery with options:', discoveryOptions);

      // Start progress simulation
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, scanSettings.timeout / 10);

      // Send discovery request to server
      window.socketInstance.emit('bacnetDiscover', discoveryOptions);

      // Listen for discovery results
      const handleDiscoveryResult = (result) => {
        clearInterval(progressInterval);
        setScanProgress(100);
        setScanning(false);

        if (result.success) {
          console.log('Discovery successful:', result.devices);
          setDiscoveredDevices(result.devices || []);
          if (result.devices.length === 0) {
            setError('No BACnet devices found on the network. Make sure devices are online and accessible.');
          }
        } else {
          console.error('Discovery failed:', result.error);
          setError(result.error || 'Discovery failed. Please check network settings and try again.');
        }
      };

      // Set up one-time listener for the result
      window.socketInstance.once('bacnetDiscoveryResult', handleDiscoveryResult);

      // Set timeout for discovery
      setTimeout(() => {
        clearInterval(progressInterval);
        if (scanning) {
          setScanning(false);
          setScanProgress(100);
          window.socketInstance.off('bacnetDiscoveryResult', handleDiscoveryResult);
          if (discoveredDevices.length === 0) {
            setError('Discovery timeout. No devices responded within the specified time.');
          }
        }
      }, scanSettings.timeout + 2000);

    } catch (error) {
      setScanning(false);
      setScanProgress(0);
      setError('Failed to start discovery: ' + error.message);
      console.error('Discovery error:', error);
    }
  };

  const handleDeviceSelect = (device) => {
    // Create device configuration from discovered device
    const deviceConfig = {
      name: device.deviceName || device.name,
      description: device.description || `${device.vendorName} ${device.modelName}`,
      protocol: 'bacnet',
      host: device.address,
      port: device.port.toString(),
      deviceId: device.deviceId,
      registers: device.objectList ? device.objectList.slice(0, 10).map((obj, index) => index + 1).join(',') : '1,2,3,4,5',
      pollInterval: 10000,
      bacnetConfig: {
        networkNumber: device.networkNumber || 0,
        macAddress: device.macAddress || '',
        maxApduLength: device.maxApduLength || 1476,
        segmentationSupported: device.segmentationSupported || 'segmented-both',
        vendorId: device.vendorName || device.vendorId || '',
        modelName: device.modelName || '',
        firmwareRevision: device.firmwareRevision || '',
        applicationSoftwareVersion: device.applicationSoftwareVersion || '',
        objectList: device.objectList || []
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Connection Status */}
            {!window.socketInstance && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900 mb-2">Server Connection Required</h4>
                    <p className="text-sm text-red-800">
                      BACnet discovery requires a connection to the gateway server. Please ensure the server is running and refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                    <option value="local">Local Network (Auto)</option>
                    <option value="broadcast">Global Broadcast</option>
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
                    Timeout (seconds)
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
                    <option value={30000}>30 seconds</option>
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
                  disabled={scanning || !window.socketInstance}
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
                    <span>Scanning network for BACnet devices...</span>
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

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4"
                >
                  <div className="flex items-start space-x-3">
                    <SafeIcon icon={FiAlertTriangle} className="w-5 h-5 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-900 mb-1">Discovery Error</h4>
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
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

              {discoveredDevices.length === 0 && !scanning && !error ? (
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
                        key={device.deviceId || device.id}
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
                              <h5 className="font-semibold text-gray-900">
                                {device.deviceName || device.name}
                              </h5>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {device.description || `${device.vendorName || ''} ${device.modelName || ''}`.trim()}
                            </p>
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center space-x-1">
                                <SafeIcon icon={FiMapPin} className="w-3 h-3" />
                                <span>{device.address}:{device.port}</span>
                              </span>
                              <span>ID: {device.deviceId}</span>
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
                          {device.vendorName && (
                            <div className="flex items-center justify-between">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getVendorColor(device.vendorName)}`}>
                                {device.vendorName}
                              </span>
                              {device.modelName && (
                                <span className="text-xs text-gray-500">{device.modelName}</span>
                              )}
                            </div>
                          )}

                          {device.firmwareRevision && device.applicationSoftwareVersion && (
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>
                                <span className="font-medium">Firmware:</span> {device.firmwareRevision}
                              </div>
                              <div>
                                <span className="font-medium">Software:</span> {device.applicationSoftwareVersion}
                              </div>
                            </div>
                          )}

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
                                    <span>{getObjectTypeIcon(obj.objectType || obj.type)}</span>
                                    <span className="font-medium">
                                      {obj.objectName || obj.name}
                                    </span>
                                    <span className="text-gray-500">
                                      ({obj.objectType || obj.type})
                                    </span>
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
                    <p>• Ensure your computer and BACnet devices are on the same network segment</p>
                    <p>• Some devices may require specific network configuration or routing</p>
                    <p>• Increase timeout for slower networks or devices</p>
                    <p>• Object list discovery provides detailed device information but takes longer</p>
                    <p>• Check device documentation for BACnet/IP configuration requirements</p>
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