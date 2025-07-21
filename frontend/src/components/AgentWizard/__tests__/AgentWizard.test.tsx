/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AgentWizard from '../AgentWizard';
import { apiCall } from '../../../utils/apiCall';
import {
  trackStepTransition,
  trackFormSubmission,
  trackValidationError,
  trackApiError,
  trackEditStep
} from '../../../utils/analytics';
import { featureFlags } from '../../../config/featureFlags';

// Mock the apiCall utility
jest.mock('../../../utils/apiCall');

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, sx }: { children: React.ReactNode; sx?: any }) => <div style={sx}>{children}</div>,
  Dialog: ({ children, open, onClose, maxWidth, fullWidth, 'aria-labelledby': ariaLabelledBy, onClick }: { 
    children: React.ReactNode; 
    open: boolean; 
    onClose?: () => void;
    maxWidth?: string;
    fullWidth?: boolean;
    'aria-labelledby'?: string;
    onClick?: (e: any) => void;
  }) => (
    open ? (
      <div 
        role="dialog" 
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => {
          onClick?.(e);
          if (e.target === e.currentTarget) {
            onClose?.();
          }
        }}
        style={{
          width: fullWidth ? '100%' : maxWidth === 'md' ? '600px' : '400px'
        }}
      >
        {children}
      </div>
    ) : null
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, id }: { children: React.ReactNode; id: string }) => <h2 id={id}>{children}</h2>,
  Button: ({ children, onClick, variant, color }: { 
    children: React.ReactNode; 
    onClick?: () => void;
    variant?: string;
    color?: string;
  }) => (
    <button onClick={onClick} data-variant={variant} data-color={color}>{children}</button>
  ),
  Alert: ({ children, severity, onClose }: { 
    children: React.ReactNode; 
    severity: string;
    onClose?: () => void;
  }) => (
    <div role="alert" data-severity={severity}>
      {children}
      {onClose && <button onClick={onClose}>Close</button>}
    </div>
  ),
  Typography: ({ children, variant, color, sx }: { 
    children: React.ReactNode; 
    variant?: string;
    color?: string;
    sx?: any;
  }) => (
    <div data-variant={variant} data-color={color} style={sx}>{children}</div>
  ),
}));

// Mock Material-UI icons
jest.mock('@mui/icons-material', () => ({
  Save: () => <span data-testid="save-icon">save</span>,
}));

// Mock the StepWrapper component
jest.mock('../StepWrapper', () => ({
  StepWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock all step components
jest.mock('../steps/BasicInfoStep', () => ({
  __esModule: true,
  default: React.forwardRef(({ onSubmit }: any, ref: any) => {
    const mockRef = {
      validateStep: jest.fn().mockReturnValue(true),
      saveData: () => ({ role: 'Test Role', successCriteria: 'Test Criteria' }),
      focusFirstInput: () => {}
    };
    React.useImperativeHandle(ref, () => mockRef);
    return (
      <div data-testid="basic-info-step">
        <button onClick={() => onSubmit({ role: 'Test Role', successCriteria: 'Test Criteria' })}>
          Submit Basic Info
        </button>
      </div>
    );
  })
}));

jest.mock('../steps/ToolsStep', () => ({
  __esModule: true,
  default: React.forwardRef<any, any>((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      validateStep: () => true,
      saveData: () => ({ tools: ['tool1', 'tool2'] }),
      focusFirstInput: () => {}
    }));
    return (
      <div data-testid="tools-step">
        <button onClick={() => props.onSubmit({ tools: ['tool1', 'tool2'] })}>
          Submit Tools
        </button>
      </div>
    );
  })
}));

jest.mock('../steps/PreviewStep', () => ({
  __esModule: true,
  default: React.forwardRef<any, any>((props, ref) => {
    React.useImperativeHandle(ref, () => ({
      validateStep: () => true,
      saveData: () => ({}),
      focusFirstInput: () => {}
    }));
    return (
      <div data-testid="preview-step">
        <button onClick={() => props.onSubmit({})}>
          Create Agent
        </button>
        <button onClick={() => props.onEditStep(0)}>
          Edit Basic Info
        </button>
        <button onClick={() => props.onEditStep(1)}>
          Edit Tools
        </button>
      </div>
    );
  })
}));

// Mock analytics functions
jest.mock('../../../utils/analytics', () => ({
  trackStepTransition: jest.fn(),
  trackFormSubmission: jest.fn(),
  trackValidationError: jest.fn(),
  trackApiError: jest.fn(),
  trackEditStep: jest.fn(),
  default: {
    trackEvent: jest.fn()
  }
}));

// Mock feature flags
jest.mock('../../../config/featureFlags', () => ({
  featureFlags: {
    previewMode: true,
    advancedSettings: false,
    analyticsEnabled: true,
    autoSave: true,
    stepValidation: true,
  },
  getFeatureGroup: (group: string) => {
    switch (group) {
      case 'wizard':
        return {
          previewMode: true,
          stepValidation: true,
        };
      case 'settings':
        return {
          advancedSettings: false,
          autoSave: true,
        };
      case 'analytics':
        return {
          enabled: true,
        };
      default:
        return {};
    }
  },
  isFeatureEnabled: (flag: string) => featureFlags[flag as keyof typeof featureFlags],
}));

describe('AgentWizard', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (apiCall as jest.Mock).mockResolvedValue({ success: true });
    localStorage.clear();
    // Reset React hooks
    jest.spyOn(React, 'useRef').mockReturnValue({ current: [] });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the wizard with initial step', () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
  });

  it('navigates to tools step after clicking next', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
  });

  it('calls onSuccess and closes wizard after submitting tools', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Submit tools step
    fireEvent.click(screen.getByText('Submit Tools'));
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ tools: ['tool1', 'tool2'] });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('closes wizard when clicking outside', () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Simulate clicking outside the dialog
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates current step before navigation', async () => {
    const mockValidateStep = jest.fn().mockReturnValue(false);
    const mockRef = {
      validateStep: mockValidateStep,
      saveData: () => ({ role: 'Test Role', successCriteria: 'Test Criteria' }),
      focusFirstInput: () => {}
    };

    // Mock useRef to return an array with the mock ref
    const mockStepRefs = { current: [] as any[] };
    mockStepRefs.current[0] = mockRef;
    jest.spyOn(React, 'useRef').mockReturnValue(mockStepRefs);

    // Mock BasicInfoStep to use our mock ref
    jest.spyOn(React, 'useImperativeHandle').mockImplementation((ref) => {
      if (ref) {
        (ref as any).current = mockRef;
      }
    });

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    // Wait for the component to mount and render the first step
    await waitFor(() => {
      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
    });

    // Try to navigate to next step
    await act(async () => {
      fireEvent.click(screen.getByText('Next'));
    });

    // Should not navigate if validation fails
    expect(mockValidateStep).toHaveBeenCalled();
    expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
    expect(screen.queryByTestId('tools-step')).not.toBeInTheDocument();
  });

  it('saves state to localStorage when data changes', async () => {
    // Mock the refs for both steps
    const mockBasicInfoRef = {
      validateStep: () => true,
      saveData: () => ({ role: 'Test Role', successCriteria: 'Test Criteria' }),
      focusFirstInput: () => {}
    };
    const mockStepRefs = { current: [] as any[] };
    mockStepRefs.current[0] = mockBasicInfoRef;
    jest.spyOn(React, 'useRef').mockReturnValue(mockStepRefs);

    // Mock BasicInfoStep to use our mock ref
    jest.spyOn(React, 'useImperativeHandle').mockImplementation((ref) => {
      if (ref) {
        (ref as any).current = mockBasicInfoRef;
      }
    });

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    await act(async () => {
      fireEvent.click(screen.getByText('Submit Basic Info'));
    });
    
    // Wait for navigation and state save
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Wait for debounced save (debounce is 1000ms)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });
    
    const savedState = JSON.parse(localStorage.getItem('agentWizardData') || '{}');
    expect(savedState.currentStep).toBe(1);
    expect(savedState.basicInfo).toEqual({ role: 'Test Role', successCriteria: 'Test Criteria' });
  }, 5000); // Increase timeout for debounced save

  it('clears saved state when wizard is closed', async () => {
    // Set initial state
    const initialState = {
      currentStep: 0,
      basicInfo: { role: 'Test Role', successCriteria: 'Test Criteria' }
    };
    localStorage.setItem('agentWizardData', JSON.stringify(initialState));

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Verify state exists
    expect(localStorage.getItem('agentWizardData')).toBeTruthy();
    
    // Close the wizard
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    
    // Verify state is cleared
    expect(localStorage.getItem('agentWizardData')).toBeNull();
  });

  it('handles API errors gracefully', async () => {
    (apiCall as jest.Mock).mockRejectedValue(new Error('API Error'));
    
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    
    // Submit tools step
    fireEvent.click(screen.getByText('Submit Tools'));
    
    // Check error handling
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('API Error');
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('loads saved state from localStorage on mount', () => {
    const savedState = {
      currentStep: 1,
      basicInfo: { role: 'Saved Role', successCriteria: 'Saved Criteria' },
      tools: { tools: ['saved-tool1'] }
    };
    localStorage.setItem('agentWizardData', JSON.stringify(savedState));

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    expect(screen.getByTestId('tools-step')).toBeInTheDocument();
  });

  it('navigates through all steps including preview', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation to tools step
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Submit tools step
    fireEvent.click(screen.getByText('Submit Tools'));
    
    // Wait for navigation to preview step
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });

    // Submit from preview step
    fireEvent.click(screen.getByText('Create Agent'));
    
    // Wait for API call to complete
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('allows editing previous steps from preview', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Navigate to preview step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });

    // Edit basic info
    fireEvent.click(screen.getByText('Edit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('basic-info-step')).toBeInTheDocument();
    });

    // Edit tools
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
  });

  it('saves state to localStorage when navigating through all steps', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Navigate through all steps
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });

    // Wait for debounced save
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1100));
    });
    
    const savedState = JSON.parse(localStorage.getItem('agentWizardData') || '{}');
    expect(savedState.currentStep).toBe(2);
    expect(savedState.basicInfo).toEqual({ role: 'Test Role', successCriteria: 'Test Criteria' });
    expect(savedState.tools).toEqual({ tools: ['tool1', 'tool2'] });
  }, 5000);

  it('tracks step transitions', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Verify analytics tracking
    expect(trackFormSubmission).toHaveBeenCalledWith(0, { role: 'Test Role', successCriteria: 'Test Criteria' });
    expect(trackStepTransition).toHaveBeenCalledWith(0, 'next');
  });

  it('tracks validation errors', async () => {
    const mockValidateStep = jest.fn().mockReturnValue(false);
    const mockGetValidationErrors = jest.fn().mockReturnValue(['Invalid role']);
    const mockRef = {
      validateStep: mockValidateStep,
      getValidationErrors: mockGetValidationErrors,
      saveData: () => ({ role: 'Test Role', successCriteria: 'Test Criteria' }),
      focusFirstInput: () => {}
    };

    const mockStepRefs = { current: [] as any[] };
    mockStepRefs.current[0] = mockRef;
    jest.spyOn(React, 'useRef').mockReturnValue(mockStepRefs);

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Try to navigate to next step
    fireEvent.click(screen.getByText('Next'));
    
    // Verify analytics tracking
    expect(trackValidationError).toHaveBeenCalledWith(0, ['Invalid role']);
  });

  it('tracks API errors', async () => {
    const apiError = new Error('API Error');
    (apiCall as jest.Mock).mockRejectedValue(apiError);
    
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Navigate through steps
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });
    
    // Submit from preview step
    fireEvent.click(screen.getByText('Create Agent'));
    
    // Verify analytics tracking
    await waitFor(() => {
      expect(trackApiError).toHaveBeenCalledWith('API Error');
    });
  });

  it('tracks step editing from preview', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Navigate to preview step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Submit Tools'));
    await waitFor(() => {
      expect(screen.getByTestId('preview-step')).toBeInTheDocument();
    });

    // Edit basic info
    fireEvent.click(screen.getByText('Edit Basic Info'));
    
    // Verify analytics tracking
    expect(trackEditStep).toHaveBeenCalledWith(2, 0);
  });

  it('tracks back navigation', async () => {
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Navigate to tools step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Go back
    fireEvent.click(screen.getByText('Back'));
    
    // Verify analytics tracking
    expect(trackStepTransition).toHaveBeenCalledWith(1, 'back');
  });

  it('respects preview mode feature flag', async () => {
    // Mock preview mode disabled
    (featureFlags as any).previewMode = false;
    
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation to tools step
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Submit tools step
    fireEvent.click(screen.getByText('Submit Tools'));
    
    // Should not show preview step and submit directly
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('respects auto-save feature flag', async () => {
    // Mock auto-save disabled
    (featureFlags as any).autoSave = false;
    
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Wait for navigation
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });

    // Verify save status is not shown
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });

  it('respects analytics feature flag', async () => {
    // Mock analytics disabled
    (featureFlags as any).analyticsEnabled = false;
    
    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Submit first step
    fireEvent.click(screen.getByText('Submit Basic Info'));
    
    // Verify analytics events are not tracked
    expect(trackFormSubmission).not.toHaveBeenCalled();
    expect(trackStepTransition).not.toHaveBeenCalled();
  });

  it('respects step validation feature flag', async () => {
    // Mock step validation disabled
    (featureFlags as any).stepValidation = false;
    
    const mockValidateStep = jest.fn().mockReturnValue(false);
    const mockRef = {
      validateStep: mockValidateStep,
      saveData: () => ({ role: 'Test Role', successCriteria: 'Test Criteria' }),
      focusFirstInput: () => {}
    };

    const mockStepRefs = { current: [] as any[] };
    mockStepRefs.current[0] = mockRef;
    jest.spyOn(React, 'useRef').mockReturnValue(mockStepRefs);

    render(<AgentWizard open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    
    // Try to navigate to next step
    fireEvent.click(screen.getByText('Next'));
    
    // Should navigate even if validation fails
    await waitFor(() => {
      expect(screen.getByTestId('tools-step')).toBeInTheDocument();
    });
  });
}); 