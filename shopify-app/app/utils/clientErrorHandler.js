// Client-side error handling and suppression
export function initializeClientErrorHandling() {
  // Suppress SendBeacon errors
  const originalSendBeacon = navigator.sendBeacon;
  if (originalSendBeacon) {
    navigator.sendBeacon = function(...args) {
      try {
        return originalSendBeacon.apply(this, args);
      } catch (error) {
        console.warn('SendBeacon failed (suppressed):', error);
        return false;
      }
    };
  }

  // Handle WebSocket connection errors gracefully
  const originalWebSocket = window.WebSocket;
  if (originalWebSocket) {
    window.WebSocket = function(url, protocols) {
      const ws = new originalWebSocket(url, protocols);
      
      ws.addEventListener('error', function(event) {
        console.warn('WebSocket error (handled):', event);
      });
      
      ws.addEventListener('close', function(event) {
        if (event.code !== 1000) {
          console.warn('WebSocket closed unexpectedly (handled):', event.code, event.reason);
        }
      });
      
      return ws;
    };
  }

  // Global error handler for unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    if (event.reason && event.reason.message) {
      // Suppress specific known errors
      if (event.reason.message.includes('SendBeacon') ||
          event.reason.message.includes('WebSocket') ||
          event.reason.message.includes('Failed to fetch')) {
        console.warn('Suppressed unhandled rejection:', event.reason.message);
        event.preventDefault();
        return;
      }
    }
    
    console.error('Unhandled promise rejection:', event.reason);
  });

  // Global error handler for JavaScript errors
  window.addEventListener('error', function(event) {
    if (event.message) {
      // Suppress specific known errors
      if (event.message.includes('SendBeacon') ||
          event.message.includes('WebSocket') ||
          event.message.includes('Script error')) {
        console.warn('Suppressed error:', event.message);
        event.preventDefault();
        return;
      }
    }
    
    console.error('Global error:', event.error || event.message);
  });

  // Suppress console errors for development
  if (process.env.NODE_ENV === 'development') {
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      
      // Suppress known development errors
      if (message.includes('SendBeacon') ||
          message.includes('WebSocket connection') ||
          message.includes('Failed to fetch')) {
        console.warn('Suppressed console error:', message);
        return;
      }
      
      originalConsoleError.apply(console, args);
    };
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initializeClientErrorHandling();
}
