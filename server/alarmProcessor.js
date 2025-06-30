class AlarmProcessor {
  constructor() {
    this.alarms = [];
    this.deviceHistory = new Map();
    this.activeAlarms = new Map();
    this.onLogCallback = null;
    this.onEmailCallback = null;
  }

  // Initialize alarm processor
  initialize(onLog, onEmail) {
    this.onLogCallback = onLog;
    this.onEmailCallback = onEmail;
    this.log('info', 'Alarm processor initialized');
  }

  // Update alarms configuration
  updateAlarms(alarms) {
    this.alarms = alarms.filter(alarm => alarm.enabled);
    this.log('info', `Updated alarm configuration: ${this.alarms.length} active alarms`);
  }

  // Process device data for alarms
  processDeviceData(device) {
    if (!device.lastData || !device.lastUpdated) return;

    // Store device history for change detection
    const deviceId = device.id;
    if (!this.deviceHistory.has(deviceId)) {
      this.deviceHistory.set(deviceId, []);
    }

    const history = this.deviceHistory.get(deviceId);
    history.push({
      timestamp: device.lastUpdated,
      data: { ...device.lastData },
      status: device.status
    });

    // Keep only last 10 entries
    if (history.length > 10) {
      history.shift();
    }

    // Check alarms for this device
    this.checkDeviceAlarms(device, history);
  }

  // Check all alarms for a device
  checkDeviceAlarms(device, history) {
    const deviceAlarms = this.alarms.filter(alarm => alarm.deviceId === device.id);

    deviceAlarms.forEach(alarm => {
      try {
        const shouldTrigger = this.evaluateAlarm(alarm, device, history);
        
        if (shouldTrigger) {
          this.triggerAlarm(alarm, device, history);
        }
      } catch (error) {
        this.log('error', `Error evaluating alarm ${alarm.name}: ${error.message}`);
      }
    });
  }

  // Evaluate if an alarm should trigger
  evaluateAlarm(alarm, device, history) {
    const now = Date.now();
    const alarmKey = `${alarm.id}`;

    // Check cooldown period
    if (this.activeAlarms.has(alarmKey)) {
      const lastTriggered = this.activeAlarms.get(alarmKey);
      if (now - lastTriggered < alarm.cooldownPeriod) {
        return false;
      }
    }

    switch (alarm.type) {
      case 'threshold':
        return this.evaluateThreshold(alarm, device);
      
      case 'range':
        return this.evaluateRange(alarm, device);
      
      case 'change':
        return this.evaluateChange(alarm, device, history);
      
      case 'status':
        return this.evaluateStatus(alarm, device);
      
      default:
        return false;
    }
  }

  // Evaluate threshold alarm
  evaluateThreshold(alarm, device) {
    const value = device.lastData[alarm.dataKey];
    if (value === undefined || value === null) return false;

    const numValue = parseFloat(value);
    const threshold = parseFloat(alarm.value);

    if (isNaN(numValue) || isNaN(threshold)) return false;

    switch (alarm.operator) {
      case 'gt': return numValue > threshold;
      case 'gte': return numValue >= threshold;
      case 'lt': return numValue < threshold;
      case 'lte': return numValue <= threshold;
      case 'eq': return numValue === threshold;
      case 'ne': return numValue !== threshold;
      default: return false;
    }
  }

  // Evaluate range alarm
  evaluateRange(alarm, device) {
    const value = device.lastData[alarm.dataKey];
    if (value === undefined || value === null) return false;

    const numValue = parseFloat(value);
    const minValue = parseFloat(alarm.minValue);
    const maxValue = parseFloat(alarm.maxValue);

    if (isNaN(numValue) || isNaN(minValue) || isNaN(maxValue)) return false;

    return numValue < minValue || numValue > maxValue;
  }

  // Evaluate change alarm
  evaluateChange(alarm, device, history) {
    if (history.length < 2) return false;

    const currentValue = device.lastData[alarm.dataKey];
    const previousValue = history[history.length - 2].data[alarm.dataKey];

    if (currentValue === undefined || previousValue === undefined) return false;

    const current = parseFloat(currentValue);
    const previous = parseFloat(previousValue);
    const changeAmount = parseFloat(alarm.changeAmount);

    if (isNaN(current) || isNaN(previous) || isNaN(changeAmount)) return false;

    return Math.abs(current - previous) >= changeAmount;
  }

  // Evaluate status alarm
  evaluateStatus(alarm, device) {
    return device.status === 'offline' || device.status === 'error';
  }

  // Trigger an alarm
  triggerAlarm(alarm, device, history) {
    const now = Date.now();
    const alarmKey = `${alarm.id}`;

    // Update cooldown
    this.activeAlarms.set(alarmKey, now);

    // Create alarm event
    const alarmEvent = {
      id: `${alarm.id}_${now}`,
      alarmId: alarm.id,
      alarmName: alarm.name,
      deviceId: device.id,
      deviceName: device.name,
      severity: alarm.severity,
      type: alarm.type,
      triggeredAt: new Date(now).toISOString(),
      message: this.generateAlarmMessage(alarm, device),
      value: alarm.type !== 'status' ? device.lastData[alarm.dataKey] : device.status,
      condition: this.getConditionText(alarm)
    };

    // Log the alarm
    this.log('warning', `ALARM TRIGGERED: ${alarm.name} - ${alarmEvent.message}`, device.name);

    // Send email notification if enabled
    if (alarm.emailNotification && this.onEmailCallback) {
      this.sendAlarmEmail(alarmEvent, device).catch(error => {
        this.log('error', `Failed to send alarm email: ${error.message}`);
      });
    }

    // Store active alarm
    this.storeActiveAlarm(alarmEvent);

    // Update alarm statistics
    this.updateAlarmStats(alarm.id);
  }

  // Generate alarm message
  generateAlarmMessage(alarm, device) {
    switch (alarm.type) {
      case 'threshold':
        const operators = {
          gt: 'exceeded',
          gte: 'reached or exceeded',
          lt: 'dropped below',
          lte: 'reached or dropped below',
          eq: 'equals',
          ne: 'does not equal'
        };
        return `${alarm.dataKey} ${operators[alarm.operator]} threshold ${alarm.value} (current: ${device.lastData[alarm.dataKey]})`;
      
      case 'range':
        return `${alarm.dataKey} is outside range ${alarm.minValue}-${alarm.maxValue} (current: ${device.lastData[alarm.dataKey]})`;
      
      case 'change':
        return `${alarm.dataKey} changed by more than ${alarm.changeAmount} (current: ${device.lastData[alarm.dataKey]})`;
      
      case 'status':
        return `Device status changed to ${device.status}`;
      
      default:
        return 'Alarm condition met';
    }
  }

  // Get condition text for display
  getConditionText(alarm) {
    switch (alarm.type) {
      case 'threshold':
        const operators = { gt: '>', gte: '≥', lt: '<', lte: '≤', eq: '=', ne: '≠' };
        return `${alarm.dataKey} ${operators[alarm.operator]} ${alarm.value}`;
      
      case 'range':
        return `${alarm.dataKey} outside ${alarm.minValue}-${alarm.maxValue}`;
      
      case 'change':
        return `${alarm.dataKey} changes by ±${alarm.changeAmount}`;
      
      case 'status':
        return 'Device offline/error';
      
      default:
        return 'Unknown condition';
    }
  }

  // Send alarm email
  async sendAlarmEmail(alarmEvent, device) {
    if (!this.onEmailCallback) return;

    const subject = `ALARM: ${alarmEvent.alarmName} - ${device.name}`;
    const details = {
      alarm: alarmEvent,
      device: device,
      timestamp: alarmEvent.triggeredAt
    };

    await this.onEmailCallback('alarm', alarmEvent.message, details);
  }

  // Store active alarm in localStorage for UI
  storeActiveAlarm(alarmEvent) {
    try {
      const activeAlarms = JSON.parse(global.localStorage?.getItem('activeAlarms') || '[]');
      activeAlarms.push(alarmEvent);
      
      // Keep only last 50 active alarms
      const limitedAlarms = activeAlarms.slice(-50);
      
      if (global.localStorage) {
        global.localStorage.setItem('activeAlarms', JSON.stringify(limitedAlarms));
      }
    } catch (error) {
      // Fallback for server-side storage
      this.log('warning', 'Could not store active alarm in localStorage');
    }
  }

  // Update alarm statistics
  updateAlarmStats(alarmId) {
    try {
      const alarms = JSON.parse(global.localStorage?.getItem('deviceAlarms') || '[]');
      const updatedAlarms = alarms.map(alarm => {
        if (alarm.id === alarmId) {
          return {
            ...alarm,
            triggerCount: (alarm.triggerCount || 0) + 1,
            lastTriggered: new Date().toISOString()
          };
        }
        return alarm;
      });
      
      if (global.localStorage) {
        global.localStorage.setItem('deviceAlarms', JSON.stringify(updatedAlarms));
      }
    } catch (error) {
      this.log('warning', 'Could not update alarm statistics');
    }
  }

  // Get alarm statistics
  getAlarmStats() {
    return {
      totalAlarms: this.alarms.length,
      activeAlarmsCount: this.activeAlarms.size,
      devicesCovered: new Set(this.alarms.map(a => a.deviceId)).size
    };
  }

  // Logging helper
  log(level, message, device = null) {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, device || 'Alarm System');
    }
  }
}

export default AlarmProcessor;