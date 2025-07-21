import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Box, AppBar, Toolbar, Typography, Button, Container } from '@mui/material';
import Chat from './components/Chat';
import FlowEditorContainer from './components/FlowEditor/FlowEditorContainer';

function App() {
  return (
    <Router>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              LLM Chat
            </Typography>
            <Button color="inherit" component={Link} to="/">
              Chat
            </Button>
            <Button color="inherit" component={Link} to="/automation">
              Flow Editor
            </Button>
          </Toolbar>
        </AppBar>
        <Container maxWidth="xl" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/automation" element={<FlowEditorContainer />} />
          </Routes>
        </Container>
      </Box>
    </Router>
  );
}

export default App; 