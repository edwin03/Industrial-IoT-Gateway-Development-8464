import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

class AuthService {
  constructor() {
    this.users = [];
    this.sessions = new Map();
    this.usersFilePath = path.join(process.cwd(), 'data', 'users.json');
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.onLogCallback = null;
    
    // Ensure data directory exists
    this.ensureDataDirectory();
    
    // Load users from file
    this.loadUsers();
    
    // Create default admin user if no users exist
    this.createDefaultAdmin();
  }

  // Initialize auth service
  initialize(onLog) {
    this.onLogCallback = onLog;
    this.log('info', 'Authentication service initialized');
  }

  // Ensure data directory exists
  ensureDataDirectory() {
    const dataDir = path.dirname(this.usersFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  // Load users from file
  loadUsers() {
    try {
      if (fs.existsSync(this.usersFilePath)) {
        const data = fs.readFileSync(this.usersFilePath, 'utf8');
        this.users = JSON.parse(data);
        this.log('info', `Loaded ${this.users.length} users from storage`);
      }
    } catch (error) {
      this.log('error', `Failed to load users: ${error.message}`);
      this.users = [];
    }
  }

  // Save users to file
  saveUsers() {
    try {
      fs.writeFileSync(this.usersFilePath, JSON.stringify(this.users, null, 2));
      this.log('info', 'Users saved to storage');
    } catch (error) {
      this.log('error', `Failed to save users: ${error.message}`);
    }
  }

  // Create default admin user
  async createDefaultAdmin() {
    if (this.users.length === 0) {
      const defaultAdmin = {
        id: 'admin',
        username: 'admin',
        email: 'admin@gateway.local',
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        permissions: ['*'], // All permissions
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null
      };
      
      this.users.push(defaultAdmin);
      this.saveUsers();
      this.log('info', 'Default admin user created (username: admin, password: admin123)');
    }
  }

  // Authenticate user
  async authenticate(username, password) {
    try {
      const user = this.users.find(u => u.username === username && u.isActive);
      
      if (!user) {
        this.log('warning', `Login attempt failed: User not found - ${username}`);
        return { success: false, message: 'Invalid credentials' };
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        this.log('warning', `Login attempt failed: Account locked - ${username}`);
        return { success: false, message: 'Account is locked. Please try again later.' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        // Increment login attempts
        user.loginAttempts = (user.loginAttempts || 0) + 1;
        
        // Lock account after 5 failed attempts for 15 minutes
        if (user.loginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          this.log('warning', `Account locked due to failed attempts - ${username}`);
        }
        
        this.saveUsers();
        this.log('warning', `Login attempt failed: Invalid password - ${username}`);
        return { success: false, message: 'Invalid credentials' };
      }

      // Reset login attempts on successful login
      user.loginAttempts = 0;
      user.lockedUntil = null;
      user.lastLogin = new Date().toISOString();
      this.saveUsers();

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          username: user.username, 
          role: user.role,
          permissions: user.permissions 
        },
        this.jwtSecret,
        { expiresIn: '24h' }
      );

      // Store session
      this.sessions.set(token, {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        loginTime: new Date().toISOString()
      });

      this.log('success', `User logged in successfully - ${username}`);
      
      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          lastLogin: user.lastLogin
        }
      };
    } catch (error) {
      this.log('error', `Authentication error: ${error.message}`);
      return { success: false, message: 'Authentication failed' };
    }
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      const session = this.sessions.get(token);
      
      if (!session) {
        return { success: false, message: 'Session not found' };
      }

      return {
        success: true,
        user: {
          userId: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          permissions: decoded.permissions
        }
      };
    } catch (error) {
      return { success: false, message: 'Invalid token' };
    }
  }

  // Logout user
  logout(token) {
    if (this.sessions.has(token)) {
      const session = this.sessions.get(token);
      this.sessions.delete(token);
      this.log('info', `User logged out - ${session.username}`);
      return { success: true };
    }
    return { success: false, message: 'Session not found' };
  }

  // Check permission
  hasPermission(userPermissions, requiredPermission) {
    if (!userPermissions || !Array.isArray(userPermissions)) {
      return false;
    }
    
    // Admin has all permissions
    if (userPermissions.includes('*')) {
      return true;
    }
    
    return userPermissions.includes(requiredPermission);
  }

  // Get all users (admin only)
  getUsers() {
    return this.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      isActive: user.isActive,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      loginAttempts: user.loginAttempts || 0,
      isLocked: user.lockedUntil && new Date() < new Date(user.lockedUntil)
    }));
  }

  // Create new user
  async createUser(userData) {
    try {
      // Check if username already exists
      if (this.users.find(u => u.username === userData.username)) {
        return { success: false, message: 'Username already exists' };
      }

      // Check if email already exists
      if (this.users.find(u => u.email === userData.email)) {
        return { success: false, message: 'Email already exists' };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = {
        id: Date.now().toString(),
        username: userData.username,
        email: userData.email,
        password: hashedPassword,
        role: userData.role || 'viewer',
        permissions: userData.permissions || this.getDefaultPermissions(userData.role || 'viewer'),
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: null,
        loginAttempts: 0,
        lockedUntil: null
      };

      this.users.push(newUser);
      this.saveUsers();
      
      this.log('info', `New user created - ${newUser.username} (${newUser.role})`);
      
      return {
        success: true,
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          permissions: newUser.permissions,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt
        }
      };
    } catch (error) {
      this.log('error', `Failed to create user: ${error.message}`);
      return { success: false, message: 'Failed to create user' };
    }
  }

  // Update user
  async updateUser(userId, updateData) {
    try {
      const userIndex = this.users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return { success: false, message: 'User not found' };
      }

      const user = this.users[userIndex];

      // Check if new username conflicts with existing users
      if (updateData.username && updateData.username !== user.username) {
        if (this.users.find(u => u.username === updateData.username && u.id !== userId)) {
          return { success: false, message: 'Username already exists' };
        }
      }

      // Check if new email conflicts with existing users
      if (updateData.email && updateData.email !== user.email) {
        if (this.users.find(u => u.email === updateData.email && u.id !== userId)) {
          return { success: false, message: 'Email already exists' };
        }
      }

      // Update user data
      if (updateData.username) user.username = updateData.username;
      if (updateData.email) user.email = updateData.email;
      if (updateData.role) {
        user.role = updateData.role;
        // Update permissions based on new role if not explicitly provided
        if (!updateData.permissions) {
          user.permissions = this.getDefaultPermissions(updateData.role);
        }
      }
      if (updateData.permissions) user.permissions = updateData.permissions;
      if (updateData.isActive !== undefined) user.isActive = updateData.isActive;
      
      // Hash new password if provided
      if (updateData.password) {
        user.password = await bcrypt.hash(updateData.password, 10);
      }

      user.updatedAt = new Date().toISOString();

      this.saveUsers();
      
      this.log('info', `User updated - ${user.username}`);
      
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };
    } catch (error) {
      this.log('error', `Failed to update user: ${error.message}`);
      return { success: false, message: 'Failed to update user' };
    }
  }

  // Delete user
  deleteUser(userId) {
    try {
      const userIndex = this.users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        return { success: false, message: 'User not found' };
      }

      const user = this.users[userIndex];
      
      // Prevent deletion of the last admin user
      const adminUsers = this.users.filter(u => u.role === 'admin' && u.isActive);
      if (user.role === 'admin' && adminUsers.length === 1) {
        return { success: false, message: 'Cannot delete the last admin user' };
      }

      this.users.splice(userIndex, 1);
      this.saveUsers();
      
      this.log('info', `User deleted - ${user.username}`);
      
      return { success: true };
    } catch (error) {
      this.log('error', `Failed to delete user: ${error.message}`);
      return { success: false, message: 'Failed to delete user' };
    }
  }

  // Get default permissions for role
  getDefaultPermissions(role) {
    const rolePermissions = {
      admin: ['*'], // All permissions
      operator: [
        'devices:read',
        'devices:write',
        'data:read',
        'history:read',
        'alarms:read',
        'alarms:write',
        'settings:read'
      ],
      viewer: [
        'devices:read',
        'data:read',
        'history:read',
        'alarms:read'
      ]
    };
    
    return rolePermissions[role] || rolePermissions.viewer;
  }

  // Get available roles
  getAvailableRoles() {
    return [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full access to all features and settings',
        permissions: ['*']
      },
      {
        id: 'operator',
        name: 'Operator',
        description: 'Can manage devices and alarms, view data and history',
        permissions: this.getDefaultPermissions('operator')
      },
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access to devices, data, and alarms',
        permissions: this.getDefaultPermissions('viewer')
      }
    ];
  }

  // Get available permissions
  getAvailablePermissions() {
    return [
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
  }

  // Get active sessions
  getActiveSessions() {
    const sessions = [];
    this.sessions.forEach((session, token) => {
      sessions.push({
        token: token.substring(0, 20) + '...',
        username: session.username,
        role: session.role,
        loginTime: session.loginTime
      });
    });
    return sessions;
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = this.users.find(u => u.id === userId);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify current password
      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      
      if (!isValidPassword) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Hash new password
      user.password = await bcrypt.hash(newPassword, 10);
      user.updatedAt = new Date().toISOString();
      
      this.saveUsers();
      
      this.log('info', `Password changed for user - ${user.username}`);
      
      return { success: true };
    } catch (error) {
      this.log('error', `Failed to change password: ${error.message}`);
      return { success: false, message: 'Failed to change password' };
    }
  }

  // Unlock user account
  unlockUser(userId) {
    try {
      const user = this.users.find(u => u.id === userId);
      
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      user.loginAttempts = 0;
      user.lockedUntil = null;
      
      this.saveUsers();
      
      this.log('info', `User account unlocked - ${user.username}`);
      
      return { success: true };
    } catch (error) {
      this.log('error', `Failed to unlock user: ${error.message}`);
      return { success: false, message: 'Failed to unlock user' };
    }
  }

  // Logging helper
  log(level, message) {
    if (this.onLogCallback) {
      this.onLogCallback(level, message, 'Auth Service');
    }
  }
}

export default AuthService;