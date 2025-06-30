import React, { useState } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useAuth } from '../context/AuthContext';

const { FiUser, FiLock, FiEye, FiEyeOff, FiActivity, FiShield, FiUserPlus } = FiIcons;

function Login() {
  const { login, authenticateUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Try to authenticate the user
      const result = authenticateUser(formData.username, formData.password);
      
      if (result.success) {
        const mockToken = 'jwt-token-' + Date.now();
        login(mockToken, result.user);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Login failed. Please try again.');
    }

    setIsLoading(false);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDemoLogin = (username, password) => {
    setFormData({ username, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4"
          >
            <SafeIcon icon={FiActivity} className="w-8 h-8 text-primary-600" />
          </motion.div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">IoT Gateway</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6"
        >
          <div className="flex items-start space-x-3">
            <SafeIcon icon={FiShield} className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Demo Credentials</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span><strong>Admin:</strong> admin / admin123</span>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('admin', 'admin123')}
                    className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span><strong>Operator:</strong> operator / operator123</span>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('operator', 'operator123')}
                    className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span><strong>Viewer:</strong> viewer / viewer123</span>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin('viewer', 'viewer123')}
                    className="text-xs bg-blue-200 hover:bg-blue-300 px-2 py-1 rounded transition-colors"
                  >
                    Use
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Login Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3"
            >
              <p className="text-sm text-red-800">{error}</p>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SafeIcon icon={FiUser} className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your username"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SafeIcon icon={FiLock} className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <SafeIcon
                  icon={showPassword ? FiEyeOff : FiEye}
                  className="w-5 h-5 text-gray-400 hover:text-gray-600"
                />
              </button>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </motion.button>
        </motion.form>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 pt-6 border-t border-gray-200"
        >
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 mb-2">
              <SafeIcon icon={FiUserPlus} className="w-4 h-4" />
              <span>Admin users can create new accounts</span>
            </div>
            <p className="text-xs text-gray-500">
              Login as admin to access user management
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default Login;