import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

export default function App() {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta httpEquiv="Content-Security-Policy" content="frame-ancestors https://*.myshopify.com https://admin.shopify.com;" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize client-side error handling
              (function() {
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

                // Global error handlers
                window.addEventListener('unhandledrejection', function(event) {
                  if (event.reason && event.reason.message) {
                    if (event.reason.message.includes('SendBeacon') ||
                        event.reason.message.includes('WebSocket') ||
                        event.reason.message.includes('Failed to fetch')) {
                      console.warn('Suppressed unhandled rejection:', event.reason.message);
                      event.preventDefault();
                      return;
                    }
                  }
                });

                window.addEventListener('error', function(event) {
                  if (event.message) {
                    if (event.message.includes('SendBeacon') ||
                        event.message.includes('WebSocket') ||
                        event.message.includes('Script error')) {
                      console.warn('Suppressed error:', event.message);
                      event.preventDefault();
                      return;
                    }
                  }
                });
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
