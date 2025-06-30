import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiMail, FiSend, FiPlus, FiTrash2, FiCheck, FiX, FiInfo, FiSettings, FiAlertCircle, FiWifi } = FiIcons;

function EmailConfig({ settings, onUpdateSettings, socket }) {
  const [emailSettings, setEmailSettings] = useState({
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
  });

  const [newRecipient, setNewRecipient] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  useEffect(() => {
    if (settings.email) {
      console.log('Loading email settings:', settings.email);
      setEmailSettings(settings.email);
    }
  }, [settings]);

  useEffect(() => {
    if (socket) {
      console.log('Socket available:', !!socket);
      setSocketConnected(socket.connected);

      const handleConnect = () => {
        console.log('Socket connected');
        setSocketConnected(true);
      };

      const handleDisconnect = () => {
        console.log('Socket disconnected');
        setSocketConnected(false);
      };

      const handleEmailTestResult = (result) => {
        console.log('Received email test result:', result);
        setTestResult(result);
        setIsTestingConnection(false);
        setIsSendingTest(false);
      };

      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('emailTestResult', handleEmailTestResult);

      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('emailTestResult', handleEmailTestResult);
      };
    }
  }, [socket]);

  const handleSettingChange = (section, field, value) => {
    let newSettings;
    if (section) {
      newSettings = {
        ...emailSettings,
        [section]: {
          ...emailSettings[section],
          [field]: value
        }
      };
    } else {
      newSettings = {
        ...emailSettings,
        [field]: value
      };
    }
    
    console.log('Updating email settings:', newSettings);
    setEmailSettings(newSettings);
    
    // Immediately save settings
    if (onUpdateSettings) {
      onUpdateSettings({ email: newSettings });
    }
  };

  const handleAddRecipient = () => {
    if (newRecipient && isValidEmail(newRecipient)) {
      const updatedRecipients = [...emailSettings.recipients, newRecipient];
      const newSettings = { ...emailSettings, recipients: updatedRecipients };
      setEmailSettings(newSettings);
      onUpdateSettings({ email: newSettings });
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (index) => {
    const updatedRecipients = emailSettings.recipients.filter((_, i) => i !== index);
    const newSettings = { ...emailSettings, recipients: updatedRecipients };
    setEmailSettings(newSettings);
    onUpdateSettings({ email: newSettings });
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleTestConnection = () => {
    console.log('Test connection clicked');
    console.log('Socket:', !!socket);
    console.log('Socket connected:', socketConnected);
    console.log('Email settings:', emailSettings);

    if (!socket) {
      console.error('Socket not available');
      setTestResult({
        success: false,
        message: 'Connection to server not available. Please refresh the page.'
      });
      return;
    }

    if (!socketConnected) {
      console.error('Socket not connected');
      setTestResult({
        success: false,
        message: 'Not connected to server. Please refresh the page.'
      });
      return;
    }

    if (!emailSettings.smtp.host || !emailSettings.smtp.username) {
      setTestResult({
        success: false,
        message: 'Please fill in SMTP host and username before testing.'
      });
      return;
    }

    console.log('Sending testEmailConnection event');
    setIsTestingConnection(true);
    setTestResult(null);
    
    // Add a timeout in case the server doesn't respond
    const timeout = setTimeout(() => {
      console.log('Test connection timeout');
      setIsTestingConnection(false);
      setTestResult({
        success: false,
        message: 'Test connection timeout. The server may be busy or not responding.'
      });
    }, 15000); // 15 second timeout

    // Emit the test event
    socket.emit('testEmailConnection');
    console.log('testEmailConnection event sent');

    // Clear timeout when we get a response (handled in useEffect)
    socket.once('emailTestResult', () => {
      console.log('Received response, clearing timeout');
      clearTimeout(timeout);
    });
  };

  const handleSendTestEmail = () => {
    console.log('Send test email clicked');
    
    if (!socket || !socketConnected) {
      setTestResult({
        success: false,
        message: 'Not connected to server. Please refresh the page.'
      });
      return;
    }

    if (emailSettings.recipients.length === 0) {
      setTestResult({
        success: false,
        message: 'Please add at least one email recipient before sending test email.'
      });
      return;
    }

    if (!isConfigurationValid()) {
      setTestResult({
        success: false,
        message: 'Please complete all SMTP configuration before sending test email.'
      });
      return;
    }

    console.log('Sending sendTestEmail event to:', emailSettings.recipients[0]);
    setIsSendingTest(true);
    setTestResult(null);

    // Add a timeout in case the server doesn't respond
    const timeout = setTimeout(() => {
      console.log('Send test email timeout');
      setIsSendingTest(false);
      setTestResult({
        success: false,
        message: 'Send test email timeout. The server may be busy or not responding.'
      });
    }, 20000); // 20 second timeout for sending

    socket.emit('sendTestEmail', emailSettings.recipients[0]);
    console.log('sendTestEmail event sent');

    // Clear timeout when we get a response
    socket.once('emailTestResult', () => {
      console.log('Received response, clearing timeout');
      clearTimeout(timeout);
    });
  };

  const getStatusColor = (enabled) => {
    return enabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100';
  };

  const isConfigurationValid = () => {
    return emailSettings.smtp.host && 
           emailSettings.smtp.username && 
           emailSettings.smtp.password &&
           emailSettings.recipients.length > 0;
  };

  const smtpPresets = [
    {
      name: 'Gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      info: 'Use App Password for authentication'
    },
    {
      name: 'Outlook/Hotmail',
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      info: 'Use your Microsoft account credentials'
    },
    {
      name: 'Yahoo',
      host: 'smtp.mail.yahoo.com',
      port: 587,
      secure: false,
      info: 'Enable "Less secure app access"'
    },
    {
      name: 'Custom SMTP',
      host: '',
      port: 587,
      secure: false,
      info: 'Configure your own SMTP server'
    }
  ];

  const applyPreset = (preset) => {
    if (preset.host) {
      handleSettingChange('smtp', 'host', preset.host);
      handleSettingChange('smtp', 'port', preset.port);
      handleSettingChange('smtp', 'secure', preset.secure);
    }
  };

  const testButtonsDisabled = !socketConnected || isTestingConnection || isSendingTest;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiMail} className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Email Notifications</h3>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(emailSettings.enabled)}`}>
            {emailSettings.enabled ? 'Enabled' : 'Disabled'}
          </span>
          {emailSettings.enabled && !isConfigurationValid() && (
            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full flex items-center space-x-1">
              <SafeIcon icon={FiAlertCircle} className="w-3 h-3" />
              <span>Incomplete</span>
            </span>
          )}
          <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${
            socketConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <SafeIcon icon={FiWifi} className="w-3 h-3" />
            <span>{socketConnected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>
      </div>

      {/* Connection Status Warning */}
      {!socketConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-900 mb-2">Server Connection Lost</h4>
              <p className="text-sm text-red-800">
                Cannot test email settings without server connection. Please refresh the page or check if the server is running.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Configuration Status Warning */}
      {emailSettings.enabled && !isConfigurationValid() && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
        >
          <div className="flex items-start space-x-3">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">Configuration Required</h4>
              <div className="text-sm text-yellow-800 space-y-1">
                {!emailSettings.smtp.host && <p>• SMTP Host is required</p>}
                {!emailSettings.smtp.username && <p>• SMTP Username is required</p>}
                {!emailSettings.smtp.password && <p>• SMTP Password is required</p>}
                {emailSettings.recipients.length === 0 && <p>• At least one email recipient is required</p>}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Debug Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>Socket Available: {socket ? '✅ Yes' : '❌ No'}</p>
          <p>Socket Connected: {socketConnected ? '✅ Yes' : '❌ No'}</p>
          <p>SMTP Host: {emailSettings.smtp.host || '❌ Not set'}</p>
          <p>SMTP Username: {emailSettings.smtp.username || '❌ Not set'}</p>
          <p>SMTP Password: {emailSettings.smtp.password ? '✅ Set' : '❌ Not set'}</p>
          <p>Recipients: {emailSettings.recipients.length > 0 ? `✅ ${emailSettings.recipients.length} configured` : '❌ None'}</p>
          <p>Configuration Valid: {isConfigurationValid() ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={emailSettings.enabled}
            onChange={(e) => handleSettingChange(null, 'enabled', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">Enable Email Notifications</span>
        </label>
      </div>

      {emailSettings.enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-6"
        >
          {/* SMTP Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SMTP Provider Presets
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {smtpPresets.map((preset, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyPreset(preset)}
                  className="p-3 border border-gray-300 rounded-lg text-left hover:border-primary-500 hover:bg-primary-50 transition-colors"
                >
                  <div className="text-sm font-medium text-gray-900">{preset.name}</div>
                  {preset.host && (
                    <div className="text-xs text-gray-500">{preset.host}:{preset.port}</div>
                  )}
                  <div className="text-xs text-primary-600 mt-1">{preset.info}</div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* SMTP Settings */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <SafeIcon icon={FiSettings} className="w-4 h-4" />
              <span>SMTP Server Settings</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host *
                </label>
                <input
                  type="text"
                  value={emailSettings.smtp.host}
                  onChange={(e) => handleSettingChange('smtp', 'host', e.target.value)}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={emailSettings.smtp.port}
                  onChange={(e) => handleSettingChange('smtp', 'port', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username *
                </label>
                <input
                  type="text"
                  value={emailSettings.smtp.username}
                  onChange={(e) => handleSettingChange('smtp', 'username', e.target.value)}
                  placeholder="your.email@gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={emailSettings.smtp.password}
                  onChange={(e) => handleSettingChange('smtp', 'password', e.target.value)}
                  placeholder="App password or account password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Email Address
              </label>
              <input
                type="email"
                value={emailSettings.from}
                onChange={(e) => handleSettingChange(null, 'from', e.target.value)}
                placeholder="gateway@yourcompany.com (optional - uses username if empty)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={emailSettings.smtp.secure}
                  onChange={(e) => handleSettingChange('smtp', 'secure', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Use SSL/TLS (port 465)</span>
              </label>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Email Recipients *</h4>
            
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="admin@yourcompany.com"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                onKeyPress={(e) => e.key === 'Enter' && handleAddRecipient()}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddRecipient}
                disabled={!newRecipient || !isValidEmail(newRecipient)}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiPlus} className="w-4 h-4" />
                <span>Add</span>
              </motion.button>
            </div>

            {emailSettings.recipients.length > 0 ? (
              <div className="space-y-2">
                {emailSettings.recipients.map((recipient, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg"
                  >
                    <span className="text-gray-900">{recipient}</span>
                    <button
                      onClick={() => handleRemoveRecipient(index)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <SafeIcon icon={FiMail} className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No email recipients configured</p>
                <p className="text-sm">Add at least one recipient to receive notifications</p>
              </div>
            )}
          </div>

          {/* Test Connection */}
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: testButtonsDisabled ? 1 : 1.05 }}
              whileTap={{ scale: testButtonsDisabled ? 1 : 0.95 }}
              onClick={handleTestConnection}
              disabled={testButtonsDisabled}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SafeIcon icon={FiCheck} className="w-4 h-4" />
              <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: testButtonsDisabled ? 1 : 1.05 }}
              whileTap={{ scale: testButtonsDisabled ? 1 : 0.95 }}
              onClick={handleSendTestEmail}
              disabled={testButtonsDisabled}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SafeIcon icon={FiSend} className="w-4 h-4" />
              <span>{isSendingTest ? 'Sending...' : 'Send Test Email'}</span>
            </motion.button>
          </div>

          {/* Test Result */}
          <AnimatePresence>
            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-lg border ${testResult.success ? 
                  'bg-green-50 border-green-200 text-green-800' : 
                  'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={testResult.success ? FiCheck : FiX} className="w-4 h-4" />
                  <span className="font-medium">
                    {testResult.success ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className="mt-1 text-sm">{testResult.message}</p>
                {testResult.messageId && (
                  <p className="mt-1 text-xs opacity-75">Message ID: {testResult.messageId}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Notification Settings */}
          <div>
            <h4 className="text-md font-semibold text-gray-900 mb-3">Notification Types</h4>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Device Offline</span>
                  <p className="text-xs text-gray-500">When devices go offline or timeout</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailSettings.notifications.deviceOffline}
                  onChange={(e) => handleSettingChange('notifications', 'deviceOffline', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Device Errors</span>
                  <p className="text-xs text-gray-500">When devices encounter errors</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailSettings.notifications.deviceError}
                  onChange={(e) => handleSettingChange('notifications', 'deviceError', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Device Online</span>
                  <p className="text-xs text-gray-500">When devices come back online</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailSettings.notifications.deviceOnline}
                  onChange={(e) => handleSettingChange('notifications', 'deviceOnline', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">System Errors</span>
                  <p className="text-xs text-gray-500">Critical system errors and failures</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailSettings.notifications.systemErrors}
                  onChange={(e) => handleSettingChange('notifications', 'systemErrors', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              <label className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">Daily Summary</span>
                  <p className="text-xs text-gray-500">Daily report at 8 AM with stats</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailSettings.notifications.dailySummary}
                  onChange={(e) => handleSettingChange('notifications', 'dailySummary', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </label>
            </div>
          </div>

          {/* Information Panel */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <SafeIcon icon={FiInfo} className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Email Setup Tips</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>• <strong>Gmail:</strong> Enable 2FA and use App Passwords instead of your regular password</p>
                  <p>• <strong>Outlook:</strong> Enable SMTP AUTH in your admin center for business accounts</p>
                  <p>• <strong>Yahoo:</strong> Enable "Less secure app access" in account settings</p>
                  <p>• <strong>Testing:</strong> Test connection before enabling to ensure settings work</p>
                  <p>• <strong>Spam Prevention:</strong> Notifications have cooldown periods to prevent flooding</p>
                  <p>• <strong>Daily Summary:</strong> Automatically sends at 8 AM with 24-hour statistics</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default EmailConfig;