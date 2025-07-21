import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Dialog, DialogContent, DialogTitle, Button, Alert, Typography, DialogActions } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import BasicInfoStep, { BasicInfoStepRef } from './steps/BasicInfoStep';
import ToolsStep from './steps/ToolsStep';
import PreviewStep from './steps/PreviewStep';
import { apiCall } from '../../utils/apiCall';
import debounce from 'lodash/debounce';
import {
  trackStepTransition,
  trackFormSubmission,
  trackValidationError,
  trackApiError,
  trackEditStep,
  trackEvent
} from '../../utils/analytics';
import {
  isFeatureEnabled,
  getFeatureGroup,
  type FeatureFlags,
  type WizardFlags,
  type SettingsFlags,
  type AnalyticsFlags
} from '../../config/featureFlags';

interface WizardData {
  basicInfo: {
    name: string;
    description: string;
    type: string;
    role: string;
    successCriteria: string;
  };
  tools: {
    tools: string[];
  };
  currentStep: number;
}

interface AgentWizardProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WizardData) => void;
}

const STORAGE_KEY = 'agent_wizard_data';

// Validation function
const validateStep = async (data: any): Promise<boolean> => {
  // Basic validation for required fields
  if (!data.name?.trim()) {
    return false;
  }
  if (!data.description?.trim()) {
    return false;
  }
  if (!data.type) {
    return false;
  }
  return true;
};

const AgentWizard: React.FC<AgentWizardProps> = ({ open, onClose, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<WizardData>({
    basicInfo: {
      name: '',
      description: '',
      type: 'assistant',
      role: '',
      successCriteria: ''
    },
    tools: {
      tools: []
    },
    currentStep: 0
  });
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const stepRefs = useRef<(BasicInfoStepRef | any | null)[]>([]);

  // Get feature flags
  const wizardFlags = getFeatureGroup('wizard');
  const settingsFlags = getFeatureGroup('settings');
  const analyticsFlags = getFeatureGroup('analytics');

  // Extract specific flags
  const { previewMode, stepValidation, autoSave } = wizardFlags;
  const { analyticsEnabled } = analyticsFlags;

  // Load saved data on mount
  useEffect(() => {
    if (open) {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setWizardData(parsedData);
          setCurrentStep(parsedData.currentStep);
        } catch (err) {
          console.error('Error loading saved wizard data:', err);
        }
      }
    }
  }, [open]);

  // Debounced save function
  useEffect(() => {
    if (!autoSave) return;

    const saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
        setSaveStatus('Draft saved');
      } catch (err) {
        setSaveStatus('Failed to save draft');
      }
    }, 1000);

    return () => clearTimeout(saveTimeout);
  }, [wizardData, autoSave]);

  const handleClose = () => {
    // Clear saved data when wizard is closed
    localStorage.removeItem(STORAGE_KEY);
    onClose();
  };

  const handleStepSubmit = async (data: any) => {
    try {
      if (currentStep === 0) {
        // Validate first step if validation is enabled
        if (stepValidation) {
          const isValid = await validateStep(data);
          if (!isValid) {
            setError('Please fix the validation errors before proceeding');
            return;
          }
        }

        // Update state with first step data
        setWizardData(prev => ({ 
          ...prev, 
          basicInfo: data,
          currentStep: 1 
        }));

        // Track step completion if analytics is enabled
        if (analyticsEnabled) {
          trackEvent('wizard_step_completed', {
            step: 'basic_info',
            data: data
          });
        }
      } else if (currentStep === 1) {
        // Update state with tools data
        setWizardData(prev => ({ 
          ...prev, 
          tools: { tools: data },
          currentStep: previewMode ? 2 : 3 // Skip preview if disabled
        }));

        // Track step completion if analytics is enabled
        if (analyticsEnabled) {
          trackEvent('wizard_step_completed', {
            step: 'tools',
            data: data
          });
        }
      } else if (currentStep === 2) {
        // Handle preview step submission
        setWizardData(prev => ({ 
          ...prev, 
          currentStep: 3 
        }));

        // Track step completion if analytics is enabled
        if (analyticsEnabled) {
          trackEvent('wizard_step_completed', {
            step: 'preview',
            data: wizardData
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate final data if validation is enabled
      if (stepValidation) {
        const isValid = await validateStep(wizardData);
        if (!isValid) {
          setError('Please fix the validation errors before submitting');
          return;
        }
      }

      // Track final submission if analytics is enabled
      if (analyticsEnabled) {
        trackEvent('wizard_completed', {
          data: wizardData
        });
      }

      onSubmit(wizardData);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleNext = () => {
    if (!stepValidation || stepRefs.current[currentStep]?.validateStep()) {
      const currentData = stepRefs.current[currentStep]?.saveData();
      if (analyticsEnabled) {
        trackStepTransition(currentStep, 'next');
      }
      setWizardData(prev => ({
        ...prev,
        currentStep: currentStep + 1,
        ...(currentStep === 0 ? { basicInfo: currentData } : currentStep === 1 ? { tools: { tools: currentData } } : {})
      }));
      setCurrentStep(prev => prev + 1);
    } else {
      // Track validation errors if any
      const errors = stepRefs.current[currentStep]?.getValidationErrors?.() || ['Validation failed'];
      if (analyticsEnabled) {
        trackValidationError(currentStep, errors);
      }
    }
  };

  const handleBack = () => {
    if (analyticsEnabled) {
      trackStepTransition(currentStep, 'back');
    }
    setCurrentStep(prev => prev - 1);
    setWizardData(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
  };

  const handleEditStep = (step: number) => {
    if (analyticsEnabled) {
      trackEditStep(currentStep, step);
    }
    setCurrentStep(step);
    setWizardData(prev => ({ ...prev, currentStep: step }));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="agent-wizard-title"
      onClick={(e) => {
        // Only close if clicking the backdrop
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <DialogTitle id="agent-wizard-title">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Create New Agent</Typography>
          {autoSave && saveStatus && (
            <Typography variant="caption" color="text.secondary">
              {saveStatus}
            </Typography>
          )}
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {currentStep === 0 && (
          <BasicInfoStep
            ref={(el: BasicInfoStepRef | null) => stepRefs.current[currentStep] = el}
            onSubmit={handleStepSubmit}
            isActive={true}
            initialData={wizardData.basicInfo}
          />
        )}
        {currentStep === 1 && (
          <ToolsStep
            ref={(el: any) => stepRefs.current[currentStep] = el}
            onSubmit={handleStepSubmit}
            isActive={true}
            initialData={wizardData.tools.tools}
          />
        )}
        {previewMode && currentStep === 2 && (
          <PreviewStep
            ref={(el: any) => stepRefs.current[currentStep] = el}
            onSubmit={handleStepSubmit}
            isActive={true}
            wizardData={wizardData}
            onEditStep={handleEditStep}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {currentStep === (previewMode ? 2 : 1) ? (
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!!error}
          >
            Create Agent
          </Button>
        ) : (
          <Button 
            variant="contained" 
            onClick={() => handleStepSubmit({})}
            disabled={!!error}
          >
            Next
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AgentWizard; 