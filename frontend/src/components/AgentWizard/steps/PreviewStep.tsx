import React, { forwardRef, useImperativeHandle } from 'react';
import { Box, Typography, Paper, Button, Grid } from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';

export interface PreviewStepProps {
  onSubmit: (data: any) => void;
  isActive: boolean;
  wizardData: {
    basicInfo?: {
      role: string;
      successCriteria: string;
    };
    tools?: {
      tools: string[];
    };
  };
  onEditStep: (step: number) => void;
}

export interface PreviewStepRef {
  validateStep: () => boolean;
  saveData: () => any;
  focusFirstInput: () => void;
}

const PreviewStep = forwardRef<PreviewStepRef, PreviewStepProps>(
  ({ onSubmit, isActive, wizardData, onEditStep }, ref) => {
    useImperativeHandle(ref, () => ({
      validateStep: () => true,
      saveData: () => ({}),
      focusFirstInput: () => {}
    }));

    if (!isActive) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Review Your Agent Configuration
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Basic Information
            </Typography>
            <Button
              startIcon={<EditIcon />}
              onClick={() => onEditStep(0)}
              size="small"
            >
              Edit
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Role
              </Typography>
              <Typography variant="body1">
                {wizardData.basicInfo?.role || 'Not set'}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Success Criteria
              </Typography>
              <Typography variant="body1">
                {wizardData.basicInfo?.successCriteria || 'Not set'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              Selected Tools
            </Typography>
            <Button
              startIcon={<EditIcon />}
              onClick={() => onEditStep(1)}
              size="small"
            >
              Edit
            </Button>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Tools
              </Typography>
              <Typography variant="body1">
                {wizardData.tools?.tools.length ? wizardData.tools.tools.join(', ') : 'No tools selected'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onSubmit({})}
          >
            Create Agent
          </Button>
        </Box>
      </Box>
    );
  }
);

PreviewStep.displayName = 'PreviewStep';

export default PreviewStep; 