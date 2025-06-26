import React, { createContext, useContext, useReducer, useEffect } from 'react';

const GatewayContext = createContext();

const initialState = {
  devices: [],
  logs: [],
  stats: {
    totalDevices: 0,
    activeDevices: 0,
    messagesProcessed: 0,
    errors: 0
  },
  settings: {
    mqtt: {
      broker: 'localhost',
      port: 1883,
      username: '',
      password: '',
      topic: 'iot/gateway'
    },
    polling: {
      interval: 5000,
      timeout: 3000
    }
  }
};

function gatewayReducer(state, action) {
  switch (action.type) {
    case 'SET_DEVICES':
      return { ...state, devices: action.payload };
    case 'ADD_DEVICE':
      return { ...state, devices: [...state.devices, action.payload] };
    case 'UPDATE_DEVICE':
      return {
        ...state,
        devices: state.devices.map(device =>
          device.id === action.payload.id ? { ...device, ...action.payload } : device
        )
      };
    case 'DELETE_DEVICE':
      return {
        ...state,
        devices: state.devices.filter(device => device.id !== action.payload)
      };
    case 'SET_LOGS':
      return { ...state, logs: action.payload };
    case 'ADD_LOG':
      return {
        ...state,
        logs: [action.payload, ...state.logs].slice(0, 1000)
      };
    case 'UPDATE_STATS':
      return { ...state, stats: { ...state.stats, ...action.payload } };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

export function GatewayProvider({ children, socket }) {
  const [state, dispatch] = useReducer(gatewayReducer, initialState);

  useEffect(() => {
    if (socket) {
      socket.on('devicesUpdate', (devices) => {
        dispatch({ type: 'SET_DEVICES', payload: devices });
      });

      socket.on('deviceUpdate', (device) => {
        dispatch({ type: 'UPDATE_DEVICE', payload: device });
      });

      socket.on('newLog', (log) => {
        dispatch({ type: 'ADD_LOG', payload: log });
      });

      socket.on('logsUpdate', (logs) => {
        dispatch({ type: 'SET_LOGS', payload: logs });
      });

      socket.on('statsUpdate', (stats) => {
        dispatch({ type: 'UPDATE_STATS', payload: stats });
      });

      socket.on('settingsUpdate', (settings) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      });

      // Request initial data
      socket.emit('getDevices');
      socket.emit('getSettings');
      
      return () => {
        socket.off('devicesUpdate');
        socket.off('deviceUpdate');
        socket.off('newLog');
        socket.off('logsUpdate');
        socket.off('statsUpdate');
        socket.off('settingsUpdate');
      };
    }
  }, [socket]);

  const addDevice = (device) => {
    if (socket) {
      socket.emit('addDevice', device);
    }
  };

  const updateDevice = (device) => {
    if (socket) {
      socket.emit('updateDevice', device);
    }
  };

  const deleteDevice = (deviceId) => {
    if (socket) {
      socket.emit('deleteDevice', deviceId);
    }
  };

  const updateSettings = (settings) => {
    if (socket) {
      socket.emit('updateSettings', settings);
    }
  };

  return (
    <GatewayContext.Provider value={{
      ...state,
      addDevice,
      updateDevice,
      deleteDevice,
      updateSettings,
      dispatch
    }}>
      {children}
    </GatewayContext.Provider>
  );
}

export const useGateway = () => {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error('useGateway must be used within a GatewayProvider');
  }
  return context;
};