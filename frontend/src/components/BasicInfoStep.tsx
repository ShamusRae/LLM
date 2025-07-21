import React, { forwardRef, useImperativeHandle } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Typography,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Button,
} from '@mui/material';

// Define the form data structure
export interface BasicInfoFormData {
  agentName: string;
  agentType: string;
  rolePurpose: string;
  successCriteria: string;
  description: string;
}

// Define the component props
interface BasicInfoStepProps {
  initialData?: Partial<BasicInfoFormData>;
  onSubmit?: (data: BasicInfoFormData) => void;
  stepNumber?: number;
  totalSteps?: number;
}

// Define the ref interface for parent component access
export interface BasicInfoStepRef {
  validateStep: () => boolean;
  saveData: () => BasicInfoFormData;
  submitForm: () => void;
}

// Agent type options
const AGENT_TYPES = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'analyst', label: 'Analyst' },
  { value: 'customer_support', label: 'Customer Support' },
  { value: 'creative', label: 'Creative' },
];

const BasicInfoStep = forwardRef<BasicInfoStepRef, BasicInfoStepProps>((props, ref) => {
  const { 
    initialData = {}, 
    onSubmit,
    stepNumber = 1,
    totalSteps = 11
  } = props;

  // Initialize the form with React Hook Form
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    trigger,
    getValues,
  } = useForm<BasicInfoFormData>({
    defaultValues: {
      agentName: initialData.agentName || '',
      agentType: initialData.agentType || '',
      rolePurpose: initialData.rolePurpose || '',
      successCriteria: initialData.successCriteria || '',
      description: initialData.description || '',
    },
    mode: 'onChange', // Validate on change for immediate feedback
  });

  // Handle form submission
  const onFormSubmit = (data: BasicInfoFormData) => {
    if (onSubmit) {
      onSubmit(data);
    }
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    validateStep: () => {
      return trigger();
    },
    saveData: () => {
      return getValues();
    },
    submitForm: () => {
      handleSubmit(onFormSubmit)();
    }
  }));

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 500 }}>
            Basic Information
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {stepNumber} of {totalSteps}
          </Typography>
        </Box>
        
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Configure the basic details for your agent. Fields marked with * are required.
        </Typography>
      </Box>

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
          <Grid container spacing={3}>
            {/* Agent Name */}
            <Grid item xs={12}>
              <Controller
                name="agentName"
                control={control}
                rules={{ required: 'Agent name is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Agent Name *"
                    placeholder="Enter agent name"
                    variant="outlined"
                    error={!!errors.agentName}
                    helperText={errors.agentName?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Agent Type */}
            <Grid item xs={12}>
              <Controller
                name="agentType"
                control={control}
                rules={{ required: 'Please select an agent type' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.agentType}>
                    <InputLabel id="agent-type-label" required>
                      Agent Type
                    </InputLabel>
                    <Select
                      {...field}
                      labelId="agent-type-label"
                      label="Agent Type *"
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Select agent type
                      </MenuItem>
                      {AGENT_TYPES.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.agentType && (
                      <FormHelperText>{errors.agentType.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Role or Purpose */}
            <Grid item xs={12}>
              <Controller
                name="rolePurpose"
                control={control}
                rules={{ required: 'Role or Purpose is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Role or Purpose *"
                    placeholder="Specify the main role or purpose of this agent"
                    variant="outlined"
                    error={!!errors.rolePurpose}
                    helperText={errors.rolePurpose?.message}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Success Criteria / Goals */}
            <Grid item xs={12}>
              <Controller
                name="successCriteria"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Success Criteria / Goals"
                    placeholder="Define what success looks like for this agent"
                    variant="outlined"
                    multiline
                    rows={3}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>

            {/* Additional Description */}
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Additional Description"
                    placeholder="Describe what this agent does in more detail"
                    variant="outlined"
                    multiline
                    rows={3}
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Paper>

        {/* Error summary */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            Please fix the errors above before proceeding.
          </Alert>
        )}

        {/* Submit button - only visible when used standalone */}
        {onSubmit && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!isValid}
              sx={{ backgroundColor: '#2d3c59' }}
            >
              Next
            </Button>
          </Box>
        )}
      </form>
    </Box>
  );
});

export default BasicInfoStep; 