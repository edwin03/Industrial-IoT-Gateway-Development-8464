import React from 'react';
import { useAuth } from '../context/AuthContext';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiLock } = FiIcons;

function ProtectedRoute({ children, permission, fallback = null }) {
  const { hasPermission } = useAuth();

  if (permission && !hasPermission(permission)) {
    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <SafeIcon icon={FiLock} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to access this feature.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default ProtectedRoute;