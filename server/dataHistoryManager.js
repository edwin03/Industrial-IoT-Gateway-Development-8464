import fs from 'fs';
import path from 'path';

class DataHistoryManager {
  constructor() {
    this.historyDir = path.join(process.cwd(), 'data-history');
    this.activeLoggers = new Map();
    this.onLogCallback = null;
    this.maxFileSize = 10 * 1024 * 1024; // 10MB max file size
    this.maxHistoryDays = 30; // Keep 30 days of history
    
    // Ensure history directory exists
    this.ensureHistoryDirectory();
  }

  // Initialize the data history manager
  initialize(onLog) {
    this.onLogCallback = onLog;
    this.log('info', 'Data history manager initialized');
    
    // Clean old files on startup
    this.cleanOldHistoryFiles();
  }

  // Ensure history directory exists
  ensureHistoryDirectory() {
    if (!fs.existsSync(this.historyDir)) {
      fs.mkdirSync(this.historyDir, { recursive: true });
    }
  }

  // Update active loggers configuration
  updateLoggers(loggers) {
    this.activeLoggers.clear();
    
    loggers.forEach(logger => {
      if (logger.enabled) {
        this.activeLoggers.set(logger.id, {
          ...logger,
          lastLogTime: 0,
          buffer: []
        });
      }
    });

    this.log('info', `Updated data loggers: ${this.activeLoggers.size} active loggers`);
  }

  // Process device data for logging
  processDeviceData(device) {
    if (!device.lastData || !device.lastUpdated) return;

    const timestamp = new Date(device.lastUpdated);
    
    // Check each active logger
    this.activeLoggers.forEach((logger, loggerId) => {
      if (logger.deviceId === device.id) {
        this.processLoggerData(logger, device, timestamp);
      }
    });
  }

  // Process data for a specific logger
  processLoggerData(logger, device, timestamp) {
    const now = timestamp.getTime();
    
    // Check if enough time has passed since last log
    if (now - logger.lastLogTime < logger.interval) {
      return;
    }

    // Extract selected data points
    const logData = {};
    let hasData = false;

    logger.dataPoints.forEach(dataPoint => {
      if (device.lastData[dataPoint] !== undefined) {
        logData[dataPoint] = device.lastData[dataPoint];
        hasData = true;
      }
    });

    if (!hasData) return;

    // Create log entry
    const logEntry = {
      timestamp: timestamp.toISOString(),
      deviceId: device.id,
      deviceName: device.name,
      data: logData
    };

    // Add to buffer
    logger.buffer.push(logEntry);
    logger.lastLogTime = now;

    // Write to file if buffer is full or enough time has passed
    if (logger.buffer.length >= 100 || now - logger.lastWriteTime > 60000) { // 100 entries or 1 minute
      this.writeBufferToFile(logger);
    }
  }

  // Write buffer to file
  writeBufferToFile(logger) {
    if (logger.buffer.length === 0) return;

    try {
      const date = new Date().toISOString().split('T')[0];
      const filename = `${logger.name.replace(/\s+/g, '_')}_${date}.jsonl`;
      const filepath = path.join(this.historyDir, filename);

      // Append entries to file (JSON Lines format)
      const lines = logger.buffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      fs.appendFileSync(filepath, lines);

      this.log('info', `Wrote ${logger.buffer.length} entries to ${filename}`, 'Data History');
      
      // Clear buffer
      logger.buffer = [];
      logger.lastWriteTime = Date.now();

      // Check file size and rotate if needed
      this.checkFileRotation(filepath, logger);
    } catch (error) {
      this.log('error', `Failed to write history file: ${error.message}`, 'Data History');
    }
  }

  // Check if file needs rotation
  checkFileRotation(filepath, logger) {
    try {
      const stats = fs.statSync(filepath);
      if (stats.size > this.maxFileSize) {
        const timestamp = Date.now();
        const newPath = filepath.replace('.jsonl', `_${timestamp}.jsonl`);
        fs.renameSync(filepath, newPath);
        this.log('info', `Rotated history file: ${path.basename(newPath)}`, 'Data History');
      }
    } catch (error) {
      this.log('error', `Failed to check file rotation: ${error.message}`, 'Data History');
    }
  }

  // Get history data for a logger
  getHistoryData(loggerId, startTime, endTime, limit = 1000) {
    try {
      const logger = this.activeLoggers.get(loggerId);
      if (!logger) {
        throw new Error('Logger not found');
      }

      const results = [];
      const files = this.getHistoryFiles(logger.name);

      for (const file of files) {
        const filepath = path.join(this.historyDir, file);
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.trim().split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const entry = JSON.parse(line);
            const entryTime = new Date(entry.timestamp).getTime();

            if (entryTime >= startTime && entryTime <= endTime) {
              results.push(entry);
            }

            if (results.length >= limit) {
              return results.slice(-limit); // Return most recent entries
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            continue;
          }
        }
      }

      return results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    } catch (error) {
      this.log('error', `Failed to get history data: ${error.message}`, 'Data History');
      return [];
    }
  }

  // Get available history files for a logger
  getHistoryFiles(loggerName) {
    try {
      const files = fs.readdirSync(this.historyDir);
      const prefix = loggerName.replace(/\s+/g, '_');
      
      return files
        .filter(file => file.startsWith(prefix) && file.endsWith('.jsonl'))
        .sort(); // Sort chronologically
    } catch (error) {
      return [];
    }
  }

  // Export history data
  exportHistoryData(loggerId, startTime, endTime, format = 'json') {
    try {
      const data = this.getHistoryData(loggerId, startTime, endTime, 10000); // Max 10k records
      const logger = this.activeLoggers.get(loggerId);

      if (format === 'csv') {
        return this.convertToCSV(data, logger);
      } else {
        return {
          logger: {
            id: logger.id,
            name: logger.name,
            deviceId: logger.deviceId,
            dataPoints: logger.dataPoints
          },
          timeRange: {
            start: new Date(startTime).toISOString(),
            end: new Date(endTime).toISOString()
          },
          totalRecords: data.length,
          data: data
        };
      }
    } catch (error) {
      this.log('error', `Failed to export history data: ${error.message}`, 'Data History');
      throw error;
    }
  }

  // Convert data to CSV format
  convertToCSV(data, logger) {
    if (data.length === 0) return 'No data available';

    // Create headers
    const headers = ['timestamp', 'deviceName', ...logger.dataPoints];
    let csv = headers.join(',') + '\n';

    // Add data rows
    data.forEach(entry => {
      const row = [
        entry.timestamp,
        `"${entry.deviceName}"`,
        ...logger.dataPoints.map(point => entry.data[point] || '')
      ];
      csv += row.join(',') + '\n';
    });

    return csv;
  }

  // Get logger statistics
  getLoggerStats(loggerId) {
    try {
      const logger = this.activeLoggers.get(loggerId);
      if (!logger) {
        return null;
      }

      const files = this.getHistoryFiles(logger.name);
      let totalRecords = 0;
      let oldestRecord = null;
      let newestRecord = null;
      let totalSize = 0;

      files.forEach(file => {
        const filepath = path.join(this.historyDir, file);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;

        // Quick scan for record count and date range
        const content = fs.readFileSync(filepath, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        totalRecords += lines.length;

        if (lines.length > 0) {
          try {
            const firstEntry = JSON.parse(lines[0]);
            const lastEntry = JSON.parse(lines[lines.length - 1]);

            if (!oldestRecord || new Date(firstEntry.timestamp) < new Date(oldestRecord)) {
              oldestRecord = firstEntry.timestamp;
            }
            if (!newestRecord || new Date(lastEntry.timestamp) > new Date(newestRecord)) {
              newestRecord = lastEntry.timestamp;
            }
          } catch (parseError) {
            // Skip invalid entries
          }
        }
      });

      return {
        id: loggerId,
        name: logger.name,
        deviceId: logger.deviceId,
        dataPoints: logger.dataPoints,
        interval: logger.interval,
        enabled: logger.enabled,
        stats: {
          totalRecords,
          totalFiles: files.length,
          totalSize: totalSize,
          oldestRecord,
          newestRecord,
          bufferSize: logger.buffer.length
        }
      };
    } catch (error) {
      this.log('error', `Failed to get logger stats: ${error.message}`, 'Data History');
      return null;
    }
  }

  // Clean old history files
  cleanOldHistoryFiles() {
    try {
      const files = fs.readdirSync(this.historyDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);

      let deletedCount = 0;

      files.forEach(file => {
        const filepath = path.join(this.historyDir, file);
        const stats = fs.statSync(filepath);

        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filepath);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        this.log('info', `Cleaned ${deletedCount} old history files`, 'Data History');
      }
    } catch (error) {
      this.log('error', `Failed to clean old history files: ${error.message}`, 'Data History');
    }
  }

  // Force flush all buffers
  flushAllBuffers() {
    this.activeLoggers.forEach(logger => {
      if (logger.buffer.length > 0) {
        this.writeBufferToFile(logger);
      }
    });
  }

  // Get all active loggers info
  getActiveLoggers() {
    const loggers = [];
    this.activeLoggers.forEach((logger, id) => {
      loggers.push({
        id,
        name: logger.name,
        deviceId: logger.deviceId,
        dataPoints: logger.dataPoints,
        interval: logger.interval,
        enabled: logger.enabled,
        bufferSize: logger.buffer.length,
        lastLogTime: logger.lastLogTime
      });
    });
    return loggers;
  }

  // Logging helper
  log(level, message, component = 'Data History') {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, component);
    }
  }
}

export default DataHistoryManager;