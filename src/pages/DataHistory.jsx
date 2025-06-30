import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useGateway } from '../context/GatewayContext';
import { formatDistanceToNow } from 'date-fns';
import HistoryLoggerModal from '../components/HistoryLoggerModal';
import HistoryViewer from '../components/HistoryViewer';

const { FiDatabase, FiPlus, FiEdit2, FiTrash2, FiEye, FiPlay, FiPause, FiInfo } = FiIcons;

function DataHistory() {
  const { devices } = useGateway();
  const [historyLoggers, setHistoryLoggers] = useState([]);
  const [showLoggerModal, setShowLoggerModal] = useState(false);
  const [showHistoryViewer, setShowHistoryViewer] = useState(false);
  const [editingLogger, setEditingLogger] = useState(null);
  const [viewingLogger, setViewingLogger] = useState(null);
  const [loggerStats, setLoggerStats] = useState({});

  useEffect(() => {
    // Load history loggers from localStorage
    const savedLoggers = JSON.parse(localStorage.getItem('historyLoggers') || '[]');
    setHistoryLoggers(savedLoggers);
    
    // Update server with current loggers
    if (window.socketInstance) {
      window.socketInstance.emit('updateHistoryLoggers', savedLoggers);
    }
  }, []);

  useEffect(() => {
    // Load stats for all loggers
    historyLoggers.forEach(logger => {
      if (window.socketInstance) {
        window.socketInstance.emit('getLoggerStats', logger.id);
        
        window.socketInstance.on('loggerStatsResponse', (statsData) => {
          if (statsData && statsData.id === logger.id) {
            setLoggerStats(prev => ({
              ...prev,
              [logger.id]: statsData
            }));
          }
        });
      }
    });

    return () => {
      if (window.socketInstance) {
        window.socketInstance.off('loggerStatsResponse');
      }
    };
  }, [historyLoggers]);

  const handleEdit = (logger) => {
    setEditingLogger(logger);
    setShowLoggerModal(true);
  };

  const handleDelete = (loggerId) => {
    if (confirm('Are you sure you want to delete this history logger? This will not delete existing history data.')) {
      const updatedLoggers = historyLoggers.filter(l => l.id !== loggerId);
      localStorage.setItem('historyLoggers', JSON.stringify(updatedLoggers));
      setHistoryLoggers(updatedLoggers);
      
      // Update server
      if (window.socketInstance) {
        window.socketInstance.emit('updateHistoryLoggers', updatedLoggers);
      }
    }
  };

  const toggleLogger = (loggerId) => {
    const updatedLoggers = historyLoggers.map(logger =>
      logger.id === loggerId ? { ...logger, enabled: !logger.enabled } : logger
    );
    localStorage.setItem('historyLoggers', JSON.stringify(updatedLoggers));
    setHistoryLoggers(updatedLoggers);
    
    // Update server
    if (window.socketInstance) {
      window.socketInstance.emit('updateHistoryLoggers', updatedLoggers);
    }
  };

  const handleView = (logger) => {
    setViewingLogger(logger);
    setShowHistoryViewer(true);
  };

  const getDeviceName = (deviceId) => {
    const device = devices.find(d => d.id === deviceId);
    return device ? device.name : 'Unknown Device';
  };

  const getStatusColor = (enabled) => {
    return enabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatInterval = (ms) => {
    if (ms < 60000) return `${ms / 1000}s`;
    if (ms < 3600000) return `${ms / 60000}m`;
    return `${ms / 3600000}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiDatabase} className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Data History Logging</h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setEditingLogger(null);
            setShowLoggerModal(true);
          }}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Logger</span>
        </motion.button>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Data History Logging</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Create loggers to automatically record device data at specified intervals</p>
              <p>• Data is stored in efficient JSON Lines format for fast querying</p>
              <p>• View historical trends with interactive charts and export capabilities</p>
              <p>• Files are automatically rotated and cleaned based on retention settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* History Loggers List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            History Loggers ({historyLoggers.length})
          </h3>
        </div>

        {historyLoggers.length === 0 ? (
          <div className="text-center py-12">
            <SafeIcon icon={FiDatabase} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Loggers</h3>
            <p className="text-gray-600 mb-4">
              Create history loggers to automatically record device data over time
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setEditingLogger(null);
                setShowLoggerModal(true);
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors mx-auto"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Create Your First Logger</span>
            </motion.button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {historyLoggers.map((logger) => {
              const stats = loggerStats[logger.id];
              return (
                <motion.div
                  key={logger.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{logger.name}</h4>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(logger.enabled)}`}>
                          {logger.enabled ? 'Active' : 'Inactive'}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                          Every {formatInterval(logger.interval)}
                        </span>
                      </div>
                      
                      {logger.description && (
                        <p className="text-sm text-gray-600 mb-2">{logger.description}</p>
                      )}

                      <div className="flex items-center space-x-6 text-sm text-gray-700">
                        <span>Device: {getDeviceName(logger.deviceId)}</span>
                        <span>Data Points: {logger.dataPoints.length}</span>
                        <span>Retention: {logger.retentionDays} days</span>
                      </div>

                      {stats && (
                        <div className="flex items-center space-x-6 text-xs text-gray-500 mt-2">
                          <span>Records: {stats.stats.totalRecords.toLocaleString()}</span>
                          <span>Size: {formatFileSize(stats.stats.totalSize)}</span>
                          {stats.stats.newestRecord && (
                            <span>
                              Last: {formatDistanceToNow(new Date(stats.stats.newestRecord), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 mt-2">
                        {logger.dataPoints.slice(0, 5).map((dataPoint) => (
                          <span
                            key={dataPoint}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                          >
                            {dataPoint}
                          </span>
                        ))}
                        {logger.dataPoints.length > 5 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{logger.dataPoints.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleView(logger)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                        title="View history"
                      >
                        <SafeIcon icon={FiEye} className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleLogger(logger.id)}
                        className={`p-2 ${logger.enabled ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}`}
                        title={logger.enabled ? 'Pause logging' : 'Resume logging'}
                      >
                        <SafeIcon icon={logger.enabled ? FiPause : FiPlay} className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleEdit(logger)}
                        className="text-gray-600 hover:text-primary-600 p-2"
                        title="Edit logger"
                      >
                        <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDelete(logger.id)}
                        className="text-gray-600 hover:text-red-600 p-2"
                        title="Delete logger"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Logger Modal */}
      <HistoryLoggerModal
        isOpen={showLoggerModal}
        onClose={() => {
          setShowLoggerModal(false);
          setEditingLogger(null);
          // Refresh loggers after modal close
          const savedLoggers = JSON.parse(localStorage.getItem('historyLoggers') || '[]');
          setHistoryLoggers(savedLoggers);
        }}
        logger={editingLogger}
        devices={devices}
      />

      {/* History Viewer Modal */}
      <HistoryViewer
        isOpen={showHistoryViewer}
        onClose={() => {
          setShowHistoryViewer(false);
          setViewingLogger(null);
        }}
        logger={viewingLogger}
      />
    </motion.div>
  );
}

export default DataHistory;