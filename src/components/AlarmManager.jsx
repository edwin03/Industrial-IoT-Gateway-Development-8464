import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import { formatDistanceToNow } from 'date-fns';
import AlarmModal from './AlarmModal';

const { FiPlus, FiEdit2, FiTrash2, FiAlertTriangle, FiBell, FiBellOff, FiActivity, FiX } = FiIcons;

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
};

const ALARM_TYPE_LABELS = {
  threshold: 'Threshold',
  range: 'Range',
  change: 'Change',
  status: 'Status'
};

function AlarmManager() {
  const { devices } = useGateway();
  const [alarms, setAlarms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState(null);
  const [activeAlarms, setActiveAlarms] = useState([]);

  useEffect(() => {
    // Load alarms from localStorage
    const savedAlarms = JSON.parse(localStorage.getItem('deviceAlarms') || '[]');
    setAlarms(savedAlarms);

    // Load active alarms
    const savedActiveAlarms = JSON.parse(localStorage.getItem('activeAlarms') || '[]');
    setActiveAlarms(savedActiveAlarms);
  }, []);

  useEffect(() => {
    // Listen for modal close to refresh alarms
    const handleStorageChange = () => {
      const savedAlarms = JSON.parse(localStorage.getItem('deviceAlarms') || '[]');
      setAlarms(savedAlarms);
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check on interval for updates from alarm processing
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleEdit = (alarm) => {
    setEditingAlarm(alarm);
    setIsModalOpen(true);
  };

  const handleDelete = (alarmId) => {
    if (confirm('Are you sure you want to delete this alarm?')) {
      const updatedAlarms = alarms.filter(a => a.id !== alarmId);
      localStorage.setItem('deviceAlarms', JSON.stringify(updatedAlarms));
      setAlarms(updatedAlarms);
      
      // Update server
      if (window.socketInstance) {
        window.socketInstance.emit('updateAlarms', updatedAlarms);
      }
    }
  };

  const toggleAlarmEnabled = (alarmId) => {
    const updatedAlarms = alarms.map(alarm => 
      alarm.id === alarmId 
        ? { ...alarm, enabled: !alarm.enabled }
        : alarm
    );
    localStorage.setItem('deviceAlarms', JSON.stringify(updatedAlarms));
    setAlarms(updatedAlarms);
    
    // Update server
    if (window.socketInstance) {
      window.socketInstance.emit('updateAlarms', updatedAlarms);
    }
  };

  const clearActiveAlarm = (alarmId) => {
    const updatedActiveAlarms = activeAlarms.filter(a => a.alarmId !== alarmId);
    localStorage.setItem('activeAlarms', JSON.stringify(updatedActiveAlarms));
    setActiveAlarms(updatedActiveAlarms);
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : 'Unknown Device';
  };

  const getConditionText = (alarm) => {
    switch (alarm.type) {
      case 'threshold':
        const operators = {
          gt: '>',
          gte: '≥',
          lt: '<',
          lte: '≤',
          eq: '=',
          ne: '≠'
        };
        return `${alarm.dataKey} ${operators[alarm.operator]} ${alarm.value}`;
      
      case 'range':
        return `${alarm.dataKey} outside ${alarm.minValue} - ${alarm.maxValue}`;
      
      case 'change':
        return `${alarm.dataKey} changes by ±${alarm.changeAmount}`;
      
      case 'status':
        return 'Device goes offline or error';
      
      default:
        return 'Unknown condition';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiAlertTriangle} className="w-6 h-6 text-orange-600" />
          <h2 className="text-xl font-semibold text-gray-900">Device Alarms</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingAlarm(null);
            setIsModalOpen(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Alarm</span>
        </motion.button>
      </div>

      {/* Active Alarms */}
      {activeAlarms.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-red-50 border-b border-red-200 p-4">
            <h3 className="text-lg font-semibold text-red-900 flex items-center space-x-2">
              <SafeIcon icon={FiBell} className="w-5 h-5" />
              <span>Active Alarms ({activeAlarms.length})</span>
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {activeAlarms.map((activeAlarm) => {
              const alarm = alarms.find(a => a.id === activeAlarm.alarmId);
              if (!alarm) return null;

              return (
                <motion.div
                  key={activeAlarm.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-red-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${SEVERITY_COLORS[alarm.severity]}`}>
                          {alarm.severity.toUpperCase()}
                        </span>
                        <h4 className="font-semibold text-gray-900">{alarm.name}</h4>
                      </div>
                      <p className="text-sm text-gray-700 mb-1">{activeAlarm.message}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Device: {getDeviceName(alarm.deviceId)}</span>
                        <span>Triggered: {formatDistanceToNow(new Date(activeAlarm.triggeredAt), { addSuffix: true })}</span>
                        {activeAlarm.value !== undefined && (
                          <span>Value: {activeAlarm.value}</span>
                        )}
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => clearActiveAlarm(activeAlarm.alarmId)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Clear alarm"
                    >
                      <SafeIcon icon={FiX} className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Configured Alarms */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Configured Alarms ({alarms.length})
          </h3>
        </div>

        {alarms.length === 0 ? (
          <div className="text-center py-12">
            <SafeIcon icon={FiAlertTriangle} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No alarms configured</h3>
            <p className="text-gray-600 mb-4">
              Create alarms to monitor your devices and get notified when conditions are met
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingAlarm(null);
                setIsModalOpen(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Create Your First Alarm</span>
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {alarms.map((alarm) => (
              <motion.div
                key={alarm.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${SEVERITY_COLORS[alarm.severity]}`}>
                        {alarm.severity.toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                        {ALARM_TYPE_LABELS[alarm.type]}
                      </span>
                      <h4 className="font-semibold text-gray-900">{alarm.name}</h4>
                      {!alarm.enabled && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          DISABLED
                        </span>
                      )}
                    </div>
                    
                    {alarm.description && (
                      <p className="text-sm text-gray-600 mb-2">{alarm.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-700">
                      <span>Device: {getDeviceName(alarm.deviceId)}</span>
                      <span>Condition: {getConditionText(alarm)}</span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>
                        Cooldown: {(alarm.cooldownPeriod / 60000)} minutes
                      </span>
                      <span>
                        Email: {alarm.emailNotification ? 'Enabled' : 'Disabled'}
                      </span>
                      {alarm.triggerCount > 0 && (
                        <span>
                          Triggered: {alarm.triggerCount} times
                        </span>
                      )}
                      {alarm.lastTriggered && (
                        <span>
                          Last: {formatDistanceToNow(new Date(alarm.lastTriggered), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleAlarmEnabled(alarm.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        alarm.enabled 
                          ? 'text-green-600 hover:bg-green-50' 
                          : 'text-gray-400 hover:bg-gray-50'
                      }`}
                      title={alarm.enabled ? 'Disable alarm' : 'Enable alarm'}
                    >
                      <SafeIcon icon={alarm.enabled ? FiBell : FiBellOff} className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleEdit(alarm)}
                      className="text-primary-600 hover:text-primary-900 p-2"
                      title="Edit alarm"
                    >
                      <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(alarm.id)}
                      className="text-red-600 hover:text-red-900 p-2"
                      title="Delete alarm"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Alarm Modal */}
      <AlarmModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAlarm(null);
          // Refresh alarms after modal close
          const savedAlarms = JSON.parse(localStorage.getItem('deviceAlarms') || '[]');
          setAlarms(savedAlarms);
        }}
        alarm={editingAlarm}
        devices={devices}
      />
    </motion.div>
  );
}

export default AlarmManager;