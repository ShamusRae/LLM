import React, { forwardRef, useImperativeHandle, memo, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  FormHelperText,
  Paper,
} from '@mui/material';
import { StepWrapper } from '../StepWrapper';

interface BasicInfoFormData {
  role: string;
  successCriteria: string;
}

interface BasicInfoStepProps {
  onSubmit?: (data: BasicInfoFormData) => void;
  isActive?: boolean;
  initialData?: BasicInfoFormData;
}

export interface BasicInfoStepRef {
  validateStep: () => boolean;
  saveData: () => BasicInfoFormData;
  focusFirstInput: () => void;
}

const BasicInfoStep = memo(forwardRef<BasicInfoStepRef, BasicInfoStepProps>(
  ({ onSubmit, isActive = false, initialData }, ref) => {
    const {
      control,
      handleSubmit,
      formState: { errors, isValid },
      trigger,
      getValues,
      reset,
    } = useForm<BasicInfoFormData>({
      defaultValues: {
        role: initialData?.role || '',
        successCriteria: initialData?.successCriteria || '',
      },
      mode: 'onChange',
    });

    // Reset form when initialData changes
    useEffect(() => {
      if (initialData) {
        reset(initialData);
      }
    }, [initialData, reset]);

    // Refs for focus management
    const roleInputRef = useRef<HTMLInputElement>(null);
    const successCriteriaInputRef = useRef<HTMLInputElement>(null);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      validateStep: () => isValid,
      saveData: () => getValues(),
      focusFirstInput: () => roleInputRef.current?.focus(),
    }));

    // Focus first input when step becomes active
    useEffect(() => {
      if (isActive) {
        roleInputRef.current?.focus();
      }
    }, [isActive]);

    const onFormSubmit = (data: BasicInfoFormData) => {
      if (onSubmit) {
        onSubmit(data);
      }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (event: React.KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleSubmit(onFormSubmit)();
      }
      
      // Tab + Enter to move to next field
      if (event.key === 'Enter' && !event.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement === roleInputRef.current) {
          event.preventDefault();
          successCriteriaInputRef.current?.focus();
        }
      }
    };

    // Generate unique IDs for ARIA attributes
    const roleErrorId = 'role-error';
    const roleDescriptionId = 'role-description';
    const successCriteriaDescriptionId = 'success-criteria-description';
    const formInstructionsId = 'form-instructions';

    return (
      <StepWrapper
        title="Basic Information"
        description="Define the core purpose and goals of your AI agent"
        stepNumber={1}
        totalSteps={11}
        helpText="This information helps define your agent's primary function and success metrics."
      >
        {/* Form container with accessibility attributes */}
        <Box 
          component="form" 
          onSubmit={handleSubmit(onFormSubmit)} 
          noValidate
          role="form"
          aria-label="Basic Information Form"
          aria-describedby={formInstructionsId}
          onKeyDown={handleKeyDown}
        >
          {/* Form instructions for screen readers */}
          <div
            id={formInstructionsId}
            className="sr-only"
            aria-live="polite"
          >
            Press Ctrl + Enter to submit the form. Use Tab to navigate between fields.
            Press Enter to move to the next field. Press Shift + Enter for a new line.
          </div>

          <Paper elevation={0} sx={{ p: 3, bgcolor: 'background.default' }}>
            {/* Role input with accessibility attributes */}
            <FormControl 
              fullWidth 
              error={!!errors.role}
              aria-describedby={`${roleErrorId} ${roleDescriptionId}`}
            >
              <Controller
                name="role"
                control={control}
                rules={{
                  required: 'Role or Purpose is required',
                  minLength: {
                    value: 10,
                    message: 'Role description should be at least 10 characters',
                  },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Role or Purpose"
                    placeholder="e.g., Customer Support Specialist, Research Assistant, Code Reviewer"
                    multiline
                    rows={3}
                    error={!!errors.role}
                    fullWidth
                    variant="outlined"
                    sx={{ 
                      mb: 2,
                      '& .MuiInputLabel-root': {
                        backgroundColor: 'background.paper',
                        px: 1,
                        m: 0,
                        transform: 'translate(14px, -9px) scale(0.75)',
                      }
                    }}
                    inputRef={roleInputRef}
                    inputProps={{
                      'aria-required': 'true',
                      'aria-invalid': !!errors.role,
                      'aria-describedby': `${roleErrorId} ${roleDescriptionId}`,
                      'aria-label': 'Role or Purpose of the AI agent',
                      'aria-errormessage': errors.role ? roleErrorId : undefined,
                    }}
                    InputLabelProps={{
                      shrink: true,
                      htmlFor: 'role-input',
                    }}
                    id="role-input"
                  />
                )}
              />
              {errors.role && (
                <FormHelperText 
                  error 
                  id={roleErrorId}
                  role="alert"
                  aria-live="polite"
                >
                  {errors.role.message}
                </FormHelperText>
              )}
              <Typography 
                id={roleDescriptionId}
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Describe the primary role or purpose of your AI agent.
              </Typography>
            </FormControl>

            {/* Success Criteria input with accessibility attributes */}
            <FormControl 
              fullWidth
              aria-describedby={successCriteriaDescriptionId}
            >
              <Controller
                name="successCriteria"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Success Criteria / Goals"
                    placeholder="e.g., Reduce customer response time by 50%, Improve code review accuracy to 95%"
                    multiline
                    rows={4}
                    fullWidth
                    variant="outlined"
                    sx={{ mb: 2 }}
                    inputRef={successCriteriaInputRef}
                    inputProps={{
                      'aria-describedby': successCriteriaDescriptionId,
                      'aria-label': 'Success criteria and goals for the AI agent',
                    }}
                    InputLabelProps={{
                      htmlFor: 'success-criteria-input',
                    }}
                    id="success-criteria-input"
                  />
                )}
              />
              <Typography 
                id={successCriteriaDescriptionId}
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                Define measurable goals and success criteria for your agent.
              </Typography>
            </FormControl>

            {/* Helpful tip with accessibility attributes */}
            <Typography 
              variant="caption" 
              color="text.secondary"
              role="note"
              aria-label="Form tip"
              sx={{ display: 'block', mt: 2 }}
            >
              Tip: Be specific about your agent's role and measurable success criteria to help guide its behavior and evaluate its performance.
            </Typography>
          </Paper>
        </Box>
      </StepWrapper>
    );
  }
));

BasicInfoStep.displayName = 'BasicInfoStep';

export default BasicInfoStep; 