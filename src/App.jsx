import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

// Components
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Dashboard from './pages/Dashboard';
import Devices from './pages/Devices';
import Data from './pages/Data';
import Analytics from './pages/Analytics';
import DataHistory from './pages/DataHistory';
import Alarms from './pages/Alarms';
import Settings from './pages/Settings';
import Logs from './pages/Logs';
import Users from './pages/Users';
import Profile from './pages/Profile';

// Context
import { GatewayProvider } from './context/GatewayContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Hide loading indicator from HTML
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      // Use environment variable or fallback for socket URL
      const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      const newSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true
      });

      setSocket(newSocket);
      // Make socket available globally for components that need it
      window.socketInstance = newSocket;

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('Connected to gateway server');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        console.log('Disconnected from gateway server');
      });

      newSocket.on('connect_error', (error) => {
        console.warn('Socket connection error:', error);
        setIsConnected(false);
      });

      return () => {
        newSocket.close();
        delete window.socketInstance;
      };
    }
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IoT Gateway...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <GatewayProvider socket={socket}>
      <Router>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col h-full">
              <div className="flex-shrink-0 flex items-center justify-between p-6 bg-white border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">IoT Protocol Gateway</h1>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <AnimatePresence mode="wait">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/devices" element={
                      <ProtectedRoute permission="devices:read">
                        <Devices />
                      </ProtectedRoute>
                    } />
                    <Route path="/data" element={
                      <ProtectedRoute permission="data:read">
                        <Data />
                      </ProtectedRoute>
                    } />
                    <Route path="/analytics" element={
                      <ProtectedRoute permission="data:read">
                        <Analytics />
                      </ProtectedRoute>
                    } />
                    <Route path="/history" element={
                      <ProtectedRoute permission="history:read">
                        <DataHistory />
                      </ProtectedRoute>
                    } />
                    <Route path="/alarms" element={
                      <ProtectedRoute permission="alarms:read">
                        <Alarms />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute permission="users:read">
                        <Users />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute permission="settings:read">
                        <Settings />
                      </ProtectedRoute>
                    } />
                    <Route path="/logs" element={
                      <ProtectedRoute permission="logs:read">
                        <Logs />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AnimatePresence>
              </div>
            </div>
          </main>
        </div>
      </Router>
    </GatewayProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;