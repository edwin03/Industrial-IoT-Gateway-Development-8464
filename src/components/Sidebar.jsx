import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiHome, FiHardDrive, FiSettings, FiFileText, FiActivity, FiDatabase, FiAlertTriangle, FiClock } = FiIcons;

const navItems = [
  { path: '/', icon: FiHome, label: 'Dashboard' },
  { path: '/devices', icon: FiHardDrive, label: 'Devices' },
  { path: '/data', icon: FiDatabase, label: 'Data Monitor' },
  { path: '/history', icon: FiClock, label: 'Data History' },
  { path: '/alarms', icon: FiAlertTriangle, label: 'Alarms' },
  { path: '/settings', icon: FiSettings, label: 'Settings' },
  { path: '/logs', icon: FiFileText, label: 'Logs' }
];

function Sidebar() {
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
          {navItems.map((item) => (
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
    </motion.aside>
  );
}

export default Sidebar;