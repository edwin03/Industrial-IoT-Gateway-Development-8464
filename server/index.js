import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mqtt from 'mqtt';
import ModbusRTU from 'modbus-serial';
import snmp from 'net-snmp';
import ModbusSlaveServer from './modbusSlaveServer.js';
import BACnetClient from './bacnetClient.js';
import EmailService from './emailService.js';
import AlarmProcessor from './alarmProcessor.js';
import DataHistoryManager from './dataHistoryManager.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Gateway state
let devices = [];
let settings = {
  mqtt: {
    broker: 'localhost',
    port: 1883,
    username: '',
    password: '',
    topic: 'iot/gateway'
  },
  polling: {
    interval: 5000,
    timeout: 3000
  },
  modbusSlave: {
    enabled: false,
    port: 5020,
    unitId: 1,
    autoStart: false
  },
  email: {
    enabled: false,
    smtp: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: ''
    },
    from: '',
    notifications: {
      deviceOffline: true,
      deviceError: true,
      deviceOnline: false,
      systemErrors: true,
      dailySummary: false
    },
    recipients: []
  }
};

let mqttClient = null;
let devicePollers = new Map();
let stats = {
  totalDevices: 0,
  activeDevices: 0,
  messagesProcessed: 0,
  errors: 0
};

// Initialize services
const modbusSlaveServer = new ModbusSlaveServer();
const bacnetClient = new BACnetClient();
const emailService = new EmailService();
const alarmProcessor = new AlarmProcessor();
const dataHistoryManager = new DataHistoryManager();

// Logging system
const logs = [];

function addLog(level, message, device = null) {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    device
  };
  logs.unshift(log);
  if (logs.length > 1000) logs.pop();

  // Broadcast to connected clients
  io.emit('newLog', log);

  // Send email notification for system errors
  if (level === 'error' && device === 'System') {
    emailService.sendSystemNotification('systemErrors', message, { timestamp: log.timestamp })
      .catch(err => console.error('Failed to send email notification:', err));
  }
}

// Initialize MQTT connection
function initializeMQTT() {
  try {
    if (mqttClient) {
      mqttClient.end();
    }

    const mqttUrl = `mqtt://${settings.mqtt.broker}:${settings.mqtt.port}`;
    const options = {};

    if (settings.mqtt.username) {
      options.username = settings.mqtt.username;
      options.password = settings.mqtt.password;
    }

    mqttClient = mqtt.connect(mqttUrl, options);

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT broker');
      addLog('success', 'Connected to MQTT broker', 'System');
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error);
      addLog('error', `MQTT connection error: ${error.message}`, 'System');
    });
  } catch (error) {
    console.error('Failed to initialize MQTT:', error);
    addLog('error', `Failed to initialize MQTT: ${error.message}`, 'System');
  }
}

// Apply Modbus scaling to a value
function applyModbusScaling(value, scalingConfig) {
  if (!scalingConfig || !scalingConfig.enabled) {
    return value;
  }
  
  const scaled = (value * scalingConfig.multiplier) + scalingConfig.offset;
  return parseFloat(scaled.toFixed(scalingConfig.decimals));
}

// Enhanced Modbus TCP handler with scaling support
async function readModbusDevice(device) {
  const client = new ModbusRTU();
  try {
    await client.connectTCP(device.host, { port: parseInt(device.port) });
    client.setID(parseInt(device.deviceId) || 1);
    client.setTimeout(device.modbusConfig?.timeout || 3000);

    const data = {};
    const scalingMap = new Map();

    // Build scaling map for quick lookup
    if (device.modbusConfig?.scaling) {
      device.modbusConfig.scaling.forEach(scale => {
        if (scale.enabled && scale.register) {
          scalingMap.set(scale.register, scale);
        }
      });
    }

    // Check if device uses new function-based configuration
    if (device.modbusConfig && device.modbusConfig.functions && device.modbusConfig.functions.length > 0) {
      // Use new function-based approach with scaling
      for (const func of device.modbusConfig.functions) {
        try {
          let result;
          const startAddr = func.startAddress;
          const quantity = func.quantity;
          const funcName = func.name || `Function_${func.functionCode}`;

          switch (func.functionCode) {
            case 1: // Read Coils
              result = await client.readCoils(startAddr - 1, quantity); // Modbus uses 0-based addressing
              for (let i = 0; i < result.data.length; i++) {
                const register = (startAddr + i).toString();
                let value = result.data[i] ? 1 : 0;
                
                // Apply scaling if configured
                const scaling = scalingMap.get(register);
                if (scaling) {
                  value = applyModbusScaling(value, scaling);
                  data[`${scaling.name || funcName}_coil_${register}`] = value;
                  data[`${scaling.name || funcName}_coil_${register}_unit`] = scaling.unit;
                } else {
                  data[`${funcName}_coil_${register}`] = value;
                }
              }
              break;
              
            case 2: // Read Discrete Inputs
              result = await client.readDiscreteInputs(startAddr - 10001, quantity);
              for (let i = 0; i < result.data.length; i++) {
                const register = (startAddr + i).toString();
                let value = result.data[i] ? 1 : 0;
                
                const scaling = scalingMap.get(register);
                if (scaling) {
                  value = applyModbusScaling(value, scaling);
                  data[`${scaling.name || funcName}_input_${register}`] = value;
                  data[`${scaling.name || funcName}_input_${register}_unit`] = scaling.unit;
                } else {
                  data[`${funcName}_input_${register}`] = value;
                }
              }
              break;
              
            case 3: // Read Holding Registers
              result = await client.readHoldingRegisters(startAddr - 40001, quantity);
              for (let i = 0; i < result.data.length; i++) {
                const register = (startAddr + i).toString();
                let value = result.data[i];
                
                const scaling = scalingMap.get(register);
                if (scaling) {
                  value = applyModbusScaling(value, scaling);
                  data[`${scaling.name || funcName}_holding_${register}`] = value;
                  data[`${scaling.name || funcName}_holding_${register}_unit`] = scaling.unit;
                } else {
                  data[`${funcName}_holding_${register}`] = value;
                }
              }
              break;
              
            case 4: // Read Input Registers
              result = await client.readInputRegisters(startAddr - 30001, quantity);
              for (let i = 0; i < result.data.length; i++) {
                const register = (startAddr + i).toString();
                let value = result.data[i];
                
                const scaling = scalingMap.get(register);
                if (scaling) {
                  value = applyModbusScaling(value, scaling);
                  data[`${scaling.name || funcName}_input_${register}`] = value;
                  data[`${scaling.name || funcName}_input_${register}_unit`] = scaling.unit;
                } else {
                  data[`${funcName}_input_${register}`] = value;
                }
              }
              break;
              
            default:
              console.warn(`Unsupported function code: ${func.functionCode}`);
          }
        } catch (error) {
          console.error(`Error reading function ${func.functionCode} at ${func.startAddress}:`, error);
          data[`${func.name || 'Function'}_error`] = error.message;
        }
      }
    } else {
      // Use legacy register-based approach for backward compatibility with scaling
      const registers = device.registers.split(',').map(r => parseInt(r.trim()));
      for (const register of registers) {
        try {
          const result = await client.readHoldingRegisters(register - 40001, 1);
          let value = result.data[0];
          
          // Apply scaling if configured
          const scaling = scalingMap.get(register.toString());
          if (scaling) {
            value = applyModbusScaling(value, scaling);
            data[`${scaling.name || 'register'}_${register}`] = value;
            data[`${scaling.name || 'register'}_${register}_unit`] = scaling.unit;
          } else {
            data[`register_${register}`] = value;
          }
        } catch (error) {
          console.error(`Error reading register ${register}:`, error);
          data[`register_${register}`] = null;
        }
      }
    }

    client.close();
    return data;
  } catch (error) {
    client.close();
    throw error;
  }
}

// SNMP handler
async function readSNMPDevice(device) {
  return new Promise((resolve, reject) => {
    const session = snmp.createSession(device.host, device.deviceId || 'public');
    const oids = device.registers.split(',').map(oid => oid.trim());

    session.get(oids, (error, varbinds) => {
      if (error) {
        session.close();
        reject(error);
        return;
      }

      const data = {};
      varbinds.forEach((vb, index) => {
        if (snmp.isVarbindError(vb)) {
          console.error(snmp.varbindError(vb));
          data[`oid_${oids[index]}`] = null;
        } else {
          data[`oid_${oids[index]}`] = vb.value;
        }
      });

      session.close();
      resolve(data);
    });
  });
}

// BACnet handler with discovery integration
async function readBACnetDevice(device) {
  return await bacnetClient.readDevice(device);
}

// Device polling
async function pollDevice(device) {
  const previousStatus = device.status;
  try {
    let data = {};

    switch (device.protocol) {
      case 'modbus':
        data = await readModbusDevice(device);
        break;
      case 'snmp':
        data = await readSNMPDevice(device);
        break;
      case 'bacnet':
        data = await readBACnetDevice(device);
        break;
      default:
        throw new Error(`Unsupported protocol: ${device.protocol}`);
    }

    // Update device status
    device.status = 'online';
    device.lastUpdated = new Date().toISOString();
    device.lastData = data;
    device.lastError = null;

    // Send email notification if device came online
    if (previousStatus !== 'online' && emailService.isConfigured()) {
      emailService.sendDeviceNotification(device, 'deviceOnline')
        .catch(err => console.error('Failed to send device online notification:', err));
    }

    // Process device data for alarms
    alarmProcessor.processDeviceData(device);

    // Process device data for history logging
    dataHistoryManager.processDeviceData(device);

    // Publish to MQTT
    if (mqttClient && mqttClient.connected) {
      const topic = device.mqttTopic || `${settings.mqtt.topic}/${device.name.replace(/\s+/g, '_')}`;
      const payload = {
        deviceId: device.id,
        deviceName: device.name,
        protocol: device.protocol,
        timestamp: device.lastUpdated,
        data
      };
      mqttClient.publish(topic, JSON.stringify(payload));
      stats.messagesProcessed++;
    }

    // Update Modbus slave registers if enabled
    if (settings.modbusSlave.enabled && modbusSlaveServer.isRunning) {
      modbusSlaveServer.updateDeviceData(devices);
    }

    addLog('info', `Successfully polled device: ${device.name}`, device.name);
  } catch (error) {
    const newStatus = 'error';
    device.status = newStatus;
    device.lastError = error.message;
    device.lastUpdated = new Date().toISOString();
    stats.errors++;

    addLog('error', `Failed to poll device ${device.name}: ${error.message}`, device.name);

    // Process device status change for alarms
    alarmProcessor.processDeviceData(device);

    // Process device status change for history
    dataHistoryManager.processDeviceData(device);

    // Send email notifications for device errors/offline
    if (emailService.isConfigured()) {
      const notificationType = error.message.includes('timeout') || error.message.includes('connect') ? 'deviceOffline' : 'deviceError';
      emailService.sendDeviceNotification(device, notificationType, { error: error.message })
        .catch(err => console.error('Failed to send device error notification:', err));
    }
  }

  // Broadcast device update
  io.emit('deviceUpdate', device);
}

// Start polling for a device
function startDevicePolling(device) {
  stopDevicePolling(device.id);
  const interval = device.pollInterval || settings.polling.interval;
  const pollerId = setInterval(() => {
    pollDevice(device);
  }, interval);
  devicePollers.set(device.id, pollerId);

  // Initial poll after 2 seconds
  setTimeout(() => pollDevice(device), 2000);
}

// Stop polling for a device
function stopDevicePolling(deviceId) {
  if (devicePollers.has(deviceId)) {
    clearInterval(devicePollers.get(deviceId));
    devicePollers.delete(deviceId);
  }
}

// Update statistics
function updateStats() {
  stats.totalDevices = devices.length;
  stats.activeDevices = devices.filter(d => d.status === 'online').length;
  io.emit('statsUpdate', stats);
}

// Initialize services
function initializeServices() {
  initializeMQTT();
  emailService.configure(settings.email, addLog);
  alarmProcessor.initialize(addLog, (eventType, message, details) => {
    return emailService.sendSystemNotification(eventType, message, details);
  });
  dataHistoryManager.initialize(addLog);
  bacnetClient.initialize(addLog);
}

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected');
  addLog('info', 'Web client connected', 'System');

  // Send current state to new client
  socket.emit('devicesUpdate', devices);
  socket.emit('statsUpdate', stats);
  socket.emit('settingsUpdate', settings);
  socket.emit('logsUpdate', logs.slice(0, 100));

  socket.on('getDevices', () => {
    socket.emit('devicesUpdate', devices);
  });

  socket.on('getSettings', () => {
    socket.emit('settingsUpdate', settings);
  });

  socket.on('getModbusSlaveInfo', () => {
    const info = modbusSlaveServer.getRegisterMappings();
    socket.emit('modbusSlaveInfo', info);
  });

  // BACnet Discovery handlers
  socket.on('bacnetDiscover', async (options) => {
    try {
      addLog('info', 'Starting BACnet device discovery', 'BACnet');
      const discoveredDevices = await bacnetClient.discoverDevices(options);
      socket.emit('bacnetDiscoveryResult', { success: true, devices: discoveredDevices });
    } catch (error) {
      addLog('error', `BACnet discovery failed: ${error.message}`, 'BACnet');
      socket.emit('bacnetDiscoveryResult', { success: false, error: error.message });
    }
  });

  // BACnet Object List handler
  socket.on('getBacnetObjectList', async (deviceConfig) => {
    try {
      addLog('info', `Reading BACnet object list from ${deviceConfig.address}`, 'BACnet');
      const objectList = await bacnetClient.readObjectList(deviceConfig);
      socket.emit('bacnetObjectListResponse', { success: true, objects: objectList });
    } catch (error) {
      addLog('error', `Failed to read BACnet object list: ${error.message}`, 'BACnet');
      socket.emit('bacnetObjectListResponse', { success: false, error: error.message });
    }
  });

  // Alarm handlers
  socket.on('updateAlarms', (alarms) => {
    alarmProcessor.updateAlarms(alarms);
    addLog('info', `Alarm configuration updated: ${alarms.length} alarms`, 'System');
  });

  // Data History handlers
  socket.on('updateHistoryLoggers', (loggers) => {
    dataHistoryManager.updateLoggers(loggers);
    addLog('info', `History loggers updated: ${loggers.filter(l => l.enabled).length} active`, 'Data History');
  });

  socket.on('getHistoryData', ({ loggerId, startTime, endTime, limit }) => {
    const data = dataHistoryManager.getHistoryData(loggerId, startTime, endTime, limit);
    socket.emit('historyDataResponse', data);
  });

  socket.on('getLoggerStats', (loggerId) => {
    const stats = dataHistoryManager.getLoggerStats(loggerId);
    socket.emit('loggerStatsResponse', stats);
  });

  socket.on('exportHistoryData', ({ loggerId, startTime, endTime, format }) => {
    try {
      const exportData = dataHistoryManager.exportHistoryData(loggerId, startTime, endTime, format);
      socket.emit('exportDataResponse', format === 'csv' ? exportData : JSON.stringify(exportData, null, 2));
    } catch (error) {
      socket.emit('exportDataResponse', `Error: ${error.message}`);
    }
  });

  // Email service handlers
  socket.on('testEmailConnection', async () => {
    try {
      console.log('Testing email connection...');
      addLog('info', 'Email connection test requested', 'Email Service');
      const currentEmailSettings = settings.email;
      console.log('Current email settings:', JSON.stringify(currentEmailSettings, null, 2));
      
      emailService.configure(currentEmailSettings, addLog);
      const result = await emailService.testConnection();
      console.log('Email test result:', result);
      
      addLog('success', 'Email connection test successful', 'Email Service');
      socket.emit('emailTestResult', result);
    } catch (error) {
      console.error('Email test failed:', error);
      addLog('error', `Email connection test failed: ${error.message}`, 'Email Service');
      socket.emit('emailTestResult', { success: false, message: error.message });
    }
  });

  socket.on('sendTestEmail', async (recipient) => {
    try {
      console.log('Sending test email to:', recipient);
      addLog('info', `Test email requested for: ${recipient}`, 'Email Service');
      const currentEmailSettings = settings.email;
      
      emailService.configure(currentEmailSettings, addLog);
      const result = await emailService.sendTestEmail(recipient);
      console.log('Test email sent:', result);
      
      addLog('success', `Test email sent to ${recipient}`, 'Email Service');
      socket.emit('emailTestResult', { success: true, message: 'Test email sent successfully', messageId: result.messageId });
    } catch (error) {
      console.error('Failed to send test email:', error);
      addLog('error', `Failed to send test email: ${error.message}`, 'Email Service');
      socket.emit('emailTestResult', { success: false, message: error.message });
    }
  });

  socket.on('addDevice', (device) => {
    const newDevice = {
      ...device,
      id: device.id || Date.now().toString(),
      status: 'offline',
      lastUpdated: null,
      lastError: null,
      lastData: null
    };
    devices.push(newDevice);
    startDevicePolling(newDevice);
    updateStats();
    addLog('info', `Device added: ${newDevice.name}`, newDevice.name);
    io.emit('devicesUpdate', devices);
  });

  socket.on('updateDevice', (updatedDevice) => {
    const index = devices.findIndex(d => d.id === updatedDevice.id);
    if (index !== -1) {
      stopDevicePolling(updatedDevice.id);
      devices[index] = {
        ...updatedDevice,
        status: devices[index].status,
        lastUpdated: devices[index].lastUpdated,
        lastError: devices[index].lastError,
        lastData: devices[index].lastData
      };
      startDevicePolling(devices[index]);
      updateStats();
      addLog('info', `Device updated: ${updatedDevice.name}`, updatedDevice.name);
      io.emit('devicesUpdate', devices);
    }
  });

  socket.on('deleteDevice', (deviceId) => {
    const deviceIndex = devices.findIndex(d => d.id === deviceId);
    if (deviceIndex !== -1) {
      const device = devices[deviceIndex];
      stopDevicePolling(deviceId);
      devices.splice(deviceIndex, 1);
      updateStats();
      addLog('info', `Device deleted: ${device.name}`, device.name);
      io.emit('devicesUpdate', devices);
    }
  });

  socket.on('updateSettings', async (newSettings) => {
    const oldModbusSlaveEnabled = settings.modbusSlave.enabled;
    const oldEmailSettings = JSON.stringify(settings.email);

    settings = { ...settings, ...newSettings };
    console.log('Settings updated:', JSON.stringify(newSettings, null, 2));

    initializeMQTT();

    // Handle Modbus slave server changes
    if (settings.modbusSlave.enabled !== oldModbusSlaveEnabled || (settings.modbusSlave.enabled && newSettings.modbusSlave)) {
      try {
        if (settings.modbusSlave.enabled) {
          await modbusSlaveServer.start(settings.modbusSlave, addLog);
          modbusSlaveServer.updateDeviceData(devices);
        } else {
          await modbusSlaveServer.stop();
        }
      } catch (error) {
        console.error('Failed to update Modbus slave:', error);
        addLog('error', `Failed to update Modbus slave: ${error.message}`, 'System');
      }
    }

    // Handle email service changes
    if (newSettings.email && JSON.stringify(settings.email) !== oldEmailSettings) {
      console.log('Email settings changed, reinitializing...');
      emailService.configure(settings.email, addLog);
    }

    addLog('info', 'Settings updated', 'System');
    io.emit('settingsUpdate', settings);

    // Send updated Modbus slave info
    const info = modbusSlaveServer.getRegisterMappings();
    io.emit('modbusSlaveInfo', info);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    addLog('info', 'Web client disconnected', 'System');
  });
});

// Initialize all services
initializeServices();

// Update stats every 10 seconds
setInterval(updateStats, 10000);

// Update Modbus slave registers every 30 seconds if enabled
setInterval(() => {
  if (settings.modbusSlave.enabled && modbusSlaveServer.isRunning) {
    modbusSlaveServer.updateDeviceData(devices);
    const info = modbusSlaveServer.getRegisterMappings();
    io.emit('modbusSlaveInfo', info);
  }
}, 30000);

// Flush history buffers every 5 minutes
setInterval(() => {
  dataHistoryManager.flushAllBuffers();
}, 5 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`IoT Protocol Gateway server running on port ${PORT}`);
  addLog('success', `Gateway server started on port ${PORT}`, 'System');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gateway...');

  // Flush all history buffers before shutdown
  dataHistoryManager.flushAllBuffers();

  // Stop all device pollers
  devicePollers.forEach((pollerId) => {
    clearInterval(pollerId);
  });

  // Close MQTT connection
  if (mqttClient) {
    mqttClient.end();
  }

  // Stop Modbus slave server
  await modbusSlaveServer.stop();

  // Close server
  server.close(() => {
    console.log('Gateway server stopped');
    process.exit(0);
  });
});