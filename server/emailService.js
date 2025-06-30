import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = null;
    this.settings = {
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
    };
    this.onLogCallback = null;
    this.lastNotifications = new Map(); // Prevent spam
  }

  // Initialize email service with settings
  configure(settings, onLog) {
    this.settings = { ...this.settings, ...settings };
    this.onLogCallback = onLog;
    
    this.log('info', 'Configuring email service...');
    console.log('Email service configure called with:', JSON.stringify(settings, null, 2));
    
    if (this.settings.enabled && this.settings.smtp.host && this.settings.smtp.username) {
      this.createTransporter();
    } else {
      this.transporter = null;
      if (this.settings.enabled) {
        this.log('warning', 'Email enabled but SMTP settings incomplete');
      } else {
        this.log('info', 'Email service disabled');
      }
    }
  }

  // Create nodemailer transporter
  createTransporter() {
    try {
      this.log('info', `Creating SMTP transporter for ${this.settings.smtp.host}:${this.settings.smtp.port}`);
      
      const transportConfig = {
        host: this.settings.smtp.host,
        port: parseInt(this.settings.smtp.port),
        secure: this.settings.smtp.secure, // true for 465, false for other ports
        auth: {
          user: this.settings.smtp.username,
          pass: this.settings.smtp.password
        },
        tls: {
          rejectUnauthorized: false // Allow self-signed certificates
        },
        connectionTimeout: 60000, // 60 seconds
        greetingTimeout: 30000,    // 30 seconds
        socketTimeout: 60000       // 60 seconds
      };

      // Remove auth if no username/password provided
      if (!this.settings.smtp.username || !this.settings.smtp.password) {
        delete transportConfig.auth;
        this.log('warning', 'No SMTP credentials provided, using unauthenticated connection');
      }

      // FIXED: Use the correct method name - createTransport (not createTransporter)
      this.transporter = nodemailer.createTransport(transportConfig);
      this.log('success', 'SMTP transporter configured successfully');
      
      console.log('SMTP transporter created with config:', {
        host: transportConfig.host,
        port: transportConfig.port,
        secure: transportConfig.secure,
        hasAuth: !!transportConfig.auth
      });
      
    } catch (error) {
      this.log('error', `Failed to configure SMTP: ${error.message}`);
      this.transporter = null;
      console.error('Error creating SMTP transporter:', error);
    }
  }

  // Test email connection
  async testConnection() {
    console.log('testConnection called');
    console.log('Transporter exists:', !!this.transporter);
    console.log('Current settings:', JSON.stringify(this.settings, null, 2));
    
    if (!this.transporter) {
      const error = new Error('SMTP not configured. Please check your SMTP settings.');
      console.error('Test connection failed - no transporter:', error.message);
      throw error;
    }

    try {
      this.log('info', 'Testing SMTP connection...');
      console.log('Calling transporter.verify()...');
      
      const result = await this.transporter.verify();
      console.log('SMTP verify result:', result);
      
      this.log('success', 'SMTP connection test successful');
      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error) {
      console.error('SMTP verify failed:', error);
      this.log('error', `SMTP connection test failed: ${error.message}`);
      throw new Error(`Connection failed: ${error.message}`);
    }
  }

  // Send test email
  async sendTestEmail(recipient) {
    console.log('sendTestEmail called with recipient:', recipient);
    
    if (!this.transporter) {
      const error = new Error('SMTP not configured. Please check your SMTP settings.');
      console.error('Send test email failed - no transporter:', error.message);
      throw error;
    }

    if (this.settings.recipients.length === 0 && !recipient) {
      const error = new Error('No recipients configured. Please add at least one email recipient.');
      console.error('Send test email failed - no recipients:', error.message);
      throw error;
    }

    const toEmail = recipient || this.settings.recipients[0];
    const fromEmail = this.settings.from || this.settings.smtp.username;

    if (!fromEmail) {
      const error = new Error('No "from" email address configured. Please set a from address or username.');
      console.error('Send test email failed - no from address:', error.message);
      throw error;
    }

    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject: 'IoT Gateway - Test Email',
      html: this.generateTestEmailTemplate()
    };

    try {
      this.log('info', `Sending test email to ${toEmail}...`);
      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info);
      
      this.log('success', `Test email sent to ${toEmail} (MessageID: ${info.messageId})`);
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Failed to send test email:', error);
      this.log('error', `Failed to send test email: ${error.message}`);
      throw error;
    }
  }

  // Send device notification
  async sendDeviceNotification(device, eventType, details = {}) {
    if (!this.shouldSendNotification(eventType, device.id)) {
      return;
    }

    if (!this.transporter) {
      this.log('warning', 'Cannot send device notification - SMTP not configured');
      return;
    }

    const subject = this.getNotificationSubject(eventType, device);
    const html = this.generateDeviceNotificationTemplate(device, eventType, details);

    await this.sendNotification(subject, html, `device_${device.id}_${eventType}`);
  }

  // Send system notification
  async sendSystemNotification(eventType, message, details = {}) {
    if (!this.shouldSendNotification(eventType)) {
      return;
    }

    if (!this.transporter) {
      this.log('warning', 'Cannot send system notification - SMTP not configured');
      return;
    }

    const subject = `IoT Gateway - System ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`;
    const html = this.generateSystemNotificationTemplate(eventType, message, details);

    await this.sendNotification(subject, html, `system_${eventType}`);
  }

  // Send daily summary
  async sendDailySummary(stats, devices, errorCount) {
    if (!this.settings.notifications.dailySummary) {
      return;
    }

    if (!this.transporter) {
      this.log('warning', 'Cannot send daily summary - SMTP not configured');
      return;
    }

    const subject = `IoT Gateway - Daily Summary (${new Date().toLocaleDateString()})`;
    const html = this.generateDailySummaryTemplate(stats, devices, errorCount);

    await this.sendNotification(subject, html, 'daily_summary');
  }

  // Core send notification method
  async sendNotification(subject, html, notificationKey) {
    if (!this.transporter || this.settings.recipients.length === 0) {
      this.log('warning', 'Cannot send notification - SMTP not configured or no recipients');
      return;
    }

    const fromEmail = this.settings.from || this.settings.smtp.username;

    if (!fromEmail) {
      this.log('error', 'Cannot send notification - no from email address configured');
      return;
    }

    const mailOptions = {
      from: fromEmail,
      to: this.settings.recipients.join(','),
      subject,
      html
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.log('info', `Email notification sent: ${subject} (MessageID: ${info.messageId})`);

      // Track notification to prevent spam
      this.lastNotifications.set(notificationKey, Date.now());

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      this.log('error', `Failed to send email notification: ${error.message}`);
      throw error;
    }
  }

  // Check if notification should be sent (prevent spam)
  shouldSendNotification(eventType, deviceId = null) {
    if (!this.settings.enabled || !this.settings.notifications[eventType]) {
      return false;
    }

    const notificationKey = deviceId ? `device_${deviceId}_${eventType}` : `system_${eventType}`;
    const lastSent = this.lastNotifications.get(notificationKey);
    const cooldownPeriod = this.getCooldownPeriod(eventType);

    return !lastSent || (Date.now() - lastSent) > cooldownPeriod;
  }

  // Get cooldown period for different event types
  getCooldownPeriod(eventType) {
    const periods = {
      deviceOffline: 30 * 60 * 1000,  // 30 minutes
      deviceError: 15 * 60 * 1000,    // 15 minutes
      deviceOnline: 5 * 60 * 1000,    // 5 minutes
      systemErrors: 10 * 60 * 1000,   // 10 minutes
      dailySummary: 24 * 60 * 60 * 1000 // 24 hours
    };

    return periods[eventType] || 15 * 60 * 1000; // Default 15 minutes
  }

  // Generate notification subject
  getNotificationSubject(eventType, device) {
    const subjects = {
      deviceOffline: `Device Offline: ${device.name}`,
      deviceError: `Device Error: ${device.name}`,
      deviceOnline: `Device Online: ${device.name}`
    };

    return `IoT Gateway - ${subjects[eventType] || 'Device Notification'}`;
  }

  // Generate test email template
  generateTestEmailTemplate() {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .success { color: #10b981; font-weight: bold; }
            .info { background: #e0f2fe; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>IoT Gateway Test Email</h2>
            </div>
            <div class="content">
              <p class="success">✅ Email configuration is working correctly!</p>
              <p>This is a test email to verify that your SMTP settings are properly configured.</p>
              
              <div class="info">
                <h4>Configuration Details:</h4>
                <p><strong>SMTP Host:</strong> ${this.settings.smtp.host}</p>
                <p><strong>Port:</strong> ${this.settings.smtp.port}</p>
                <p><strong>Security:</strong> ${this.settings.smtp.secure ? 'SSL/TLS' : 'STARTTLS'}</p>
                <p><strong>Username:</strong> ${this.settings.smtp.username}</p>
                <p><strong>From Address:</strong> ${this.settings.from || this.settings.smtp.username}</p>
              </div>
              
              <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p style="color: #666; font-size: 12px;">
                This email was sent by the IoT Protocol Gateway system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate device notification template
  generateDeviceNotificationTemplate(device, eventType, details) {
    const statusColors = {
      deviceOffline: '#ef4444',
      deviceError: '#f59e0b',
      deviceOnline: '#10b981'
    };

    const statusIcons = {
      deviceOffline: '🔴',
      deviceError: '⚠️',
      deviceOnline: '🟢'
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusColors[eventType] || '#3b82f6'}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .device-info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .detail-row { display: flex; justify-content: space-between; margin: 5px 0; }
            .label { font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${statusIcons[eventType]} Device ${eventType.charAt(0).toUpperCase() + eventType.slice(1)}</h2>
            </div>
            <div class="content">
              <div class="device-info">
                <h3>${device.name}</h3>
                <div class="detail-row">
                  <span class="label">Protocol:</span>
                  <span>${device.protocol.toUpperCase()}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Address:</span>
                  <span>${device.host}:${device.port}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Status:</span>
                  <span>${device.status}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Last Updated:</span>
                  <span>${device.lastUpdated ? new Date(device.lastUpdated).toLocaleString() : 'Never'}</span>
                </div>
                ${device.lastError ? `
                  <div class="detail-row">
                    <span class="label">Error:</span>
                    <span style="color: #ef4444;">${device.lastError}</span>
                  </div>
                ` : ''}
              </div>
              
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              
              ${details.message ? `<p><strong>Details:</strong> ${details.message}</p>` : ''}
              ${details.error ? `<p><strong>Error Details:</strong> ${details.error}</p>` : ''}
              
              <hr>
              <p style="color: #666; font-size: 12px;">
                This notification was sent by the IoT Protocol Gateway system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate system notification template
  generateSystemNotificationTemplate(eventType, message, details) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🚨 System Alert</h2>
            </div>
            <div class="content">
              <div class="alert">
                <h3>${eventType.charAt(0).toUpperCase() + eventType.slice(1)}</h3>
                <p>${message}</p>
              </div>
              
              <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
              
              ${details.stack ? `<pre style="background: #f3f4f6; padding: 10px; border-radius: 3px; font-size: 11px;">${details.stack}</pre>` : ''}
              
              <hr>
              <p style="color: #666; font-size: 12px;">
                This alert was sent by the IoT Protocol Gateway system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Generate daily summary template
  generateDailySummaryTemplate(stats, devices, errorCount) {
    const onlineDevices = devices.filter(d => d.status === 'online');
    const offlineDevices = devices.filter(d => d.status === 'offline');
    const errorDevices = devices.filter(d => d.status === 'error');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 5px 5px; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
            .stat-card { background: white; padding: 15px; border-radius: 5px; text-align: center; }
            .stat-value { font-size: 24px; font-weight: bold; margin: 5px 0; }
            .device-list { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>📊 Daily Gateway Summary</h2>
              <p>${new Date().toLocaleDateString()}</p>
            </div>
            <div class="content">
              <div class="stats-grid">
                <div class="stat-card">
                  <div>Total Devices</div>
                  <div class="stat-value" style="color: #3b82f6;">${stats.totalDevices}</div>
                </div>
                <div class="stat-card">
                  <div>Active Devices</div>
                  <div class="stat-value" style="color: #10b981;">${stats.activeDevices}</div>
                </div>
                <div class="stat-card">
                  <div>Messages Processed</div>
                  <div class="stat-value" style="color: #f59e0b;">${stats.messagesProcessed}</div>
                </div>
                <div class="stat-card">
                  <div>Errors</div>
                  <div class="stat-value" style="color: #ef4444;">${errorCount}</div>
                </div>
              </div>
              
              ${onlineDevices.length > 0 ? `
                <div class="device-list">
                  <h4 style="color: #10b981;">🟢 Online Devices (${onlineDevices.length})</h4>
                  ${onlineDevices.map(d => `<div>• ${d.name} (${d.protocol})</div>`).join('')}
                </div>
              ` : ''}
              
              ${offlineDevices.length > 0 ? `
                <div class="device-list">
                  <h4 style="color: #6b7280;">⚫ Offline Devices (${offlineDevices.length})</h4>
                  ${offlineDevices.map(d => `<div>• ${d.name} (${d.protocol})</div>`).join('')}
                </div>
              ` : ''}
              
              ${errorDevices.length > 0 ? `
                <div class="device-list">
                  <h4 style="color: #ef4444;">🔴 Error Devices (${errorDevices.length})</h4>
                  ${errorDevices.map(d => `<div>• ${d.name} - ${d.lastError || 'Unknown error'}</div>`).join('')}
                </div>
              ` : ''}
              
              <hr>
              <p style="color: #666; font-size: 12px;">
                This summary was generated by the IoT Protocol Gateway system.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  // Logging helper
  log(level, message) {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, 'Email Service');
    }
  }

  // Get current settings
  getSettings() {
    return this.settings;
  }

  // Check if service is enabled and configured
  isConfigured() {
    return this.settings.enabled && 
           this.settings.smtp.host && 
           this.settings.smtp.username && 
           this.settings.recipients.length > 0 && 
           this.transporter !== null;
  }

  // Get configuration status for debugging
  getStatus() {
    return {
      enabled: this.settings.enabled,
      hasHost: !!this.settings.smtp.host,
      hasUsername: !!this.settings.smtp.username,
      hasPassword: !!this.settings.smtp.password,
      hasRecipients: this.settings.recipients.length > 0,
      hasTransporter: !!this.transporter,
      isConfigured: this.isConfigured()
    };
  }
}

export default EmailService;