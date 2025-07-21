import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

interface StepWrapperProps {
  title: string;
  description: string;
  stepNumber: number;
  totalSteps: number;
  helpText: string;
  children: React.ReactNode;
}

export const StepWrapper: React.FC<StepWrapperProps> = ({
  title,
  description,
  stepNumber,
  totalSteps,
  helpText,
  children,
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
          Step {stepNumber} of {totalSteps}
        </Typography>
        <Tooltip title={helpText} placement="top">
          <IconButton size="small">
            <HelpOutlineIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>
      {children}
    </Box>
  );
}; 