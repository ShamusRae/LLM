import React from 'react';
import {
  Box,
  TextField,
  Typography,
  FormControl,
  FormLabel,
  FormHelperText,
  Paper,
  Grid,
} from '@mui/material';
import { StepWrapper } from '../StepWrapper';

const AppearanceStep = () => {
  return (
    <StepWrapper
      title="Agent Appearance"
      description="Customize how your agent looks to create a unique identity."
      stepNumber={4}
      totalSteps={11}
      helpText="Visual identity helps users recognize and connect with your agent. A custom avatar and color scheme can enhance user experience."
    >
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Avatar URL"
              placeholder="Enter avatar URL"
              variant="outlined"
              helperText="Provide a URL to an image for your agent's avatar (optional)"
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <FormLabel>Theme Color</FormLabel>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <input
                  type="color"
                  style={{ width: '60px', height: '40px', padding: '0', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  #2d3c59
                </Typography>
              </Box>
              <FormHelperText>This color will be used for your agent's theme in the UI</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </StepWrapper>
  );
};

export default AppearanceStep; 