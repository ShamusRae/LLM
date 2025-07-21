import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BasicInfoStep from '../BasicInfoStep';

// Mock StepWrapper
jest.mock('../../StepWrapper', () => ({
  StepWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, component, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  TextField: React.forwardRef(({ inputRef, inputProps, value, onChange, multiline, error, fullWidth, ...props }: any, ref) => (
    <textarea
      ref={inputRef || ref}
      value={value || ''}
      onChange={onChange}
      data-multiline={multiline}
      data-error={error}
      data-fullwidth={fullWidth}
      {...inputProps}
      {...props}
    />
  )),
  Typography: ({ children, variant, color, sx, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  FormControl: ({ children, error, fullWidth, ...props }: any) => (
    <div data-error={error} data-fullwidth={fullWidth} {...props}>{children}</div>
  ),
  FormHelperText: ({ children, error, ...props }: any) => (
    <div data-error={error} {...props}>{children}</div>
  ),
  Paper: ({ children, elevation, sx, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
}));

describe('BasicInfoStep', () => {
  const mockOnSubmit = jest.fn();
  const mockRef = React.createRef<any>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all form fields', () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    expect(screen.getByLabelText(/role or purpose of the ai agent/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/success criteria and goals for the ai agent/i)).toBeInTheDocument();
  });

  it('shows validation error for empty required field', async () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    const roleInput = screen.getByLabelText(/role or purpose of the ai agent/i);

    await act(async () => {
      fireEvent.change(roleInput, { target: { value: ' ' } });
      fireEvent.blur(roleInput);
    });

    // Wait for the error message to appear
    await screen.findByText(/role description should be at least 10 characters/i);
  });

  it('shows validation error for too short role description', async () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    const roleInput = screen.getByLabelText(/role or purpose of the ai agent/i);

    await act(async () => {
      fireEvent.change(roleInput, { target: { value: 'Short' } });
      fireEvent.blur(roleInput);
    });

    await screen.findByText(/role description should be at least 10 characters/i);
  });

  it('calls onSubmit with correct data when form is valid', async () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    const roleInput = screen.getByLabelText(/role or purpose of the ai agent/i);
    const successCriteriaInput = screen.getByLabelText(/success criteria and goals for the ai agent/i);

    await act(async () => {
      fireEvent.change(roleInput, { target: { value: 'This is a valid role description that is long enough' } });
      fireEvent.change(successCriteriaInput, { target: { value: 'Test Criteria' } });
      fireEvent.submit(screen.getByRole('form'));
    });

    expect(mockOnSubmit).toHaveBeenCalledWith({
      role: 'This is a valid role description that is long enough',
      successCriteria: 'Test Criteria',
    });
  });

  it('handles keyboard shortcuts correctly', async () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    const roleInput = screen.getByLabelText(/role or purpose of the ai agent/i);
    const successCriteriaInput = screen.getByLabelText(/success criteria and goals for the ai agent/i);

    await act(async () => {
      fireEvent.change(roleInput, { target: { value: 'This is a valid role description that is long enough' } });
      fireEvent.keyDown(roleInput, { key: 'Enter' });
    });

    expect(successCriteriaInput).toHaveFocus();
  });

  it('handles multiline input correctly', async () => {
    const multilineText = 'Line 1\nLine 2\nLine 3';
    render(<BasicInfoStep />);
    
    const roleInput = screen.getByLabelText(/role or purpose/i);
    
    await act(async () => {
      fireEvent.change(roleInput, {
        target: {
          value: multilineText,
          name: 'role'
        }
      });
    });

    expect(roleInput).toHaveValue(multilineText);
  });

  it('focuses first input when step becomes active', () => {
    const { rerender } = render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={false}
      />
    );

    const roleInput = screen.getByLabelText(/role or purpose of the ai agent/i);
    expect(roleInput).not.toHaveFocus();

    rerender(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    expect(roleInput).toHaveFocus();
  });

  it('exposes correct methods through ref', () => {
    render(
      <BasicInfoStep
        ref={mockRef}
        onSubmit={mockOnSubmit}
        isActive={true}
      />
    );

    expect(mockRef.current.validateStep).toBeDefined();
    expect(typeof mockRef.current.validateStep).toBe('function');

    expect(mockRef.current.saveData).toBeDefined();
    expect(typeof mockRef.current.saveData).toBe('function');

    expect(mockRef.current.focusFirstInput).toBeDefined();
    expect(typeof mockRef.current.focusFirstInput).toBe('function');
  });
}); 