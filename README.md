# IoT Protocol Gateway

A comprehensive IoT protocol gateway that converts Modbus TCP, BACnet/IP, and SNMP data to MQTT with a modern web interface.

## Features

- **Multi-Protocol Support**: Modbus TCP, BACnet/IP, and SNMP
- **MQTT Publishing**: Converts all protocol data to MQTT messages
- **Web Interface**: Modern React-based configuration and monitoring interface
- **Real-time Monitoring**: Live device status and data visualization
- **Device Management**: Easy device configuration and management
- **Logging System**: Comprehensive logging with filtering and export
- **Statistics Dashboard**: Real-time statistics and charts

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Debian Linux OS
- MQTT broker (Mosquitto recommended)

### Install Dependencies

```bash
npm install
```

### Install MQTT Broker (Mosquitto)

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl start mosquitto
sudo systemctl enable mosquitto
```

## Configuration

### MQTT Broker Setup

The gateway connects to an MQTT broker to publish device data. Configure your MQTT settings in the web interface:

1. Broker Host: localhost (or your MQTT broker IP)
2. Port: 1883 (default MQTT port)
3. Username/Password: If required by your broker
4. Base Topic: iot/gateway (or your preferred topic structure)

### Device Configuration

Add devices through the web interface with the following parameters:

#### Modbus TCP
- Host/IP Address
- Port (default: 502)
- Device/Unit ID
- Registers (comma-separated, e.g., 40001,40002,40003)
- Poll Interval

#### BACnet/IP
- Host/IP Address
- Port (default: 47808)
- Device ID
- Object IDs (comma-separated)
- Poll Interval

#### SNMP
- Host/IP Address
- Port (default: 161)
- Community String (configured as Device ID)
- OIDs (comma-separated)
- Poll Interval

## Usage

### Development Mode

```bash
npm start
```

This starts both the backend server (port 3001) and frontend development server (port 5173).

### Production Mode

```bash
npm run build
npm run server
```

### Accessing the Interface

Open your web browser and navigate to:
- Development: http://localhost:5173
- Production: Serve the built files from the `dist` directory

## System Service Setup (Debian)

Create a systemd service for automatic startup:

```bash
sudo nano /etc/systemd/system/iot-gateway.service
```

Add the following content:

```ini
[Unit]
Description=IoT Protocol Gateway
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/iot-gateway
ExecStart=/usr/bin/node server/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable iot-gateway
sudo systemctl start iot-gateway
```

## MQTT Message Format

The gateway publishes device data in the following JSON format:

```json
{
  "deviceId": "device_123",
  "deviceName": "Temperature Sensor",
  "protocol": "modbus",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "register_40001": 25.6,
    "register_40002": 60.2,
    "register_40003": 1013.25
  }
}
```

## API Endpoints

The gateway provides WebSocket communication for real-time updates:

- Device management (add, update, delete)
- Settings configuration
- Real-time device status updates
- Live logging

## Troubleshooting

### Common Issues

1. **MQTT Connection Failed**: Check broker settings and network connectivity
2. **Device Not Responding**: Verify device IP address, port, and protocol settings
3. **Permission Denied**: Ensure proper user permissions for system service

### Logs

Monitor gateway logs through:
- Web interface Logs page
- System logs: `journalctl -u iot-gateway -f`
- Application logs: Check console output

## Security Considerations

- Use MQTT authentication (username/password)
- Configure firewall rules for device access
- Use TLS/SSL for MQTT connections in production
- Regularly update dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details