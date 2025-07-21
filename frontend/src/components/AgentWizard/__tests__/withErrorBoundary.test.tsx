import React from 'react';
import { render, screen } from '@testing-library/react';
import withErrorBoundary from '../withErrorBoundary';
import { AgentWizardProps } from '../AgentWizard';

// Mock ErrorBoundary component
jest.mock('../../ErrorBoundary', () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="error-boundary">{children}</div>
    ),
  };
});

// Create a mock component to wrap
const MockComponent: React.FC<AgentWizardProps> = ({ open }) => (
  <div data-testid="mock-component">
    {open ? 'Open' : 'Closed'}
  </div>
);

describe('withErrorBoundary', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps component with ErrorBoundary', () => {
    const WrappedComponent = withErrorBoundary(MockComponent);
    render(
      <WrappedComponent
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
  });

  it('passes props to wrapped component', () => {
    const WrappedComponent = withErrorBoundary(MockComponent);
    render(
      <WrappedComponent
        open={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('sets correct display name', () => {
    const WrappedComponent = withErrorBoundary(MockComponent);
    expect(WrappedComponent.displayName).toBe('WithErrorBoundary(MockComponent)');
  });
}); 