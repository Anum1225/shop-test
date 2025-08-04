# Troubleshooting Guide

## Common Issues and Solutions

### 1. WebSocket Connection Errors

**Error**: `WebSocket connection to 'wss://localhost:8002/socket' failed`

**Solutions**:
- Ensure you're running the development server with `npm run dev`
- Check that port 8002 is not blocked by firewall
- For local development without Shopify CLI, use `npm run dev:local`
- Verify SHOPIFY_APP_URL environment variable is set correctly

### 2. X-Frame-Options / Embedding Issues

**Error**: `Refused to display in a frame because it set 'X-Frame-Options' to 'sameorigin'`

**Solutions**:
- Ensure your app is configured with `embedded = true` in shopify.app.toml
- Check that proper CSP headers are set in entry.server.jsx
- Verify the app is accessed through Shopify admin, not directly

### 3. 504 Gateway Timeout

**Error**: `Failed to load resource: the server responded with a status of 504`

**Solutions**:
- Check your internet connection
- Verify the SHOPIFY_APP_URL is accessible
- Ensure your development server is running
- Check if your tunnel (ngrok/cloudflare) is active

### 4. Authentication Issues

**Error**: Authentication failed or redirect loops

**Solutions**:
- Verify SHOPIFY_API_KEY and SHOPIFY_API_SECRET are set correctly
- Check that redirect URLs in shopify.app.toml match your app URL
- Ensure scopes in shopify.app.toml match your app requirements
- Clear browser cache and cookies

### 5. CORS Issues

**Error**: Cross-origin request blocked

**Solutions**:
- Check CORS headers in vite.config.js
- Verify middleware.js is properly configured
- Ensure your app URL is whitelisted in Shopify partner dashboard

## Development Setup

### Environment Variables

Create a `.env` file with:
```
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret
SHOPIFY_APP_URL=your_app_url
SCOPES=read_orders,write_products,read_customers
DATABASE_URL="file:./dev.sqlite"
```

### Running the App

1. **With Shopify CLI** (recommended):
   ```bash
   npm run dev
   ```

2. **Local development**:
   ```bash
   npm run dev:local
   ```

3. **Production build**:
   ```bash
   npm run build
   npm start
   ```

### Testing

Run tests to ensure everything is working:
```bash
npm test
```

### Database Setup

Initialize the database:
```bash
npm run setup
```

## Browser Console Errors

### Common Console Errors and Fixes

1. **Module not found errors**: Run `npm install` to ensure all dependencies are installed
2. **TypeScript errors**: Check tsconfig.json configuration
3. **React hydration errors**: Ensure server and client rendering match
4. **Network errors**: Check your internet connection and app URL

## Performance Issues

### Slow Loading

- Check network tab in browser dev tools
- Verify HMR is working properly
- Check for large bundle sizes
- Ensure proper caching headers

### Memory Issues

- Check for memory leaks in React components
- Verify proper cleanup in useEffect hooks
- Monitor browser memory usage

## Getting Help

If you're still experiencing issues:

1. Check the browser console for detailed error messages
2. Review the network tab for failed requests
3. Check the Shopify CLI logs
4. Verify your app configuration in the Shopify partner dashboard
5. Ensure all environment variables are set correctly

## Useful Commands

```bash
# Check app configuration
shopify app info

# Generate new app components
shopify app generate

# Deploy to production
shopify app deploy

# Link to existing app
shopify app config link

# View environment variables
shopify app env show
```
