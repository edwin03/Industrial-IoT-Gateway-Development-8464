import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AuthContext = createContext();

const initialState = {
  isAuthenticated: false,
  user: null,
  token: null,
  loading: true
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        loading: false
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false
      };
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      };
    default:
      return state;
  }
}

// Default demo users
const DEFAULT_USERS = [
  {
    id: 'admin',
    username: 'admin',
    email: 'admin@gateway.local',
    password: 'admin123', // In a real app, this would be hashed
    role: 'admin',
    permissions: ['*'],
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: null,
    loginAttempts: 0,
    isLocked: false
  },
  {
    id: 'operator',
    username: 'operator',
    email: 'operator@gateway.local',
    password: 'operator123',
    role: 'operator',
    permissions: [
      'devices:read', 'devices:write', 'data:read',
      'history:read', 'alarms:read', 'alarms:write',
      'settings:read'
    ],
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: null,
    loginAttempts: 0,
    isLocked: false
  },
  {
    id: 'viewer',
    username: 'viewer',
    email: 'viewer@gateway.local',
    password: 'viewer123',
    role: 'viewer',
    permissions: ['devices:read', 'data:read', 'history:read', 'alarms:read'],
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    lastLogin: null,
    loginAttempts: 0,
    isLocked: false
  }
];

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Initialize default users if they don't exist
    const existingUsers = localStorage.getItem('gatewayUsers');
    if (!existingUsers) {
      localStorage.setItem('gatewayUsers', JSON.stringify(DEFAULT_USERS));
    }

    // Check for stored token on app start
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { token: storedToken, user }
        });
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    } else {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const login = (token, user) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
    dispatch({
      type: 'LOGIN_SUCCESS',
      payload: { token, user }
    });
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const hasPermission = (permission) => {
    if (!state.user || !state.user.permissions) {
      return false;
    }

    // Admin has all permissions
    if (state.user.permissions.includes('*')) {
      return true;
    }

    return state.user.permissions.includes(permission);
  };

  const hasRole = (role) => {
    return state.user?.role === role;
  };

  const authenticateUser = (username, password) => {
    console.log('Authenticating user:', username, 'with password:', password);
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('gatewayUsers') || '[]');
    console.log('Available users:', users.map(u => ({ username: u.username, password: u.password })));

    // Find user by username
    const user = users.find(u => u.username === username && u.isActive);
    
    if (!user) {
      console.log('User not found or inactive');
      return { success: false, message: 'User not found or inactive' };
    }

    if (user.isLocked) {
      console.log('User account is locked');
      return { success: false, message: 'Account is locked' };
    }

    // Check password - for demo, we use plain text comparison
    const isValidPassword = user.password === password;
    console.log('Password check:', isValidPassword);

    if (!isValidPassword) {
      // Update failed login attempts
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, loginAttempts: (u.loginAttempts || 0) + 1 }
          : u
      );
      localStorage.setItem('gatewayUsers', JSON.stringify(updatedUsers));
      
      console.log('Invalid password');
      return { success: false, message: 'Invalid password' };
    }

    // Reset login attempts on successful login
    const updatedUsers = users.map(u => 
      u.id === user.id 
        ? { 
            ...u, 
            loginAttempts: 0, 
            lastLogin: new Date().toISOString() 
          }
        : u
    );
    localStorage.setItem('gatewayUsers', JSON.stringify(updatedUsers));

    console.log('Login successful for user:', user.username);
    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions
      }
    };
  };

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      updateUser,
      hasPermission,
      hasRole,
      authenticateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};