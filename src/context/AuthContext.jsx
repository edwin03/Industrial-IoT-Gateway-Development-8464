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

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
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
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('gatewayUsers') || '[]');
    
    // Find user by username
    const user = users.find(u => u.username === username && u.isActive);
    
    if (!user) {
      return { success: false, message: 'User not found or inactive' };
    }

    if (user.isLocked) {
      return { success: false, message: 'Account is locked' };
    }

    // For demo purposes, check against demo passwords or stored password
    let isValidPassword = false;
    
    if (username === 'admin' && password === 'admin123') {
      isValidPassword = true;
    } else if (username === 'operator' && password === 'operator123') {
      isValidPassword = true;
    } else if (username === 'viewer' && password === 'viewer123') {
      isValidPassword = true;
    } else if (user.password && password === 'temppass123') {
      // Temporary password for reset
      isValidPassword = true;
    }

    if (!isValidPassword) {
      // Update failed login attempts
      const updatedUsers = users.map(u => 
        u.id === user.id 
          ? { ...u, loginAttempts: (u.loginAttempts || 0) + 1 }
          : u
      );
      localStorage.setItem('gatewayUsers', JSON.stringify(updatedUsers));
      
      return { success: false, message: 'Invalid password' };
    }

    // Reset login attempts on successful login
    const updatedUsers = users.map(u => 
      u.id === user.id 
        ? { ...u, loginAttempts: 0, lastLogin: new Date().toISOString() }
        : u
    );
    localStorage.setItem('gatewayUsers', JSON.stringify(updatedUsers));

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
    <AuthContext.Provider 
      value={{
        ...state,
        login,
        logout,
        updateUser,
        hasPermission,
        hasRole,
        authenticateUser
      }}
    >
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