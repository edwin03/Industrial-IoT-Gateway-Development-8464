import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { formatDistanceToNow } from 'date-fns';

const { FiServer, FiPlay, FiStop, FiCopy, FiRefreshCw, FiInfo, FiDatabase, FiActivity } = FiIcons;

function ModbusSlaveConfig({ settings, onUpdateSettings, socket }) {
  const [slaveSettings, setSlaveSettings] = useState({
    enabled: false,
    port: 5020,
    unitId: 1,
    autoStart: false
  });
  
  const [registerInfo, setRegisterInfo] = useState({
    mappings: [],
    totalRegisters: 0,
    isRunning: false,
    port: 5020,
    holdingRegisterRange: 'None',
    inputRegisterRange: 'None'
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (settings.modbusSlave) {
      setSlaveSettings(settings.modbusSlave);
    }
  }, [settings]);

  useEffect(() => {
    if (socket) {
      socket.on('modbusSlaveInfo', (info) => {
        setRegisterInfo(info);
        setIsRefreshing(false);
      });

      // Request initial info
      socket.emit('getModbusSlaveInfo');

      return () => {
        socket.off('modbusSlaveInfo');
      };
    }
  }, [socket]);

  const handleSettingChange = (field, value) => {
    const newSettings = { ...slaveSettings, [field]: value };
    setSlaveSettings(newSettings);
    
    onUpdateSettings({
      modbusSlave: newSettings
    });
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (socket) {
      socket.emit('getModbusSlaveInfo');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // Could add a toast notification here
    });
  };

  const copyRegisterMap = () => {
    const registerText = registerInfo.mappings.map(mapping => 
      `${mapping.holdingRegister}\t${mapping.inputRegister}\t${mapping.description}\t${mapping.scaledValue}\t${mapping.unit}`
    ).join('\n');
    
    const header = 'Holding Register\tInput Register\tDescription\tValue\tUnit\n';
    copyToClipboard(header + registerText);
  };

  const getStatusColor = (isRunning) => {
    return isRunning ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const formatValue = (originalValue, scaledValue, unit) => {
    if (typeof originalValue === 'number') {
      return `${originalValue.toFixed(2)} ${unit}`.trim();
    }
    return `${originalValue} ${unit}`.trim();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiServer} className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Modbus Slave Server</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(registerInfo.isRunning)}`}>
            {registerInfo.isRunning ? 'Running' : 'Stopped'}
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh register info"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              checked={slaveSettings.enabled}
              onChange={(e) => handleSettingChange('enabled', e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">Enable Modbus Slave</span>
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Port
          </label>
          <input
            type="number"
            value={slaveSettings.port}
            onChange={(e) => handleSettingChange('port', parseInt(e.target.value))}
            min="1024"
            max="65535"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unit ID
          </label>
          <input
            type="number"
            value={slaveSettings.unitId}
            onChange={(e) => handleSettingChange('unitId', parseInt(e.target.value))}
            min="1"
            max="247"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to Use Modbus Slave</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Enable the Modbus slave to allow external systems to poll device data</p>
              <p>• Device data is automatically mapped to Modbus registers</p>
              <p>• Holding registers (40001+): Read/Write access</p>
              <p>• Input registers (30001+): Read-only access</p>
              <p>• Values are scaled by 100 for integer storage (divide by 100 to get original value)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Information */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Connection</h4>
            <SafeIcon icon={FiActivity} className="w-4 h-4 text-gray-600" />
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Host: 0.0.0.0 (all interfaces)</p>
            <p>Port: {registerInfo.port}</p>
            <p>Unit ID: {slaveSettings.unitId}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Registers</h4>
            <SafeIcon icon={FiDatabase} className="w-4 h-4 text-gray-600" />
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Total: {registerInfo.totalRegisters}</p>
            <p>Holding: {registerInfo.holdingRegisterRange}</p>
            <p>Input: {registerInfo.inputRegisterRange}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">Status</h4>
            <SafeIcon 
              icon={registerInfo.isRunning ? FiPlay : FiStop} 
              className={`w-4 h-4 ${registerInfo.isRunning ? 'text-green-600' : 'text-red-600'}`} 
            />
          </div>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Server: {registerInfo.isRunning ? 'Running' : 'Stopped'}</p>
            <p>Enabled: {slaveSettings.enabled ? 'Yes' : 'No'}</p>
          </div>
        </div>
      </div>

      {/* Register Mappings Table */}
      {registerInfo.mappings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900">Register Mappings</h4>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={copyRegisterMap}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-lg flex items-center space-x-2 hover:bg-gray-200 transition-colors text-sm"
            >
              <SafeIcon icon={FiCopy} className="w-4 h-4" />
              <span>Copy Table</span>
            </motion.button>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Device
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Point
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Holding Register
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Input Register
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scaled Value
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {registerInfo.mappings.map((mapping, index) => (
                    <motion.tr
                      key={`${mapping.deviceId}-${mapping.dataKey}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {mapping.deviceName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {mapping.dataKey}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        <button
                          onClick={() => copyToClipboard(mapping.holdingRegister.toString())}
                          className="hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          title="Click to copy"
                        >
                          {mapping.holdingRegister}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">
                        <button
                          onClick={() => copyToClipboard(mapping.inputRegister.toString())}
                          className="hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                          title="Click to copy"
                        >
                          {mapping.inputRegister}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatValue(mapping.originalValue, mapping.scaledValue, mapping.unit)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-600">
                        {mapping.scaledValue}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {mapping.timestamp ? 
                          formatDistanceToNow(new Date(mapping.timestamp), { addSuffix: true }) : 
                          'Never'
                        }
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <SafeIcon icon={FiInfo} className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h5 className="text-sm font-medium text-yellow-900 mb-1">Example Modbus Client Code</h5>
                <div className="text-xs text-yellow-800 space-y-1 font-mono bg-yellow-100 p-2 rounded">
                  <p># Python example using pymodbus</p>
                  <p>from pymodbus.client.sync import ModbusTcpClient</p>
                  <p>client = ModbusTcpClient('your-gateway-ip', port={registerInfo.port})</p>
                  <p>result = client.read_holding_registers(40001, 10, unit={slaveSettings.unitId})</p>
                  <p>values = [v / 100.0 for v in result.registers]  # Scale back</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {registerInfo.mappings.length === 0 && registerInfo.isRunning && (
        <div className="text-center py-8 text-gray-500">
          <SafeIcon icon={FiDatabase} className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No device data available for Modbus mapping</p>
          <p className="text-sm mt-1">Add devices and ensure they have data to see register mappings</p>
        </div>
      )}
    </motion.div>
  );
}

export default ModbusSlaveConfig;