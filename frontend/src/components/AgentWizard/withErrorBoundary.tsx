import React from 'react';
import ErrorBoundary from '../ErrorBoundary';
import { AgentWizardProps } from './AgentWizard';

export const withErrorBoundary = (WrappedComponent: React.ComponentType<AgentWizardProps>) => {
  const WithErrorBoundary = (props: AgentWizardProps) => {
    return (
      <ErrorBoundary>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };

  WithErrorBoundary.displayName = `WithErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithErrorBoundary;
};

export default withErrorBoundary; 