// BACnet client simulation for discovery functionality
class BACnetClient {
  constructor() {
    this.devices = new Map();
    this.onLogCallback = null;
  }

  // Initialize BACnet client
  initialize(onLog) {
    this.onLogCallback = onLog;
    this.log('info', 'BACnet client initialized');
  }

  // Simulate WHO-IS discovery
  async discoverDevices(options = {}) {
    const {
      networkRange = 'local',
      timeout = 5000,
      maxDevices = 50,
      includeObjects = true
    } = options;

    this.log('info', `Starting BACnet discovery (timeout: ${timeout}ms, max: ${maxDevices})`);

    // Simulate discovery delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulated discovered devices
    const discoveredDevices = [
      {
        deviceId: '12345',
        deviceName: 'HVAC Controller 1',
        vendorName: 'Honeywell',
        modelName: 'Excel 5000',
        address: '192.168.1.100',
        port: 47808,
        networkNumber: 0,
        macAddress: '10:20:30:40:50:01',
        maxApduLength: 1476,
        segmentationSupported: 'segmented-both',
        firmwareRevision: '2.1.3',
        applicationSoftwareVersion: '1.5.2',
        objectList: [
          { objectType: 'analog-input', instance: 0, objectName: 'Zone 1 Temperature', description: 'Zone 1 Room Temperature', units: 'degrees-celsius' },
          { objectType: 'analog-input', instance: 1, objectName: 'Zone 1 Humidity', description: 'Zone 1 Relative Humidity', units: 'percent' },
          { objectType: 'analog-output', instance: 0, objectName: 'Zone 1 Setpoint', description: 'Zone 1 Temperature Setpoint', units: 'degrees-celsius' },
          { objectType: 'binary-input', instance: 0, objectName: 'Zone 1 Occupancy', description: 'Zone 1 Occupancy Sensor', units: 'no-units' },
          { objectType: 'binary-output', instance: 0, objectName: 'Zone 1 Fan', description: 'Zone 1 Fan Control', units: 'no-units' }
        ]
      },
      {
        deviceId: '23456',
        deviceName: 'Lighting Controller',
        vendorName: 'Johnson Controls',
        modelName: 'LightManager Pro',
        address: '192.168.1.101',
        port: 47808,
        networkNumber: 0,
        macAddress: '10:20:30:40:50:02',
        maxApduLength: 1024,
        segmentationSupported: 'no-segmentation',
        firmwareRevision: '3.2.1',
        applicationSoftwareVersion: '2.1.0',
        objectList: [
          { objectType: 'binary-output', instance: 0, objectName: 'Zone A Lights', description: 'Zone A Light Control', units: 'no-units' },
          { objectType: 'binary-output', instance: 1, objectName: 'Zone B Lights', description: 'Zone B Light Control', units: 'no-units' },
          { objectType: 'analog-output', instance: 0, objectName: 'Zone A Dimmer', description: 'Zone A Dimmer Level', units: 'percent' },
          { objectType: 'analog-input', instance: 0, objectName: 'Light Sensor', description: 'Ambient Light Level', units: 'lux' }
        ]
      }
    ];

    // Store discovered devices
    discoveredDevices.forEach(device => {
      this.devices.set(device.deviceId, device);
    });

    this.log('success', `Discovered ${discoveredDevices.length} BACnet devices`);
    return discoveredDevices;
  }

  // Read BACnet device data
  async readDevice(deviceConfig) {
    const deviceId = deviceConfig.deviceId;
    const device = this.devices.get(deviceId);
    
    if (!device) {
      throw new Error(`Device ${deviceId} not found`);
    }

    // Simulate reading object values
    const data = {};
    
    if (device.objectList) {
      device.objectList.forEach((obj, index) => {
        // Generate realistic simulated values based on object type
        let value;
        
        switch (obj.objectType) {
          case 'analog-input':
            if (obj.objectName.toLowerCase().includes('temperature')) {
              value = 20 + Math.random() * 10; // 20-30°C
            } else if (obj.objectName.toLowerCase().includes('humidity')) {
              value = 40 + Math.random() * 20; // 40-60%
            } else if (obj.objectName.toLowerCase().includes('light')) {
              value = 100 + Math.random() * 900; // 100-1000 lux
            } else if (obj.objectName.toLowerCase().includes('power')) {
              value = 1000 + Math.random() * 5000; // 1-6 kW
            } else if (obj.objectName.toLowerCase().includes('voltage')) {
              value = 220 + Math.random() * 20; // 220-240V
            } else if (obj.objectName.toLowerCase().includes('current')) {
              value = 5 + Math.random() * 15; // 5-20A
            } else {
              value = Math.random() * 100;
            }
            break;
            
          case 'analog-output':
            if (obj.objectName.toLowerCase().includes('setpoint')) {
              value = 22 + Math.random() * 4; // 22-26°C
            } else if (obj.objectName.toLowerCase().includes('damper')) {
              value = 30 + Math.random() * 40; // 30-70%
            } else if (obj.objectName.toLowerCase().includes('valve')) {
              value = 20 + Math.random() * 60; // 20-80%
            } else if (obj.objectName.toLowerCase().includes('dimmer')) {
              value = 50 + Math.random() * 50; // 50-100%
            } else {
              value = Math.random() * 100;
            }
            break;
            
          case 'binary-input':
          case 'binary-output':
            value = Math.random() > 0.5 ? 1 : 0;
            break;
            
          case 'multi-state-input':
          case 'multi-state-output':
            value = Math.floor(Math.random() * 4) + 1; // 1-4
            break;
            
          default:
            value = Math.random() * 100;
        }
        
        // Use object instance as key, or create a sequential key
        const key = `object_${obj.instance || index}`;
        data[key] = parseFloat(value.toFixed(2));
      });
    } else {
      // Fallback if no object list
      const objectIds = deviceConfig.registers ? deviceConfig.registers.split(',') : ['1', '2', '3'];
      objectIds.forEach(id => {
        data[`object_${id.trim()}`] = Math.random() * 100;
      });
    }

    return data;
  }

  // Get device information
  getDeviceInfo(deviceId) {
    return this.devices.get(deviceId);
  }

  // Get all discovered devices
  getAllDevices() {
    return Array.from(this.devices.values());
  }

  // Logging helper
  log(level, message) {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, 'BACnet Client');
    }
  }
}

export default BACnetClient;