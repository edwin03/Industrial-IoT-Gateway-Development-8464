import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useAuth } from '../context/AuthContext';

const { FiHome, FiHardDrive, FiSettings, FiFileText, FiActivity, FiDatabase, FiAlertTriangle, FiClock, FiUsers, FiUser, FiLogOut, FiBrain } = FiIcons;

function Sidebar() {
  const { user, hasPermission, logout } = useAuth();

  const navItems = [
    { path: '/', icon: FiHome, label: 'Dashboard', permission: null },
    { path: '/devices', icon: FiHardDrive, label: 'Devices', permission: 'devices:read' },
    { path: '/data', icon: FiDatabase, label: 'Data Monitor', permission: 'data:read' },
    { path: '/analytics', icon: FiBrain, label: 'Analytics', permission: 'data:read' },
    { path: '/history', icon: FiClock, label: 'Data History', permission: 'history:read' },
    { path: '/alarms', icon: FiAlertTriangle, label: 'Alarms', permission: 'alarms:read' },
    { path: '/users', icon: FiUsers, label: 'Users', permission: 'users:read' },
    { path: '/settings', icon: FiSettings, label: 'Settings', permission: 'settings:read' },
    { path: '/logs', icon: FiFileText, label: 'Logs', permission: 'logs:read' }
  ];

  const filteredNavItems = navItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col h-full overflow-hidden"
    >
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiActivity} className="w-8 h-8 text-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">Gateway</h2>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        <div className="space-y-1 px-2">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 mx-2 text-gray-700 rounded-lg hover:bg-primary-50 hover:text-primary-700 transition-colors ${
                  isActive ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600' : ''
                }`
              }
            >
              <SafeIcon icon={item.icon} className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center space-x-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
            <span className="text-sm font-medium text-primary-600">
              {user?.username?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role}</p>
          </div>
        </div>
        <div className="space-y-1">
          <NavLink
            to="/profile"
            className="flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <SafeIcon icon={FiUser} className="w-4 h-4 mr-2" />
            Profile
          </NavLink>
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <SafeIcon icon={FiLogOut} className="w-4 h-4 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

export default Sidebar;