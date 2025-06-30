// Authentication middleware for Socket.IO
export function socketAuthMiddleware(authService) {
  return (socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    const verification = authService.verifyToken(token);
    
    if (!verification.success) {
      return next(new Error('Invalid token'));
    }

    // Attach user info to socket
    socket.user = verification.user;
    next();
  };
}

// Permission check middleware
export function requirePermission(authService, permission) {
  return (socket, next) => {
    if (!socket.user) {
      return next(new Error('Authentication required'));
    }

    if (!authService.hasPermission(socket.user.permissions, permission)) {
      return next(new Error('Insufficient permissions'));
    }

    next();
  };
}

// Check if user has permission
export function hasPermission(authService, userPermissions, permission) {
  return authService.hasPermission(userPermissions, permission);
}