import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiRefreshCw, FiEye, FiPlus, FiInfo, FiSearch, FiFilter, FiDownload, FiTarget } = FiIcons;

// BACnet object type mappings
const BACNET_OBJECT_TYPES = {
  0: 'analog-input',
  1: 'analog-output',
  2: 'analog-value',
  3: 'binary-input',
  4: 'binary-output',
  5: 'binary-value',
  8: 'device',
  13: 'multi-state-input',
  14: 'multi-state-output',
  19: 'multi-state-value',
  20: 'notification-class',
  21: 'program',
  23: 'schedule',
  25: 'structured-view',
  30: 'trend-log'
};

const OBJECT_TYPE_ICONS = {
  'analog-input': '📊',
  'analog-output': '📈',
  'analog-value': '📉',
  'binary-input': '🔘',
  'binary-output': '🔴',
  'binary-value': '⚫',
  'multi-state-input': '🎛️',
  'multi-state-output': '🎮',
  'multi-state-value': '🎯',
  'device': '💻',
  'notification-class': '🔔',
  'program': '⚙️',
  'schedule': '📅',
  'structured-view': '📋',
  'trend-log': '📈',
  'default': '📄'
};

function BACnetObjectBrowser({ isOpen, onClose, device, onObjectsSelect }) {
  const [objectList, setObjectList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedObjects, setSelectedObjects] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [readResult, setReadResult] = useState(null);

  useEffect(() => {
    if (isOpen && device) {
      loadObjectList();
    }
  }, [isOpen, device]);

  const loadObjectList = async () => {
    if (!device || !device.host) {
      setError('Device host/address is required for BACnet object discovery');
      setObjectList([]);
      return;
    }

    setLoading(true);
    setError('');
    setReadResult(null);

    try {
      console.log('Loading object list for device:', device);
      
      if (window.socketInstance && window.socketInstance.connected) {
        console.log('Socket connected, requesting object list...');
        
        // Create device config for BACnet discovery
        const deviceConfig = {
          deviceId: device.deviceId || '1001',
          address: device.host,
          port: parseInt(device.port) || 47808,
          networkNumber: device.bacnetConfig?.networkNumber || 0,
          timeout: 20000 // Increased timeout
        };

        console.log('Sending readBacnetObjectList with config:', deviceConfig);

        // Set up response handler
        const handleObjectListResponse = (response) => {
          console.log('Received BACnet read object list response:', response);
          setLoading(false);
          
          if (response.success) {
            const objects = response.objects || [];
            console.log('Objects received:', objects.length);
            setObjectList(objects);
            setReadResult({
              success: true,
              method: response.method,
              deviceInfo: response.deviceInfo,
              objectCount: objects.length
            });
            
            if (objects.length === 0) {
              setError('No objects found on device. Device may not support object enumeration or may be offline.');
            }
          } else {
            console.error('Object list request failed:', response.error);
            setError(response.error || 'Failed to read object list');
            
            // Still show fallback objects if provided
            const fallbackObjects = response.objects || [];
            setObjectList(fallbackObjects);
            setReadResult({
              success: false,
              method: response.method,
              error: response.error,
              objectCount: fallbackObjects.length
            });
          }
        };

        // Set up one-time listener
        window.socketInstance.once('bacnetReadObjectListResponse', handleObjectListResponse);

        // Send request using the new dedicated endpoint
        window.socketInstance.emit('readBacnetObjectList', deviceConfig);

        // Set timeout
        setTimeout(() => {
          if (loading) {
            console.log('Request timeout, removing listener');
            window.socketInstance.off('bacnetReadObjectListResponse', handleObjectListResponse);
            setLoading(false);
            setError('Request timeout. Device may be offline or not responding.');
            // Provide some demo objects so UI can still work
            setObjectList([
              {
                objectType: 'analog-input',
                instance: 0,
                objectName: 'Demo Temperature',
                description: '[TIMEOUT FALLBACK] Demo temperature sensor - Real device did not respond',
                units: 'degrees-celsius',
                presentValue: 22.5,
                reliability: 'no-fault-detected',
                isTimeoutFallback: true
              }
            ]);
          }
        }, 25000); // 25 second timeout
      } else {
        console.warn('Socket not connected, using demo objects');
        setError('No server connection. Please check if the server is running.');
        setObjectList([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading object list:', error);
      setError('Error loading object list: ' + error.message);
      setObjectList([]);
      setLoading(false);
    }
  };

  const handleObjectToggle = (object) => {
    setSelectedObjects(prev => {
      const isSelected = prev.some(obj => 
        obj.instance === object.instance && obj.objectType === object.objectType
      );
      
      if (isSelected) {
        return prev.filter(obj => 
          !(obj.instance === object.instance && obj.objectType === object.objectType)
        );
      } else {
        return [...prev, object];
      }
    });
  };

  const handleSelectAll = () => {
    const filtered = getFilteredObjects();
    setSelectedObjects(filtered);
  };

  const handleDeselectAll = () => {
    setSelectedObjects([]);
  };

  const getFilteredObjects = () => {
    return objectList.filter(obj => {
      const matchesType = filterType === 'all' || obj.objectType === filterType;
      const matchesSearch = obj.objectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          obj.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesSearch;
    });
  };

  const getObjectIcon = (objectType) => {
    return OBJECT_TYPE_ICONS[objectType] || OBJECT_TYPE_ICONS.default;
  };

  const getObjectTypeColor = (objectType) => {
    const colors = {
      'analog-input': 'bg-blue-100 text-blue-800',
      'analog-output': 'bg-green-100 text-green-800',
      'analog-value': 'bg-purple-100 text-purple-800',
      'binary-input': 'bg-orange-100 text-orange-800',
      'binary-output': 'bg-red-100 text-red-800',
      'binary-value': 'bg-pink-100 text-pink-800',
      'multi-state-input': 'bg-yellow-100 text-yellow-800',
      'multi-state-output': 'bg-indigo-100 text-indigo-800',
      'multi-state-value': 'bg-teal-100 text-teal-800',
      'device': 'bg-gray-100 text-gray-800'
    };
    return colors[objectType] || 'bg-gray-100 text-gray-800';
  };

  const handleUseSelected = () => {
    if (selectedObjects.length === 0) {
      alert('Please select at least one object.');
      return;
    }
    onObjectsSelect(selectedObjects);
    onClose();
  };

  const exportObjectList = () => {
    const exportData = {
      device: {
        name: device.name,
        deviceId: device.deviceId,
        address: device.host,
        port: device.port
      },
      readResult: readResult,
      objectList: objectList,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${device.name.replace(/\s+/g, '_')}_objects.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const uniqueObjectTypes = [...new Set(objectList.map(obj => obj.objectType))];
  const filteredObjects = getFilteredObjects();

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
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiTarget} className="w-6 h-6 text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">BACnet Object Browser</h3>
                <p className="text-sm text-gray-600">{device?.name} - {device?.host}:{device?.port}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!loading && objectList.length > 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={exportObjectList}
                  className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
                >
                  <SafeIcon icon={FiDownload} className="w-4 h-4" />
                  <span>Export</span>
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={loadObjectList}
                disabled={loading}
                className="bg-primary-100 text-primary-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-primary-200 transition-colors text-sm disabled:opacity-50"
              >
                <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Read Objects</span>
              </motion.button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <SafeIcon icon={FiX} className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Connection Status */}
            {!window.socketInstance?.connected && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <SafeIcon icon={FiInfo} className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-900 mb-1">Server Connection Required</h4>
                    <p className="text-sm text-red-800">
                      BACnet object browsing requires a connection to the gateway server. Please ensure the server is running and refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Read Result Status */}
            {readResult && (
              <div className={`mb-4 border rounded-lg p-4 ${
                readResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start space-x-3">
                  <SafeIcon 
                    icon={readResult.success ? FiTarget : FiInfo} 
                    className={`w-5 h-5 mt-0.5 ${readResult.success ? 'text-green-600' : 'text-yellow-600'}`} 
                  />
                  <div className="flex-1">
                    <h4 className={`text-sm font-medium mb-1 ${
                      readResult.success ? 'text-green-900' : 'text-yellow-900'
                    }`}>
                      {readResult.success ? 'Object List Read Successful' : 'Object List Read Failed'}
                    </h4>
                    <div className={`text-sm ${
                      readResult.success ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      <p>Method: <strong>{readResult.method}</strong></p>
                      <p>Objects Found: <strong>{readResult.objectCount}</strong></p>
                      {readResult.deviceInfo && (
                        <p>Device: <strong>{readResult.deviceInfo.deviceName || readResult.deviceInfo.deviceId}</strong></p>
                      )}
                      {readResult.error && (
                        <p className="mt-1">Error: {readResult.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <SafeIcon icon={FiRefreshCw} className="w-8 h-8 mx-auto mb-4 animate-spin text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Reading BACnet Object List</h3>
                <p className="text-gray-600">Discovering available objects on the BACnet device...</p>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Device: {device?.host}:{device?.port}</p>
                  <p>This may take up to 25 seconds...</p>
                  <p className="mt-2">Trying multiple discovery methods:</p>
                  <ul className="text-xs mt-1 space-y-1">
                    <li>• BACnet command-line tools</li>
                    <li>• Direct BACnet protocol communication</li>
                    <li>• Device verification via WHO-IS/I-AM</li>
                    <li>• Python BACpypes library</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <SafeIcon icon={FiInfo} className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-yellow-900 mb-1">Discovery Notice</h4>
                    <p className="text-sm text-yellow-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Search */}
            {!loading && objectList.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SafeIcon icon={FiSearch} className="w-5 h-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search objects by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-500" />
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="all">All Types</option>
                        {uniqueObjectTypes.map(type => (
                          <option key={type} value={type}>
                            {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {selectedObjects.length} of {filteredObjects.length} objects selected
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      Select All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={handleDeselectAll}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Object List */}
            {!loading && objectList.length > 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredObjects.map((object, index) => {
                    const isSelected = selectedObjects.some(obj => 
                      obj.instance === object.instance && obj.objectType === object.objectType
                    );

                    return (
                      <motion.div
                        key={`${object.objectType}-${object.instance}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                        onClick={() => handleObjectToggle(object)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getObjectIcon(object.objectType)}</span>
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900">{object.objectName}</h5>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getObjectTypeColor(object.objectType)}`}>
                                  {object.objectType.replace('-', ' ')}
                                </span>
                                <span className="text-xs text-gray-500">Instance: {object.instance}</span>
                                {/* Show data source indicators */}
                                {object.isDemoData && (
                                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">DEMO</span>
                                )}
                                {object.isRealObject && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">REAL</span>
                                )}
                                {object.isTimeoutFallback && (
                                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">TIMEOUT</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleObjectToggle(object)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>

                        {object.description && (
                          <p className="text-sm text-gray-600 mb-2">{object.description}</p>
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {object.presentValue !== undefined && (
                            <div>
                              <span className="text-gray-500">Present Value:</span>
                              <div className="font-medium">
                                {typeof object.presentValue === 'number' ? 
                                  object.presentValue.toFixed(2) : 
                                  object.presentValue?.toString()
                                }
                                {object.units && object.units !== 'no-units' && (
                                  <span className="text-gray-500 ml-1">
                                    {object.units.replace('-', ' ')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {object.reliability && (
                            <div>
                              <span className="text-gray-500">Reliability:</span>
                              <div className="font-medium text-green-600">
                                {object.reliability.replace('-', ' ')}
                              </div>
                            </div>
                          )}

                          {object.stateText && (
                            <div className="col-span-2">
                              <span className="text-gray-500">States:</span>
                              <div className="font-medium">
                                {object.stateText.join(', ')}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUseSelected}
                    disabled={selectedObjects.length === 0}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <SafeIcon icon={FiPlus} className="w-4 h-4" />
                    <span>Use Selected ({selectedObjects.length})</span>
                  </motion.button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && objectList.length === 0 && !error && (
              <div className="text-center py-12">
                <SafeIcon icon={FiEye} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Objects Found</h3>
                <p className="text-gray-600 mb-4">
                  No objects were discovered on this BACnet device.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={loadObjectList}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors mx-auto"
                >
                  <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                  <span>Try Again</span>
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BACnetObjectBrowser;