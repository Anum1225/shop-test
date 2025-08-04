import React from 'react';
import { Page, Card, Text, Button, BlockStack } from '@shopify/polaris';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Prevent SendBeacon errors from propagating
    if (error.message && error.message.includes('SendBeacon')) {
      console.warn('SendBeacon error caught and suppressed:', error);
      return;
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Page title="Something went wrong">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Oops! Something went wrong
              </Text>
              <Text>
                We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
              </Text>
              <Button onClick={this.handleReset} primary>
                Try Again
              </Button>
              {process.env.NODE_ENV === 'development' && (
                <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
                  <summary>Error Details (Development Only)</summary>
                  <Text as="pre" variant="bodyMd">
                    {this.state.error && this.state.error.toString()}
                    <br />
                    {this.state.errorInfo.componentStack}
                  </Text>
                </details>
              )}
            </BlockStack>
          </Card>
        </Page>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
