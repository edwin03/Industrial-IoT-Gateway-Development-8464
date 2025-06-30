// Global error handler utility
export const handleError = (error, context = 'Application') => {
  console.error(`${context} Error:`, error);
  
  // You could integrate with error reporting services here
  // like Sentry, LogRocket, etc.
  
  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR',
    context
  };
};

// Network error handler
export const handleNetworkError = (error) => {
  if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
    return {
      message: 'Network connection failed. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      context: 'Network'
    };
  }
  
  return handleError(error, 'Network');
};

// API error handler
export const handleApiError = (error) => {
  if (error.response) {
    return {
      message: error.response.data?.message || 'API request failed',
      code: error.response.status,
      context: 'API'
    };
  }
  
  return handleError(error, 'API');
};