import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Chat: React.FC = () => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: 'calc(100vh - 200px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Chat
      </Typography>
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">
          Chat functionality coming soon...
        </Typography>
      </Box>
    </Paper>
  );
};

export default Chat; 