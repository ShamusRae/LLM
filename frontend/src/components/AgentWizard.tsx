import React, { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, Container, useTheme, useMediaQuery, CircularProgress } from '@mui/material';
import { WizardProvider } from '../contexts/WizardContext';
import { apiCall } from '../utils/apiCall';
import debounce from 'lodash.debounce';
import { useNavigate } from 'react-router-dom';

// Lazy load step components
const BasicInfoStep = lazy(() => import('./steps/BasicInfoStep'));
const ToolsStep = lazy(() => import('./steps/ToolsStep'));
const KnowledgeBaseStep = lazy(() => import('./steps/KnowledgeBaseStep'));
const AppearanceStep = lazy(() => import('./steps/AppearanceStep'));
const AdvancedSettingsStep = lazy(() => import('./steps/AdvancedSettingsStep'));
const PromptEngineeringStep = lazy(() => import('./steps/PromptEngineeringStep'));
const LLMParametersStep = lazy(() => import('./steps/LLMParametersStep'));
const MemoryManagementStep = lazy(() => import('./steps/MemoryManagementStep'));
const PoliciesStep = lazy(() => import('./steps/PoliciesStep'));
const OutputFormatStep = lazy(() => import('./steps/OutputFormatStep'));
const ReviewStep = lazy(() => import('./steps/ReviewStep'));

// Loading fallback component
const StepLoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="400px"
  >
    <CircularProgress />
  </Box>
);

// Memoized step wrapper component
const MemoizedStepWrapper = React.memo(({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<StepLoadingFallback />}>
    {children}
  </Suspense>
));

// Type definitions
interface StepRef {
  validateStep?: () => boolean;
  saveData?: () => Record<string, any>;
  handleSubmit?: () => void;
}

interface WizardData {
  basicInfo?: {
    name: string;
    description: string;
    role: string;
    capabilities: string[];
  };
  tools?: {
    selectedTools: string[];
    toolConfigurations: Record<string, any>;
  };
  knowledgeBase?: {
    documents: Array<{
      name: string;
      content: string;
      type: string;
    }>;
    searchSettings: {
      relevanceThreshold: number;
      maxResults: number;
    };
  };
  appearance?: {
    avatarUrl: string;
    themeColor: string;
  };
  advancedSettings?: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  promptEngineering?: {
    systemPrompt: string;
    userPrompt: string;
    examples: Array<{
      input: string;
      output: string;
    }>;
  };
  llmParameters?: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  memoryManagement?: {
    memoryType: string;
    maxTokens: number;
    contextWindow: number;
    retentionPolicy: string;
  };
  policies?: {
    contentFilters: {
      profanity: boolean;
      hate: boolean;
      sexual: boolean;
      violence: boolean;
      selfHarm: boolean;
      illegal: boolean;
    };
    disallowedTopics: string[];
    userGuidance: string;
  };
  outputFormat?: {
    format: string;
    structure: Record<string, any>;
    examples: Array<{
      input: string;
      output: string;
    }>;
  };
}

const AgentWizard: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [wizardData, setWizardData] = useState<WizardData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const stepRefs = useRef<Record<number, StepRef>>({});
  const LOCAL_STORAGE_KEY = 'agent_wizard_data';

  const steps = [
    { label: 'Basic Info', component: BasicInfoStep },
    { label: 'Tools', component: ToolsStep },
    { label: 'Knowledge Base', component: KnowledgeBaseStep },
    { label: 'Appearance', component: AppearanceStep },
    { label: 'Advanced Settings', component: AdvancedSettingsStep },
    { label: 'Prompt Engineering', component: PromptEngineeringStep },
    { label: 'LLM Parameters', component: LLMParametersStep },
    { label: 'Memory Management', component: MemoryManagementStep },
    { label: 'Policies', component: PoliciesStep },
    { label: 'Output Format', component: OutputFormatStep },
    { label: 'Review', component: ReviewStep },
  ];

  // Load saved wizard data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setWizardData(parsedData);
      } catch (error) {
        console.error('Error loading saved wizard data:', error);
      }
    }
  }, []);

  // Debounced save function
  const saveWizardData = React.useMemo(
    () =>
      debounce((data: WizardData) => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }, 500),
    []
  );

  // Save wizard data when it changes
  useEffect(() => {
    saveWizardData(wizardData);
    return () => {
      saveWizardData.cancel();
    };
  }, [wizardData, saveWizardData]);

  const handleNext = async () => {
    const currentStepRef = stepRefs.current[activeStep];
    if (currentStepRef?.validateStep?.()) {
      const stepData = currentStepRef.saveData?.();
      if (stepData) {
        setWizardData((prev) => ({
          ...prev,
          [Object.keys(wizardData)[activeStep]]: stepData,
        }));
      }
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const reviewStepRef = stepRefs.current[steps.length - 1];
      if (!reviewStepRef?.handleSubmit) {
        throw new Error('Review step reference not found');
      }
      
      const formData = reviewStepRef.saveData();
      const response = await apiCall('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      console.log('Agent created successfully:', response);
      // TODO: Replace with proper notification system
      alert('Agent created successfully!');
      navigate('/agents'); // Navigate to agents list after successful creation
    } catch (error) {
      console.error('Failed to create agent:', error);
      // TODO: Replace with proper notification system
      alert('Failed to create agent. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <WizardProvider>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 3, mt: 4, mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Create New Agent
          </Typography>
          
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mb: 4 }}>
            <MemoizedStepWrapper>
              {React.createElement(steps[activeStep].component, {
                ref: (ref: StepRef) => {
                  if (ref) {
                    stepRefs.current[activeStep] = ref;
                  }
                },
              })}
            </MemoizedStepWrapper>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              variant="outlined"
            >
              Back
            </Button>
            <Button
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              variant="contained"
              disabled={isSubmitting}
            >
              {activeStep === steps.length - 1 ? 'Create Agent' : 'Next'}
            </Button>
          </Box>
        </Paper>
      </Container>
    </WizardProvider>
  );
};

export default AgentWizard; 