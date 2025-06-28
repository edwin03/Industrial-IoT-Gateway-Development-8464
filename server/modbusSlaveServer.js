import ModbusRTU from 'modbus-serial';

class ModbusSlaveServer {
  constructor() {
    this.server = null;
    this.isRunning = false;
    this.port = 5020;
    this.registers = new Map(); // Map of register address to value
    this.deviceDataMap = new Map(); // Map device data to register addresses
    this.registerMap = []; // Array of register mappings for UI
    this.onLogCallback = null;
  }

  // Initialize the Modbus slave server
  async start(config, onLog) {
    try {
      if (this.isRunning) {
        await this.stop();
      }

      this.port = config.port || 5020;
      this.onLogCallback = onLog;
      
      // Create new server instance
      this.server = new ModbusRTU.ServerTCP({
        host: '0.0.0.0',
        port: this.port,
        debug: false,
        unitID: config.unitId || 1
      });

      // Set up holding registers (40001-49999)
      this.server.setRequestHandler(3, (addr, length) => {
        this.log('info', `Modbus read request: address=${addr}, length=${length}`);
        
        const values = [];
        for (let i = 0; i < length; i++) {
          const registerAddr = addr + i;
          const value = this.registers.get(registerAddr) || 0;
          values.push(value);
        }
        
        return values;
      });

      // Set up input registers (30001-39999) - read-only
      this.server.setRequestHandler(4, (addr, length) => {
        this.log('info', `Modbus input register read: address=${addr}, length=${length}`);
        
        const values = [];
        for (let i = 0; i < length; i++) {
          const registerAddr = addr + i;
          const value = this.registers.get(registerAddr + 30000) || 0; // Offset for input registers
          values.push(value);
        }
        
        return values;
      });

      // Start the server
      await new Promise((resolve, reject) => {
        this.server.on('error', (err) => {
          this.log('error', `Modbus slave server error: ${err.message}`);
          reject(err);
        });

        this.server.on('initialized', () => {
          this.isRunning = true;
          this.log('success', `Modbus slave server started on port ${this.port}`);
          resolve();
        });

        this.server.on('connection', (client) => {
          this.log('info', `Modbus client connected: ${client.remoteAddress}`);
        });

        this.server.on('disconnection', (client) => {
          this.log('info', `Modbus client disconnected: ${client.remoteAddress}`);
        });
      });

    } catch (error) {
      this.log('error', `Failed to start Modbus slave server: ${error.message}`);
      throw error;
    }
  }

  // Stop the Modbus slave server
  async stop() {
    if (this.server && this.isRunning) {
      try {
        await new Promise((resolve) => {
          this.server.close(() => {
            this.isRunning = false;
            this.log('info', 'Modbus slave server stopped');
            resolve();
          });
        });
        this.server = null;
      } catch (error) {
        this.log('error', `Error stopping Modbus slave server: ${error.message}`);
      }
    }
  }

  // Update device data and map to registers
  updateDeviceData(devices) {
    this.registers.clear();
    this.deviceDataMap.clear();
    this.registerMap = [];

    let holdingRegisterAddr = 40001;
    let inputRegisterAddr = 30001;

    devices.forEach(device => {
      if (device.status === 'online' && device.lastData) {
        Object.entries(device.lastData).forEach(([key, value]) => {
          // Convert value to number
          let numValue = 0;
          if (typeof value === 'number') {
            numValue = Math.round(value * 100); // Scale and round for integer storage
          } else if (typeof value === 'string') {
            const parsed = parseFloat(value);
            numValue = isNaN(parsed) ? 0 : Math.round(parsed * 100);
          }

          // Ensure value fits in 16-bit signed integer range
          numValue = Math.max(-32768, Math.min(32767, numValue));

          // Store in holding registers (read/write)
          this.registers.set(holdingRegisterAddr, numValue);
          
          // Also store in input registers (read-only)
          this.registers.set(inputRegisterAddr + 30000, numValue);

          // Create mapping for UI
          const mapping = {
            deviceId: device.id,
            deviceName: device.name,
            dataKey: key,
            originalValue: value,
            scaledValue: numValue,
            holdingRegister: holdingRegisterAddr,
            inputRegister: inputRegisterAddr,
            description: `${device.name} - ${key}`,
            unit: this.detectUnit(key),
            timestamp: device.lastUpdated
          };

          this.registerMap.push(mapping);
          this.deviceDataMap.set(holdingRegisterAddr, mapping);

          holdingRegisterAddr++;
          inputRegisterAddr++;
        });
      }
    });

    if (this.onLogCallback) {
      this.log('info', `Updated ${this.registerMap.length} Modbus registers from ${devices.length} devices`);
    }
  }

  // Detect unit based on data key name
  detectUnit(key) {
    const keyLower = key.toLowerCase();
    if (keyLower.includes('temp')) return '°C';
    if (keyLower.includes('humid')) return '%';
    if (keyLower.includes('pressure')) return 'Pa';
    if (keyLower.includes('voltage') || keyLower.includes('volt')) return 'V';
    if (keyLower.includes('current') || keyLower.includes('amp')) return 'A';
    if (keyLower.includes('power') || keyLower.includes('watt')) return 'W';
    if (keyLower.includes('flow')) return 'L/min';
    if (keyLower.includes('level')) return '%';
    if (keyLower.includes('speed')) return 'RPM';
    if (keyLower.includes('freq')) return 'Hz';
    return '';
  }

  // Get register mappings for UI
  getRegisterMappings() {
    return {
      mappings: this.registerMap,
      totalRegisters: this.registerMap.length,
      isRunning: this.isRunning,
      port: this.port,
      holdingRegisterRange: this.registerMap.length > 0 ? 
        `${Math.min(...this.registerMap.map(m => m.holdingRegister))}-${Math.max(...this.registerMap.map(m => m.holdingRegister))}` : 
        'None',
      inputRegisterRange: this.registerMap.length > 0 ? 
        `${Math.min(...this.registerMap.map(m => m.inputRegister))}-${Math.max(...this.registerMap.map(m => m.inputRegister))}` : 
        'None'
    };
  }

  // Logging helper
  log(level, message) {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, 'Modbus Slave');
    }
  }

  // Get server status
  getStatus() {
    return {
      isRunning: this.isRunning,
      port: this.port,
      registerCount: this.registers.size,
      deviceCount: this.deviceDataMap.size
    };
  }
}

export default ModbusSlaveServer;