import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import UserModal from './UserModal';

const { FiUsers, FiPlus, FiEdit2, FiTrash2, FiShield, FiLock, FiUnlock, FiEye, FiKey, FiSearch, FiFilter } = FiIcons;

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  operator: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  viewer: 'bg-blue-100 text-blue-800 border-blue-200'
};

const ROLE_DESCRIPTIONS = {
  admin: 'Full system access and user management',
  operator: 'Device management and alarm configuration',
  viewer: 'Read-only access to data and devices'
};

function UserManagement() {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Load users from localStorage
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    setLoading(true);
    // Simulate loading delay
    setTimeout(() => {
      const savedUsers = JSON.parse(localStorage.getItem('gatewayUsers') || '[]');
      
      if (savedUsers.length === 0) {
        // Initialize with default users if none exist
        const defaultUsers = [
          {
            id: 'admin',
            username: 'admin',
            email: 'admin@gateway.local',
            role: 'admin',
            permissions: ['*'],
            isActive: true,
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            loginAttempts: 0,
            isLocked: false
          },
          {
            id: 'operator',
            username: 'operator',
            email: 'operator@gateway.local',
            role: 'operator',
            permissions: ['devices:read', 'devices:write', 'data:read', 'history:read', 'alarms:read', 'alarms:write'],
            isActive: true,
            createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            loginAttempts: 0,
            isLocked: false
          },
          {
            id: 'viewer',
            username: 'viewer',
            email: 'viewer@gateway.local',
            role: 'viewer',
            permissions: ['devices:read', 'data:read', 'history:read', 'alarms:read'],
            isActive: true,
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            lastLogin: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
            loginAttempts: 0,
            isLocked: false
          }
        ];
        localStorage.setItem('gatewayUsers', JSON.stringify(defaultUsers));
        setUsers(defaultUsers);
      } else {
        setUsers(savedUsers);
      }
      setLoading(false);
    }, 500);
  };

  const saveUsers = (updatedUsers) => {
    localStorage.setItem('gatewayUsers', JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    const userToDelete = users.find(u => u.id === userId);
    
    if (userToDelete.id === currentUser.id) {
      alert('You cannot delete your own account.');
      return;
    }

    // Prevent deletion of last admin
    if (userToDelete.role === 'admin') {
      const adminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
      if (adminCount <= 1) {
        alert('Cannot delete the last admin user.');
        return;
      }
    }

    if (confirm(`Are you sure you want to delete user "${userToDelete.username}"? This action cannot be undone.`)) {
      const updatedUsers = users.filter(u => u.id !== userId);
      saveUsers(updatedUsers);
    }
  };

  const handleToggleUserStatus = (userId) => {
    const userToToggle = users.find(u => u.id === userId);
    
    if (userToToggle.id === currentUser.id) {
      alert('You cannot deactivate your own account.');
      return;
    }

    // Prevent deactivating last admin
    if (userToToggle.role === 'admin' && userToToggle.isActive) {
      const activeAdminCount = users.filter(u => u.role === 'admin' && u.isActive).length;
      if (activeAdminCount <= 1) {
        alert('Cannot deactivate the last active admin user.');
        return;
      }
    }

    const updatedUsers = users.map(user => 
      user.id === userId 
        ? { ...user, isActive: !user.isActive, updatedAt: new Date().toISOString() }
        : user
    );
    saveUsers(updatedUsers);
  };

  const handleUnlockUser = (userId) => {
    const updatedUsers = users.map(user => 
      user.id === userId 
        ? { ...user, isLocked: false, loginAttempts: 0, updatedAt: new Date().toISOString() }
        : user
    );
    saveUsers(updatedUsers);
  };

  const handleResetPassword = (userId) => {
    const user = users.find(u => u.id === userId);
    if (confirm(`Reset password for user "${user.username}"? They will need to use the temporary password "temppass123".`)) {
      // In a real app, this would generate a secure temporary password
      alert(`Password reset for ${user.username}. Temporary password: temppass123`);
    }
  };

  const handleSaveUser = (userData) => {
    if (editingUser) {
      // Update existing user
      const updatedUsers = users.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...userData, updatedAt: new Date().toISOString() }
          : user
      );
      saveUsers(updatedUsers);
    } else {
      // Create new user
      const newUser = {
        ...userData,
        id: Date.now().toString(),
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        isLocked: false
      };
      saveUsers([...users, newUser]);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && user.isActive) ||
                         (filterStatus === 'inactive' && !user.isActive) ||
                         (filterStatus === 'locked' && user.isLocked);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!hasPermission('users:read')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <SafeIcon icon={FiLock} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view user management.</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiUsers} className="w-6 h-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
        </div>
        {hasPermission('users:write') && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCreateUser}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add User</span>
          </motion.button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SafeIcon icon={FiSearch} className="w-5 h-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="locked">Locked</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <SafeIcon icon={FiUsers} className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <SafeIcon icon={FiShield} className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <SafeIcon icon={FiLock} className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Locked Accounts</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.isLocked).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <SafeIcon icon={FiEye} className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Admins</p>
              <p className="text-2xl font-semibold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Users ({filteredUsers.length} {filteredUsers.length !== users.length && `of ${users.length}`})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-gray-600">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <SafeIcon icon={FiUsers} className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {users.length === 0 ? 'No Users Found' : 'No Matching Users'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {users.length === 0 
                        ? 'Get started by creating your first user account.'
                        : 'Try adjusting your search or filter criteria.'
                      }
                    </p>
                    {hasPermission('users:write') && users.length === 0 && (
                      <button
                        onClick={handleCreateUser}
                        className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        Add First User
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                <AnimatePresence>
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.username}
                              {user.id === currentUser.id && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${ROLE_COLORS[user.role]}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {ROLE_DESCRIPTIONS[user.role]}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col space-y-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {user.isLocked && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Locked
                            </span>
                          )}
                          {user.loginAttempts > 0 && (
                            <span className="text-xs text-yellow-600">
                              {user.loginAttempts} failed attempts
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin ? (
                          formatDistanceToNow(new Date(user.lastLogin), { addSuffix: true })
                        ) : (
                          'Never'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {user.isLocked && hasPermission('users:write') && (
                            <button
                              onClick={() => handleUnlockUser(user.id)}
                              className="text-green-600 hover:text-green-900 p-1"
                              title="Unlock user"
                            >
                              <SafeIcon icon={FiUnlock} className="w-4 h-4" />
                            </button>
                          )}
                          
                          {hasPermission('users:write') && (
                            <>
                              <button
                                onClick={() => handleResetPassword(user.id)}
                                className="text-purple-600 hover:text-purple-900 p-1"
                                title="Reset password"
                              >
                                <SafeIcon icon={FiKey} className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleToggleUserStatus(user.id)}
                                className={`p-1 ${
                                  user.isActive 
                                    ? 'text-yellow-600 hover:text-yellow-900' 
                                    : 'text-green-600 hover:text-green-900'
                                }`}
                                title={user.isActive ? 'Deactivate user' : 'Activate user'}
                                disabled={user.id === currentUser.id}
                              >
                                <SafeIcon icon={user.isActive ? FiLock : FiUnlock} className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-primary-600 hover:text-primary-900 p-1"
                                title="Edit user"
                              >
                                <SafeIcon icon={FiEdit2} className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Delete user"
                                disabled={user.id === currentUser.id}
                              >
                                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSave={handleSaveUser}
      />
    </motion.div>
  );
}

export default UserManagement;