import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiX, FiSave, FiUser, FiMail, FiLock, FiShield, FiEye, FiEyeOff, FiInfo } = FiIcons;

const AVAILABLE_ROLES = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full access to all features and settings',
    permissions: ['*'],
    color: 'text-red-600'
  },
  {
    id: 'operator',
    name: 'Operator',
    description: 'Can manage devices and alarms, view data and history',
    permissions: [
      'devices:read', 'devices:write', 'data:read', 'history:read',
      'alarms:read', 'alarms:write', 'settings:read'
    ],
    color: 'text-yellow-600'
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to devices, data, and alarms',
    permissions: ['devices:read', 'data:read', 'history:read', 'alarms:read'],
    color: 'text-blue-600'
  }
];

const AVAILABLE_PERMISSIONS = [
  { id: 'devices:read', name: 'View Devices', category: 'Devices' },
  { id: 'devices:write', name: 'Manage Devices', category: 'Devices' },
  { id: 'data:read', name: 'View Data', category: 'Data' },
  { id: 'history:read', name: 'View History', category: 'Data' },
  { id: 'history:write', name: 'Manage History Loggers', category: 'Data' },
  { id: 'alarms:read', name: 'View Alarms', category: 'Alarms' },
  { id: 'alarms:write', name: 'Manage Alarms', category: 'Alarms' },
  { id: 'settings:read', name: 'View Settings', category: 'Settings' },
  { id: 'settings:write', name: 'Manage Settings', category: 'Settings' },
  { id: 'users:read', name: 'View Users', category: 'Administration' },
  { id: 'users:write', name: 'Manage Users', category: 'Administration' },
  { id: 'logs:read', name: 'View Logs', category: 'Administration' }
];

function UserModal({ isOpen, onClose, user = null, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'viewer',
    permissions: [],
    isActive: true
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [useCustomPermissions, setUseCustomPermissions] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        password: '',
        confirmPassword: '',
        role: user.role || 'viewer',
        permissions: user.permissions || [],
        isActive: user.isActive !== undefined ? user.isActive : true
      });
      
      // Check if user has custom permissions
      const rolePermissions = AVAILABLE_ROLES.find(r => r.id === user.role)?.permissions || [];
      const hasCustomPermissions = user.permissions && 
        JSON.stringify(user.permissions.sort()) !== JSON.stringify(rolePermissions.sort());
      setUseCustomPermissions(hasCustomPermissions);
    } else {
      setFormData({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'viewer',
        permissions: AVAILABLE_ROLES.find(r => r.id === 'viewer')?.permissions || [],
        isActive: true
      });
      setUseCustomPermissions(false);
    }
    setErrors({});
  }, [user, isOpen]);

  const validateForm = () => {
    const newErrors = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, hyphens, and underscores';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Check for duplicate username/email
    const existingUsers = JSON.parse(localStorage.getItem('gatewayUsers') || '[]');
    const isDuplicateUsername = existingUsers.some(u => 
      u.username.toLowerCase() === formData.username.toLowerCase() && 
      (!user || u.id !== user.id)
    );
    const isDuplicateEmail = existingUsers.some(u => 
      u.email.toLowerCase() === formData.email.toLowerCase() && 
      (!user || u.id !== user.id)
    );

    if (isDuplicateUsername) {
      newErrors.username = 'Username already exists';
    }
    if (isDuplicateEmail) {
      newErrors.email = 'Email already exists';
    }

    // Password validation
    if (!user && !formData.password) {
      newErrors.password = 'Password is required for new users';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (formData.password && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number';
    }

    if (formData.password && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Permissions validation
    if (formData.permissions.length === 0 && formData.role !== 'admin') {
      newErrors.permissions = 'At least one permission is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const userData = {
      username: formData.username.trim(),
      email: formData.email.trim().toLowerCase(),
      role: formData.role,
      permissions: formData.permissions,
      isActive: formData.isActive
    };

    // Only include password if it's provided
    if (formData.password) {
      userData.password = formData.password;
    }

    onSave(userData);
    onClose();
  };

  const handleRoleChange = (newRole) => {
    const role = AVAILABLE_ROLES.find(r => r.id === newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: useCustomPermissions ? prev.permissions : (role?.permissions || [])
    }));
  };

  const handlePermissionToggle = (permissionId) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCustomPermissionsToggle = (enabled) => {
    setUseCustomPermissions(enabled);
    if (!enabled) {
      // Reset to role-based permissions
      const role = AVAILABLE_ROLES.find(r => r.id === formData.role);
      setFormData(prev => ({
        ...prev,
        permissions: role?.permissions || []
      }));
    }
  };

  const generateStrongPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password, confirmPassword: password }));
  };

  if (!isOpen) return null;

  const permissionsByCategory = AVAILABLE_PERMISSIONS.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {});

  const selectedRole = AVAILABLE_ROLES.find(r => r.id === formData.role);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiUser} className="w-6 h-6 text-primary-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {user ? `Edit User: ${user.username}` : 'Create New User'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center space-x-2">
                <SafeIcon icon={FiInfo} className="w-4 h-4" />
                <span>Basic Information</span>
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.username ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter username"
                    autoComplete="username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                    autoComplete="email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-medium text-gray-900">Password</h5>
                  {!user && (
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-sm text-primary-600 hover:text-primary-800"
                    >
                      Generate Strong Password
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!user && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 ${
                          errors.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder={user ? "Leave blank to keep current" : "Enter password"}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <SafeIcon
                          icon={showPassword ? FiEyeOff : FiEye}
                          className="w-4 h-4 text-gray-400"
                        />
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password {!user && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10 ${
                          errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Confirm password"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <SafeIcon
                          icon={showConfirmPassword ? FiEyeOff : FiEye}
                          className="w-4 h-4 text-gray-400"
                        />
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Role Selection */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold text-gray-900 flex items-center space-x-2">
                <SafeIcon icon={FiShield} className="w-4 h-4" />
                <span>Role & Permissions</span>
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Role *
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {AVAILABLE_ROLES.map((role) => (
                    <motion.button
                      key={role.id}
                      type="button"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleRoleChange(role.id)}
                      className={`p-4 border rounded-lg text-left transition-colors ${
                        formData.role === role.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <SafeIcon icon={FiShield} className={`w-4 h-4 ${role.color}`} />
                            <span className="font-medium text-gray-900">{role.name}</span>
                          </div>
                          <p className="text-sm text-gray-600">{role.description}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              Permissions: {role.id === 'admin' ? 'All' : `${role.permissions.length} selected`}
                            </p>
                          </div>
                        </div>
                        {formData.role === role.id && (
                          <div className="w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Custom Permissions */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <input
                    type="checkbox"
                    id="customPermissions"
                    checked={useCustomPermissions}
                    onChange={(e) => handleCustomPermissionsToggle(e.target.checked)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="customPermissions" className="text-sm font-medium text-gray-700">
                    Use custom permissions
                  </label>
                </div>

                {useCustomPermissions && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                      <div key={category}>
                        <h5 className="text-sm font-medium text-gray-900 mb-2">{category}</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {permissions.map((permission) => (
                            <label key={permission.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={formData.permissions.includes(permission.id)}
                                onChange={() => handlePermissionToggle(permission.id)}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="text-sm text-gray-700">{permission.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {errors.permissions && (
                      <p className="mt-1 text-sm text-red-600">{errors.permissions}</p>
                    )}
                  </div>
                )}

                {!useCustomPermissions && selectedRole && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-blue-900 mb-2">
                      {selectedRole.name} Permissions
                    </h5>
                    {selectedRole.id === 'admin' ? (
                      <p className="text-sm text-blue-800">Full administrative access to all features</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {selectedRole.permissions.map(permission => (
                          <div key={permission} className="text-sm text-blue-800">
                            • {AVAILABLE_PERMISSIONS.find(p => p.id === permission)?.name || permission}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Account Status */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Account is active</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  Inactive users cannot log in to the system
                </p>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center space-x-2"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4" />
                <span>{user ? 'Update User' : 'Create User'}</span>
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UserModal;