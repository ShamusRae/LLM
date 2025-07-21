import React, { useState, createContext, useContext, useRef, useImperativeHandle, forwardRef, useEffect } from 'react';
import { 
  Stepper, 
  Step, 
  StepLabel, 
  Button, 
  Typography, 
  TextField, 
  Paper, 
  Box, 
  Container, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Checkbox, 
  FormControlLabel, 
  FormHelperText,
  FormGroup,
  FormLabel,
  RadioGroup,
  Radio,
  Slider,
  Switch,
  List,
  ListItem,
  Chip,
  CircularProgress,
  LinearProgress,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CheckCircle from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';

// Create context to manage wizard state
const WizardContext = createContext();

// Create a reusable StepWrapper component for consistent styling
const StepWrapper = ({ children, title, description, stepNumber, totalSteps, helpText }) => {
  const [showHelp, setShowHelp] = useState(false);
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" color="primary" sx={{ fontWeight: 500 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Step {stepNumber} of {totalSteps}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {description}
          </Typography>
          {helpText && (
            <IconButton
              size="small"
              color="primary"
              onClick={() => setShowHelp(!showHelp)}
              sx={{ ml: 1 }}
            >
              <InfoIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
        
        {showHelp && helpText && (
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            {helpText}
          </Alert>
        )}
      </Box>
      
      <Box sx={{ mb: 2 }}>
        {children}
      </Box>
    </Box>
  );
};

// WizardProvider to manage global state for the wizard
export const WizardProvider = ({ children }) => {
  const [formData, setFormData] = useState({
    agentName: '',
    agentType: '',
    rolePurpose: '',
    successCriteria: '',
    capabilities: [],
    description: '',
    integrations: [],
    tools: {
      quickbooks: { selected: false, permissions: 'read' },
      xero: { selected: false, permissions: 'read' },
      secEdgar: { selected: false, permissions: 'read' },
      yahooFinance: { selected: false, permissions: 'read' },
      pfx: { selected: false, permissions: 'read' },
      ais: { selected: false, permissions: 'read' },
      businessExchange: { selected: false, permissions: 'read' },
      udl: { selected: false, permissions: 'read' },
      userFiles: { selected: false, permissions: 'read' },
      mcpServers: { selected: false, permissions: 'read' },
    },
    appearance: {
      avatar: '',
      color: '#2d3c59',
    },
    advanced: {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2048
    },
    // Knowledge Base fields
    knowledgeBase: {
      referenceDocs: [],
      vectorStore: '',
      retrievalSystem: '',
      version: '',
    },
    // Prompt Engineering fields
    prompts: {
      systemPrompt: '',
      developerPrompt: '',
      userPrompt: '',
    },
    // LLM Parameters
    llmParameters: {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
      frequencyPenalty: 0.0,
      modelType: 'default'
    },
    // Memory Management
    memoryManagement: {
      shortTermMemory: 'last-10',
      enableLongTermMemory: false,
      longTermMemoryType: 'vectordb',
      sharedMemory: false,
      sharedMemoryGroups: []
    },
    // Policies & Guardrails
    policies: {
      contentFilters: {
        profanity: true,
        hate: true,
        sexualContent: true,
        violence: true,
        selfHarm: true,
        illegalActivity: true
      },
      disallowedTopics: [],
      userGuidance: ''
    },
    // Output Format
    outputFormat: {
      format: 'text', // text, json, csv, pdf, etc.
      schema: {
        jsonKeys: [],
        csvColumns: []
      },
      additionalFormatting: ''
    }
  });

  const updateFormData = (stepData, step) => {
    setFormData(prev => ({
      ...prev,
      ...stepData
    }));
  };

  return (
    <WizardContext.Provider value={{ formData, updateFormData }}>
      {children}
    </WizardContext.Provider>
  );
};

// Hook to use wizard context
export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
};

// Step 1: Basic Information
const BasicInfoStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    agentName: formData.agentName,
    agentType: formData.agentType,
    rolePurpose: formData.rolePurpose,
    successCriteria: formData.successCriteria,
    description: formData.description
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      const newErrors = {};
      
      if (!stepData.agentName?.trim()) {
        newErrors.agentName = 'Agent name is required';
      }
      
      if (!stepData.rolePurpose?.trim()) {
        newErrors.rolePurpose = 'Role or Purpose is required';
      }

      if (!stepData.agentType) {
        newErrors.agentType = 'Please select an agent type';
      }
  
      setErrors(newErrors);
      // Mark all fields as touched during validation
      setTouched({
        agentName: true,
        agentType: true,
        rolePurpose: true,
        successCriteria: true,
        description: true
      });
      
      return Object.keys(newErrors).length === 0;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStepData(prev => ({
      ...prev,
      [name]: value
    }));

    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));

    // Clear error for this field if it exists
    if (errors[name]) {
      validate(name, value);
    }
  };

  const validate = (field, value) => {
    let newErrors = { ...errors };
    
    switch (field) {
      case 'agentName':
        if (!value?.trim()) {
          newErrors.agentName = 'Agent name is required';
        } else {
          delete newErrors.agentName;
        }
        break;
      case 'agentType':
        if (!value) {
          newErrors.agentType = 'Please select an agent type';
        } else {
          delete newErrors.agentType;
        }
        break;
      case 'rolePurpose':
        if (!value?.trim()) {
          newErrors.rolePurpose = 'Role or Purpose is required';
        } else {
          delete newErrors.rolePurpose;
        }
        break;
      default:
        break;
    }
    
    setErrors(newErrors);
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    validate(name, value);
  };

  return (
    <StepWrapper 
      title="Basic Information"
      description="Configure the basic details for your agent. Fields marked with * are required."
      stepNumber={1}
      totalSteps={11}
      helpText="Define who your agent is and what it's designed to do. A clear purpose helps create a more effective agent."
    >
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Agent Name *"
              name="agentName"
              value={stepData.agentName || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.agentName && !!errors.agentName}
              helperText={touched.agentName && errors.agentName}
              required
              placeholder="Enter agent name"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <FormControl 
              fullWidth 
              error={touched.agentType && !!errors.agentType}
            >
              <InputLabel id="agent-type-label" required>Agent Type</InputLabel>
              <Select
                labelId="agent-type-label"
                name="agentType"
                value={stepData.agentType || ''}
                onChange={handleChange}
                onBlur={handleBlur}
                label="Agent Type *"
                displayEmpty
              >
                <MenuItem value="" disabled>Select agent type</MenuItem>
                <MenuItem value="assistant">Assistant</MenuItem>
                <MenuItem value="researcher">Researcher</MenuItem>
                <MenuItem value="analyst">Analyst</MenuItem>
                <MenuItem value="customer_support">Customer Support</MenuItem>
                <MenuItem value="creative">Creative</MenuItem>
              </Select>
              {touched.agentType && errors.agentType && (
                <FormHelperText>{errors.agentType}</FormHelperText>
              )}
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Role or Purpose *"
              name="rolePurpose"
              value={stepData.rolePurpose || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              error={touched.rolePurpose && !!errors.rolePurpose}
              helperText={touched.rolePurpose && errors.rolePurpose}
              required
              placeholder="Specify the main role or purpose of this agent"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Success Criteria / Goals"
              name="successCriteria"
              value={stepData.successCriteria || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              multiline
              rows={3}
              placeholder="Define what success looks like for this agent"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Additional Description"
              name="description"
              value={stepData.description || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              multiline
              rows={3}
              placeholder="Describe what this agent does in more detail"
              variant="outlined"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>
      
      {Object.keys(errors).length > 0 && Object.keys(touched).some(key => touched[key]) && (
        <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
          Please fix the errors above before proceeding.
        </Alert>
      )}
    </StepWrapper>
  );
});

// Step 2: Tools & Capabilities
const CapabilitiesStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    capabilities: formData.capabilities || [],
    tools: formData.tools || {}
  });

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No validation required for this step, always return true
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const defaultCapabilities = [
    { id: 'web_search', name: 'Web Search' },
    { id: 'file_access', name: 'File Access' },
    { id: 'code_generation', name: 'Code Generation' },
    { id: 'data_analysis', name: 'Data Analysis' },
    { id: 'chat', name: 'Chat Interaction' }
  ];

  const tools = [
    { id: 'mcpServers', name: 'MCP Server List', description: 'Access to available MCP data feeds' },
    { id: 'quickbooks', name: 'QuickBooks', description: 'Financial and accounting data' },
    { id: 'xero', name: 'Xero', description: 'Cloud-based accounting software' },
    { id: 'secEdgar', name: 'SEC Edgar', description: 'SEC filings and regulatory documents' },
    { id: 'yahooFinance', name: 'Yahoo Finance', description: 'Market data and financial news' },
    { id: 'pfx', name: 'PFX', description: 'PFX financial data services' },
    { id: 'ais', name: 'AIS', description: 'Advanced Information Services' },
    { id: 'businessExchange', name: 'Business Exchange', description: 'Business intelligence platform' },
    { id: 'udl', name: 'UDL', description: 'Unified Data Layer' },
    { id: 'userFiles', name: 'User-uploaded Files', description: 'Access to user documents and files' }
  ];

  const permissionOptions = [
    { value: 'read', label: 'Read Only' },
    { value: 'write', label: 'Read & Write' },
    { value: 'full', label: 'Full Access' }
  ];

  const toggleCapability = (capabilityId) => {
    setStepData(prev => {
      const newCapabilities = prev.capabilities.includes(capabilityId)
        ? prev.capabilities.filter(id => id !== capabilityId)
        : [...prev.capabilities, capabilityId];
      
      return { ...prev, capabilities: newCapabilities };
    });
  };

  const toggleTool = (toolId) => {
    setStepData(prev => {
      const updatedTools = {
        ...prev.tools,
        [toolId]: {
          ...prev.tools[toolId],
          selected: !prev.tools[toolId]?.selected
        }
      };
      
      return { ...prev, tools: updatedTools };
    });
  };

  const handlePermissionChange = (toolId, permission) => {
    setStepData(prev => {
      const updatedTools = {
        ...prev.tools,
        [toolId]: {
          ...prev.tools[toolId],
          permissions: permission
        }
      };
      
      return { ...prev, tools: updatedTools };
    });
  };

  return (
    <StepWrapper
      title="Tools & Capabilities"
      description="Select the capabilities and data sources your agent will have access to."
      stepNumber={2}
      totalSteps={11}
      helpText="The capabilities and tools you select will determine what your agent can do and what data it can access."
    >
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          General Capabilities
        </Typography>
        <Grid container spacing={2}>
          {defaultCapabilities.map(capability => (
            <Grid item xs={12} sm={6} key={capability.id}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={stepData.capabilities.includes(capability.id)}
                      onChange={() => toggleCapability(capability.id)}
                    />
                  }
                  label={capability.name}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
      
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1, mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom fontWeight="medium">
          Data Sources & Tools
        </Typography>
        <Typography variant="body2" gutterBottom color="text.secondary">
          Select tools and specify access permissions for each.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          {tools.map(tool => (
            <Paper 
              key={tool.id} 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 2, 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                backgroundColor: stepData.tools[tool.id]?.selected ? 'rgba(45, 60, 89, 0.05)' : 'transparent'
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={stepData.tools[tool.id]?.selected || false}
                        onChange={() => toggleTool(tool.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">{tool.name}</Typography>
                        {tool.description && (
                          <Typography variant="caption" color="text.secondary">
                            {tool.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl 
                    fullWidth
                    disabled={!stepData.tools[tool.id]?.selected}
                  >
                    <InputLabel id={`permission-label-${tool.id}`}>Access Permission</InputLabel>
                    <Select
                      labelId={`permission-label-${tool.id}`}
                      value={stepData.tools[tool.id]?.permissions || 'read'}
                      onChange={(e) => handlePermissionChange(tool.id, e.target.value)}
                      label="Access Permission"
                      size="small"
                    >
                      {permissionOptions.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>
          ))}
        </Box>
      </Paper>
    </StepWrapper>
  );
});

// Step 3: Knowledge Base or Context
const KnowledgeBaseStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    knowledgeBase: formData.knowledgeBase || {
      referenceDocs: [],
      vectorStore: '',
      retrievalSystem: '',
      version: '',
    }
  });
  const fileInputRef = useRef(null);

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No required validation for this step
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      knowledgeBase: {
        ...prev.knowledgeBase,
        [field]: value
      }
    }));
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    
    // Create new reference docs array with file information
    const newDocs = files.map(file => ({
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      // In a real app, you would upload files to server and store URLs
      // For this demo, we'll just store the file metadata
      uploadedAt: new Date().toISOString()
    }));

    // Update step data with new docs
    setStepData(prev => ({
      ...prev,
      knowledgeBase: {
        ...prev.knowledgeBase,
        referenceDocs: [...prev.knowledgeBase.referenceDocs, ...newDocs]
      }
    }));

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeDocument = (docId) => {
    setStepData(prev => ({
      ...prev,
      knowledgeBase: {
        ...prev.knowledgeBase,
        referenceDocs: prev.knowledgeBase.referenceDocs.filter(doc => doc.id !== docId)
      }
    }));
  };

  const vectorStoreOptions = [
    { value: 'pinecone', label: 'Pinecone' },
    { value: 'faiss', label: 'FAISS' },
    { value: 'elasticsearch', label: 'Elasticsearch' },
    { value: 'qdrant', label: 'Qdrant' },
    { value: 'chroma', label: 'ChromaDB' },
  ];

  const retrievalSystemOptions = [
    { value: 'bm25', label: 'BM25' },
    { value: 'knn', label: 'K-Nearest Neighbors' },
    { value: 'hybrid', label: 'Hybrid Search' },
    { value: 'semantic', label: 'Semantic Search' },
  ];

  return (
    <StepWrapper
      title="Knowledge Base & Context"
      description="Define the documents and retrieval systems your agent can access."
      stepNumber={3}
      totalSteps={11}
      helpText="Adding documents and configuring retrieval systems helps your agent access and use information effectively."
    >
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Reference Documents
              </Typography>
              <Box sx={{ mb: 2 }}>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  ref={fileInputRef}
                  accept=".pdf,.docx,.txt,.md"
                />
                <Button 
                  variant="outlined" 
                  onClick={() => fileInputRef.current.click()}
                  startIcon={<span role="img" aria-label="upload">📎</span>}
                >
                  Upload Documents
                </Button>
              </Box>

              {stepData.knowledgeBase.referenceDocs.length > 0 ? (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    {stepData.knowledgeBase.referenceDocs.length} document(s) selected
                  </Typography>
                  <Box sx={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', p: 1 }}>
                    {stepData.knowledgeBase.referenceDocs.map(doc => (
                      <Box 
                        key={doc.id} 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          p: 1,
                          borderBottom: '1px solid #f0f0f0'
                        }}
                      >
                        <Box>
                          <Typography variant="body2">{doc.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(doc.size / 1024)} KB
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={() => removeDocument(doc.id)}
                          aria-label="remove document"
                        >
                          <span role="img" aria-label="delete">❌</span>
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No documents uploaded yet
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="vector-store-label">Vector Store</InputLabel>
              <Select
                labelId="vector-store-label"
                value={stepData.knowledgeBase.vectorStore}
                onChange={(e) => handleChange('vectorStore', e.target.value)}
                label="Vector Store"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {vectorStoreOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select the vector database for document embeddings</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel id="retrieval-system-label">Retrieval System</InputLabel>
              <Select
                labelId="retrieval-system-label"
                value={stepData.knowledgeBase.retrievalSystem}
                onChange={(e) => handleChange('retrievalSystem', e.target.value)}
                label="Retrieval System"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {retrievalSystemOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Choose how documents should be retrieved</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Version"
              value={stepData.knowledgeBase.version}
              onChange={(e) => handleChange('version', e.target.value)}
              placeholder="e.g., v1.0, 2023Q2, etc."
              variant="outlined"
              helperText="Specify version if multiple document versions exist"
            />
          </Grid>
        </Grid>
      </Paper>
    </StepWrapper>
  );
});

// Step 4: Appearance
const AppearanceStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    appearance: formData.appearance || { avatar: '', color: '#2d3c59' }
  });

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No validation required for this step
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        [field]: value
      }
    }));
  };

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
              value={stepData.appearance.avatar}
              onChange={(e) => handleChange('avatar', e.target.value)}
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
                  value={stepData.appearance.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  style={{ width: '60px', height: '40px', padding: '0', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <Typography variant="body2" sx={{ ml: 2 }}>
                  {stepData.appearance.color}
                </Typography>
              </Box>
              <FormHelperText>This color will be used for your agent's theme in the UI</FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
    </StepWrapper>
  );
});

// Step 5: Advanced Settings
const AdvancedSettingsStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    advanced: formData.advanced || { model: 'gpt-4', temperature: 0.7, maxTokens: 2048 }
  });

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No validation required for this step
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      advanced: {
        ...prev.advanced,
        [field]: value
      }
    }));
  };

  return (
    <StepWrapper
      title="Advanced Settings"
      description="Configure advanced settings to fine-tune your agent's behavior."
      stepNumber={5}
      totalSteps={11}
      helpText="These technical settings control how your agent generates responses and processes information."
    >
      <Paper elevation={0} sx={{ p: 3, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="model-label">Model</InputLabel>
              <Select
                labelId="model-label"
                value={stepData.advanced.model}
                onChange={(e) => handleChange('model', e.target.value)}
                label="Model"
              >
                <MenuItem value="gpt-4">GPT-4</MenuItem>
                <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                <MenuItem value="claude-3-opus">Claude 3 Opus</MenuItem>
                <MenuItem value="claude-3-sonnet">Claude 3 Sonnet</MenuItem>
              </Select>
              <FormHelperText>Select the base language model for your agent</FormHelperText>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Typography variant="body2" gutterBottom>
              Temperature: {stepData.advanced.temperature}
            </Typography>
            <Slider
              value={stepData.advanced.temperature}
              onChange={(e, newValue) => handleChange('temperature', newValue)}
              min={0}
              max={1}
              step={0.1}
              valueLabelDisplay="auto"
              sx={{ color: '#2d3c59' }}
            />
            <FormHelperText>
              Lower values (0.1-0.4) produce more deterministic responses, while higher values (0.7-1.0) increase creativity and variability
            </FormHelperText>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Max Tokens"
              type="number"
              value={stepData.advanced.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
              variant="outlined"
              InputProps={{ inputProps: { min: 100, max: 8000 } }}
              helperText="Maximum number of tokens (words/characters) the agent can generate in a single response"
            />
          </Grid>
        </Grid>
      </Paper>
    </StepWrapper>
  );
});

// Step 6: Prompt Engineering Controls
const PromptEngineeringStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    prompts: formData.prompts || {
      systemPrompt: '',
      developerPrompt: '',
      userPrompt: '',
    }
  });
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [showDeveloperPrompt, setShowDeveloperPrompt] = useState(false);

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No strict validation for this step
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handlePromptChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [field]: value
      }
    }));
  };

  // Sample system prompt template for developer reference
  const systemPromptTemplate = `You are an AI assistant designed to help with [specific task].
Your purpose is to [main objective].
- Always respond in a [professional/friendly/technical] tone
- Prioritize [accuracy/helpfulness/brevity] in your responses
- When uncertain, [ask for clarification/state your confidence level]`;

  // Sample developer prompt template
  const developerPromptTemplate = `IMPORTANT GUIDELINES FOR DEVELOPERS:
1. This agent is designed to handle [specific domain] queries
2. API access limitations: [list any restrictions]
3. Default response format: [JSON/text/markdown]
4. Rate limits: [details about usage limits]
5. Do not [list prohibited actions]`;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Prompt Engineering Controls
      </Typography>
      <Typography variant="body1" gutterBottom>
        Configure how the agent should handle prompts and responses.
      </Typography>
      
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">System Prompt</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={showSystemPrompt}
                        onChange={(e) => setShowSystemPrompt(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show System Prompt"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  The system prompt defines base behavior and capabilities of the agent.
                </Typography>
                
                {showSystemPrompt ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={stepData.prompts.systemPrompt}
                    onChange={(e) => handlePromptChange('systemPrompt', e.target.value)}
                    placeholder={systemPromptTemplate}
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    System prompt is hidden. Check the box above to view and edit.
                  </Alert>
                )}
              </Paper>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mb: 2 }}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="subtitle1">Developer Prompt</Typography>
                  <FormControlLabel
                    control={
                      <Checkbox 
                        checked={showDeveloperPrompt}
                        onChange={(e) => setShowDeveloperPrompt(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show Developer Prompt"
                  />
                </Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Technical instructions and constraints for developers.
                </Typography>
                
                {showDeveloperPrompt ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={6}
                    value={stepData.prompts.developerPrompt}
                    onChange={(e) => handlePromptChange('developerPrompt', e.target.value)}
                    placeholder={developerPromptTemplate}
                    variant="outlined"
                    sx={{ mt: 2 }}
                  />
                ) : (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    Developer prompt is hidden. Check the box above to view and edit.
                  </Alert>
                )}
              </Paper>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  User Prompt
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Initial prompt that users will see.
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={stepData.prompts.userPrompt}
                  onChange={(e) => handlePromptChange('userPrompt', e.target.value)}
                  placeholder="Enter a prompt that will start the conversation with users..."
                  variant="outlined"
                  sx={{ mt: 2 }}
                />
              </Paper>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Step 7: LLM Parameters
const LLMParametersStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    llmParameters: formData.llmParameters || {
      temperature: 0.7,
      maxTokens: 2048,
      topP: 1.0,
      frequencyPenalty: 0.0,
      modelType: 'default'
    }
  });

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // Basic validation
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      llmParameters: {
        ...prev.llmParameters,
        [field]: value
      }
    }));
  };

  const modelTypes = [
    { value: 'fast', label: 'Fast (Optimized for speed)' },
    { value: 'default', label: 'Default (Balanced performance)' },
    { value: 'instruct', label: 'Instruct (Better at following instructions)' },
    { value: 'multimodal', label: 'Multimodal (Handles text and images)' },
    { value: 'image', label: 'Image (Specialized for image generation)' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        LLM Parameters
      </Typography>
      <Typography variant="body1" gutterBottom>
        Configure the language model parameters for this agent.
      </Typography>
      
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel id="model-type-label">Model Type</InputLabel>
              <Select
                labelId="model-type-label"
                value={stepData.llmParameters.modelType}
                onChange={(e) => handleChange('modelType', e.target.value)}
                label="Model Type"
              >
                {modelTypes.map(model => (
                  <MenuItem key={model.value} value={model.value}>
                    {model.label}
                  </MenuItem>
                ))}
              </Select>
              <FormHelperText>Select the model type that best suits your needs</FormHelperText>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Temperature: {stepData.llmParameters.temperature}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Controls randomness: Lower values are more deterministic, higher values are more creative.
              </Typography>
              <Slider
                value={stepData.llmParameters.temperature}
                onChange={(e, newValue) => handleChange('temperature', newValue)}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                sx={{ color: '#2d3c59', mt: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">Deterministic</Typography>
                <Typography variant="caption">Creative</Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Max Tokens"
              type="number"
              value={stepData.llmParameters.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value, 10))}
              variant="outlined"
              helperText="Maximum number of tokens to generate"
              InputProps={{ inputProps: { min: 100, max: 32000 } }}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Top-p: {stepData.llmParameters.topP}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Nucleus sampling: Controls diversity of output.
              </Typography>
              <Slider
                value={stepData.llmParameters.topP}
                onChange={(e, newValue) => handleChange('topP', newValue)}
                min={0}
                max={1}
                step={0.05}
                valueLabelDisplay="auto"
                sx={{ color: '#2d3c59', mt: 2 }}
              />
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Frequency Penalty: {stepData.llmParameters.frequencyPenalty}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Reduces repetition by penalizing previously used tokens.
              </Typography>
              <Slider
                value={stepData.llmParameters.frequencyPenalty}
                onChange={(e, newValue) => handleChange('frequencyPenalty', newValue)}
                min={0}
                max={2}
                step={0.1}
                valueLabelDisplay="auto"
                sx={{ color: '#2d3c59', mt: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="caption">No penalty</Typography>
                <Typography variant="caption">High penalty</Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Step 8: Memory Management
const MemoryManagementStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    memoryManagement: formData.memoryManagement || {
      shortTermMemory: 'last-10',
      enableLongTermMemory: false,
      longTermMemoryType: 'vectordb',
      sharedMemory: false,
      sharedMemoryGroups: []
    }
  });

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No specific validation required
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleChange = (field, value) => {
    setStepData(prev => ({
      ...prev,
      memoryManagement: {
        ...prev.memoryManagement,
        [field]: value
      }
    }));
  };

  const shortTermOptions = [
    { value: 'last-5', label: 'Last 5 interactions' },
    { value: 'last-10', label: 'Last 10 interactions' },
    { value: 'last-20', label: 'Last 20 interactions' },
    { value: 'sliding-window', label: 'Sliding window (dynamic)' },
    { value: 'token-based', label: 'Token-based (optimize for context length)' }
  ];

  const longTermOptions = [
    { value: 'vectordb', label: 'Vector Database' },
    { value: 'episodic', label: 'Episodic Memory' },
    { value: 'hierarchical', label: 'Hierarchical Memory' },
    { value: 'summarization', label: 'Summarization-based' }
  ];

  // Placeholder for agent groups (in a real app, these would be fetched from an API)
  const agentGroups = [
    { id: 'group-1', name: 'Finance Team' },
    { id: 'group-2', name: 'Research Agents' },
    { id: 'group-3', name: 'Customer Support' },
    { id: 'group-4', name: 'Data Analysis' }
  ];

  const toggleSharedMemoryGroup = (groupId) => {
    setStepData(prev => {
      const currentGroups = prev.memoryManagement.sharedMemoryGroups || [];
      const updatedGroups = currentGroups.includes(groupId)
        ? currentGroups.filter(id => id !== groupId)
        : [...currentGroups, groupId];
      
      return {
        ...prev,
        memoryManagement: {
          ...prev.memoryManagement,
          sharedMemoryGroups: updatedGroups
        }
      };
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Memory Management
      </Typography>
      <Typography variant="body1" gutterBottom>
        Configure how your agent manages and retains information.
      </Typography>
      
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Short-Term Memory
              </Typography>
              <FormControl fullWidth>
                <InputLabel id="short-term-memory-label">Strategy</InputLabel>
                <Select
                  labelId="short-term-memory-label"
                  value={stepData.memoryManagement.shortTermMemory}
                  onChange={(e) => handleChange('shortTermMemory', e.target.value)}
                  label="Strategy"
                >
                  {shortTermOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Determines how many recent interactions are kept in active memory
                </FormHelperText>
              </FormControl>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Long-Term Memory</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={stepData.memoryManagement.enableLongTermMemory}
                      onChange={(e) => handleChange('enableLongTermMemory', e.target.checked)}
                    />
                  }
                  label="Enable Long-Term Memory"
                />
              </Box>
              
              {stepData.memoryManagement.enableLongTermMemory && (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="long-term-memory-label">Approach</InputLabel>
                  <Select
                    labelId="long-term-memory-label"
                    value={stepData.memoryManagement.longTermMemoryType}
                    onChange={(e) => handleChange('longTermMemoryType', e.target.value)}
                    label="Approach"
                  >
                    {longTermOptions.map(option => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <FormHelperText>
                    Method for storing and retrieving information over longer periods
                  </FormHelperText>
                </FormControl>
              )}
              
              {!stepData.memoryManagement.enableLongTermMemory && (
                <Typography variant="body2" color="text.secondary">
                  Long-term memory is disabled. Your agent will only remember recent interactions.
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Shared Memory</Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={stepData.memoryManagement.sharedMemory}
                      onChange={(e) => handleChange('sharedMemory', e.target.checked)}
                    />
                  }
                  label="Enable Shared Memory"
                />
              </Box>
              
              {stepData.memoryManagement.sharedMemory && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Select agent groups to share memory with:
                  </Typography>
                  <FormGroup>
                    {agentGroups.map(group => (
                      <FormControlLabel
                        key={group.id}
                        control={
                          <Checkbox
                            checked={(stepData.memoryManagement.sharedMemoryGroups || []).includes(group.id)}
                            onChange={() => toggleSharedMemoryGroup(group.id)}
                            size="small"
                          />
                        }
                        label={group.name}
                      />
                    ))}
                  </FormGroup>
                </Box>
              )}
              
              {!stepData.memoryManagement.sharedMemory && (
                <Typography variant="body2" color="text.secondary">
                  Shared memory is disabled. This agent will maintain its own isolated memory.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Step 9: Policies & Guardrails
const PoliciesStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    policies: formData.policies || {
      contentFilters: {
        profanity: true,
        hate: true,
        sexualContent: true,
        violence: true,
        selfHarm: true,
        illegalActivity: true
      },
      disallowedTopics: [],
      userGuidance: ''
    }
  });
  const [newTopic, setNewTopic] = useState('');

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No specific validation required
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleContentFilterChange = (filterName, checked) => {
    setStepData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        contentFilters: {
          ...prev.policies.contentFilters,
          [filterName]: checked
        }
      }
    }));
  };

  const handleAddDisallowedTopic = () => {
    if (newTopic.trim() === '') return;
    
    setStepData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        disallowedTopics: [...(prev.policies.disallowedTopics || []), newTopic.trim()]
      }
    }));
    setNewTopic('');
  };

  const handleRemoveDisallowedTopic = (index) => {
    setStepData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        disallowedTopics: prev.policies.disallowedTopics.filter((_, i) => i !== index)
      }
    }));
  };

  const handleUserGuidanceChange = (e) => {
    setStepData(prev => ({
      ...prev,
      policies: {
        ...prev.policies,
        userGuidance: e.target.value
      }
    }));
  };

  const contentFilterOptions = [
    { id: 'profanity', label: 'Filter Profanity' },
    { id: 'hate', label: 'Filter Hate Speech' },
    { id: 'sexualContent', label: 'Filter Sexual Content' },
    { id: 'violence', label: 'Filter Violence' },
    { id: 'selfHarm', label: 'Filter Self-Harm Content' },
    { id: 'illegalActivity', label: 'Filter Illegal Activities' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Policies & Guardrails
      </Typography>
      <Typography variant="body1" gutterBottom>
        Configure content filters and usage guidelines for your agent.
      </Typography>
      
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Content & Compliance Filters
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select which content types should be filtered from the agent's outputs.
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {contentFilterOptions.map(filter => (
                  <Grid item xs={12} sm={6} key={filter.id}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={stepData.policies.contentFilters[filter.id]}
                          onChange={(e) => handleContentFilterChange(filter.id, e.target.checked)}
                        />
                      }
                      label={filter.label}
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Disallowed Topics & Tasks
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Specify topics or tasks the agent should not engage with.
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2 }}>
                <TextField
                  fullWidth
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Enter a topic or task to disallow"
                  variant="outlined"
                  size="small"
                  sx={{ mr: 1 }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleAddDisallowedTopic}
                  disabled={!newTopic.trim()}
                >
                  Add
                </Button>
              </Box>
              
              {(stepData.policies.disallowedTopics || []).length > 0 ? (
                <Box sx={{ mt: 2, maxHeight: '200px', overflowY: 'auto' }}>
                  <List dense>
                    {stepData.policies.disallowedTopics.map((topic, index) => (
                      <ListItem 
                        key={index}
                        secondaryAction={
                          <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveDisallowedTopic(index)}>
                            <span role="img" aria-label="delete">❌</span>
                          </IconButton>
                        }
                      >
                        <ListItemText primary={topic} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  No disallowed topics added yet.
                </Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                User Guidance & Disclaimers
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Provide guidance or disclaimers that will be shown to users.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                value={stepData.policies.userGuidance}
                onChange={handleUserGuidanceChange}
                placeholder="Enter guidance or disclaimers for users (e.g., 'This agent is for informational purposes only and should not be used for financial advice.')"
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Step 10: Output Format
const OutputFormatStep = React.forwardRef((props, ref) => {
  const { formData, updateFormData } = useWizard();
  const [stepData, setStepData] = useState({
    outputFormat: formData.outputFormat || {
      format: 'text',
      schema: {
        jsonKeys: [],
        csvColumns: []
      },
      additionalFormatting: ''
    }
  });
  const [newKey, setNewKey] = useState('');
  const [newColumn, setNewColumn] = useState('');

  // Expose methods to parent component via ref
  React.useImperativeHandle(ref, () => ({
    validateStep: () => {
      // No specific validation required
      return true;
    },
    saveData: () => {
      updateFormData(stepData);
    }
  }));

  const handleFormatChange = (format) => {
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        format
      }
    }));
  };

  const handleAddJsonKey = () => {
    if (newKey.trim() === '') return;
    
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        schema: {
          ...prev.outputFormat.schema,
          jsonKeys: [...prev.outputFormat.schema.jsonKeys, newKey.trim()]
        }
      }
    }));
    setNewKey('');
  };

  const handleRemoveJsonKey = (index) => {
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        schema: {
          ...prev.outputFormat.schema,
          jsonKeys: prev.outputFormat.schema.jsonKeys.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const handleAddCsvColumn = () => {
    if (newColumn.trim() === '') return;
    
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        schema: {
          ...prev.outputFormat.schema,
          csvColumns: [...prev.outputFormat.schema.csvColumns, newColumn.trim()]
        }
      }
    }));
    setNewColumn('');
  };

  const handleRemoveCsvColumn = (index) => {
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        schema: {
          ...prev.outputFormat.schema,
          csvColumns: prev.outputFormat.schema.csvColumns.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const handleAdditionalFormattingChange = (e) => {
    setStepData(prev => ({
      ...prev,
      outputFormat: {
        ...prev.outputFormat,
        additionalFormatting: e.target.value
      }
    }));
  };

  const formatOptions = [
    { value: 'text', label: 'Text (Plain text formatting)' },
    { value: 'json', label: 'JSON (Structured data in JSON format)' },
    { value: 'csv', label: 'CSV (Comma-separated values)' },
    { value: 'pdf', label: 'PDF (Document for download)' },
    { value: 'html', label: 'HTML (Web rendering)' },
    { value: 'markdown', label: 'Markdown (Formatted text)' }
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Output Format
      </Typography>
      <Typography variant="body1" gutterBottom>
        Configure how your agent will structure and format its responses.
      </Typography>
      
      <Box sx={{ mt: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Response Format
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Select the format for agent responses.
              </Typography>
              
              <FormControl component="fieldset" sx={{ mt: 2 }}>
                <RadioGroup 
                  value={stepData.outputFormat.format} 
                  onChange={(e) => handleFormatChange(e.target.value)}
                >
                  {formatOptions.map(option => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={option.label}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            </Paper>
          </Grid>

          {stepData.outputFormat.format === 'json' && (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  JSON Schema
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Specify required keys for JSON responses.
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2 }}>
                  <TextField
                    fullWidth
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="Enter a key name (e.g., 'result', 'data', 'status')"
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    variant="outlined" 
                    onClick={handleAddJsonKey}
                    disabled={!newKey.trim()}
                  >
                    Add
                  </Button>
                </Box>
                
                {stepData.outputFormat.schema.jsonKeys.length > 0 ? (
                  <Box sx={{ mt: 2, maxHeight: '200px', overflowY: 'auto' }}>
                    <List dense>
                      {stepData.outputFormat.schema.jsonKeys.map((key, index) => (
                        <ListItem 
                          key={index}
                          secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveJsonKey(index)}>
                              <span role="img" aria-label="delete">❌</span>
                            </IconButton>
                          }
                        >
                          <ListItemText primary={key} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No JSON keys added yet.
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}

          {stepData.outputFormat.format === 'csv' && (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  CSV Columns
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Specify columns for CSV responses.
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: 2 }}>
                  <TextField
                    fullWidth
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    placeholder="Enter a column name"
                    variant="outlined"
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Button 
                    variant="outlined" 
                    onClick={handleAddCsvColumn}
                    disabled={!newColumn.trim()}
                  >
                    Add
                  </Button>
                </Box>
                
                {stepData.outputFormat.schema.csvColumns.length > 0 ? (
                  <Box sx={{ mt: 2, maxHeight: '200px', overflowY: 'auto' }}>
                    <List dense>
                      {stepData.outputFormat.schema.csvColumns.map((column, index) => (
                        <ListItem 
                          key={index}
                          secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveCsvColumn(index)}>
                              <span role="img" aria-label="delete">❌</span>
                            </IconButton>
                          }
                        >
                          <ListItemText primary={column} />
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    No CSV columns added yet.
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}

          <Grid item xs={12}>
            <Paper elevation={0} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle1" gutterBottom>
                Additional Formatting Instructions
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Provide any additional formatting instructions for the agent's responses.
              </Typography>
              
              <TextField
                fullWidth
                multiline
                rows={4}
                value={stepData.outputFormat.additionalFormatting}
                onChange={handleAdditionalFormattingChange}
                placeholder="Enter any additional formatting instructions (e.g., 'Use bullet points for lists', 'Include headers in tables')"
                variant="outlined"
                sx={{ mt: 2 }}
              />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
});

// Step 11: Review & Submit
const ReviewStep = React.forwardRef((props, ref) => {
  const { formData } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  
  useImperativeHandle(ref, () => ({
    validateStep: () => {
      return true; // No validation needed for review step
    },
    saveData: () => {
      // Nothing to save in the review step
    },
    handleSubmit: () => {
      handleSubmit();
    }
  }));
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // API call simulation
      // In a real application, replace with actual API call:
      // const response = await axios.post('/api/agents', formData);
      
      console.log('Submitting agent data:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful response
      setSubmitSuccess(true);
      
    } catch (error) {
      console.error('Error submitting agent data:', error);
      setSubmitError(error.message || 'Failed to create agent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Format section for display
  const renderSection = (title, data, keysToShow = null) => {
    if (!data) return null;
    
    const keys = keysToShow || Object.keys(data);
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1, color: '#2d3c59', fontWeight: 600 }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={2}>
          {keys.map(key => {
            let value = data[key];
            
            // Handle array values
            if (Array.isArray(value)) {
              value = value.join(', ');
            }
            
            // Handle boolean values
            if (typeof value === 'boolean') {
              value = value ? 'Yes' : 'No';
            }
            
            // Handle object values
            if (value !== null && typeof value === 'object') {
              return null; // Skip objects, they should be handled in their own sections
            }
            
            // Skip empty values
            if (value === '' || value === undefined || value === null) {
              return null;
            }
            
            return (
              <Grid item xs={12} sm={6} key={key}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555' }}>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}:
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  {value}
                </Typography>
              </Grid>
            );
          })}
        </Grid>
      </Box>
    );
  };
  
  // Render lists of items
  const renderList = (title, items) => {
    if (!items || items.length === 0) return null;
    
    return (
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#555' }}>
          {title}:
        </Typography>
        <List dense>
          {items.map((item, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 30 }}>
                <CheckCircle fontSize="small" color="success" />
              </ListItemIcon>
              <ListItemText primary={item} />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };
  
  // If submission was successful, show success message
  if (submitSuccess) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CheckCircle sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Agent Created Successfully!
        </Typography>
        <Typography variant="body1" paragraph>
          Your new AI agent "{formData.agentName}" has been created and is ready to use.
        </Typography>
        <Button 
          component={Link} 
          to="/" 
          variant="contained" 
          color="primary"
          sx={{ mt: 2, backgroundColor: '#2d3c59' }}
        >
          Go to Dashboard
        </Button>
      </Box>
    );
  }
  
  return (
    <StepWrapper
      title="Review & Submit"
      description="Review all the information you've provided. If everything looks correct, click 'Create Agent' to finalize."
      stepNumber={11}
      totalSteps={11}
      helpText="This is your final chance to review the agent configuration before creating it."
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}
      
      {isSubmitting ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">Creating your agent...</Typography>
          <Typography variant="body2" color="text.secondary">
            This may take a few moments
          </Typography>
        </Box>
      ) : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          {/* Basic Information */}
          {renderSection('Basic Information', formData)}
          
          {/* Tools & Capabilities */}
          {renderSection('Capabilities', { 
            type: formData.agentType 
          })}
          {renderList('Selected Capabilities', formData.capabilities)}
          
          {/* Knowledge Base */}
          {renderSection('Knowledge Base', formData.knowledgeBase, [
            'type', 'documentCount', 'vectorDatabase'
          ])}
          {renderList('Connected Data Sources', formData.knowledgeBase?.dataSources)}
          
          {/* Appearance */}
          {renderSection('Appearance', formData.appearance)}
          
          {/* Advanced Settings */}
          {renderSection('Advanced Settings', formData.advanced)}
          
          {/* Prompt Engineering Controls */}
          {renderSection('Prompt Engineering', formData.promptEngineering, [
            'systemPrompt', 'userPromptTemplate'
          ])}
          
          {/* LLM Parameters */}
          {renderSection('LLM Parameters', formData.llmParameters)}
          
          {/* Memory Management */}
          {renderSection('Memory Management', formData.memoryManagement, [
            'shortTermMemory', 'enableLongTermMemory', 'longTermMemoryType'
          ])}
          
          {/* Shared Memory */}
          {formData.memoryManagement?.enableSharedMemory && (
            renderList('Shared Memory Groups', formData.memoryManagement.sharedMemoryGroups)
          )}
          
          {/* Policies & Guardrails */}
          {renderSection('Content Filters', formData.policies, [
            'contentFilters'
          ])}
          {renderList('Disallowed Topics', formData.policies?.disallowedTopics)}
          
          {/* Output Format */}
          {renderSection('Output Format', formData.outputFormat)}
        </Paper>
      )}
    </StepWrapper>
  );
});

// Custom hook to check if all dependencies are loaded
const useWizardDependencies = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkDependencies = async () => {
      try {
        // Simulate checking for required services, APIs, etc.
        // In a real app, you might check for API availability, user permissions, etc.
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load dependencies: ' + err.message);
        setIsLoading(false);
      }
    };

    checkDependencies();
  }, []);

  return { isLoading, error };
};

// Main wizard component
const AgentWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  // Reference to store component instances
  const stepRefs = useRef({});
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isLoading, error } = useWizardDependencies();
  
  const steps = [
    { label: 'Basic Information', component: BasicInfoStep },
    { label: 'Tools & Capabilities', component: CapabilitiesStep },
    { label: 'Knowledge Base & Context', component: KnowledgeBaseStep },
    { label: 'Appearance', component: AppearanceStep },
    { label: 'Advanced Settings', component: AdvancedSettingsStep },
    { label: 'Prompt Engineering Controls', component: PromptEngineeringStep },
    { label: 'LLM Parameters', component: LLMParametersStep },
    { label: 'Memory Management', component: MemoryManagementStep },
    { label: 'Policies & Guardrails', component: PoliciesStep },
    { label: 'Output Format', component: OutputFormatStep },
    { label: 'Review & Submit', component: ReviewStep }
  ];

  const handleNext = () => {
    const currentStepRef = stepRefs.current[activeStep];
    
    // Check if the current step has validation
    if (currentStepRef && typeof currentStepRef.validateStep === 'function') {
      // If validation fails, don't proceed
      if (!currentStepRef.validateStep()) {
        return;
      }
    }
    
    // Save data from current step
    if (currentStepRef && typeof currentStepRef.saveData === 'function') {
      currentStepRef.saveData();
    }
    
    // Proceed to next step
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    
    // Scroll to top after step change
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    // Scroll to top after step change
    window.scrollTo(0, 0);
  };

  const handleSubmit = () => {
    // For the final step, use the ReviewStep's submit handler
    const reviewStepRef = stepRefs.current[steps.length - 1];
    if (reviewStepRef && typeof reviewStepRef.handleSubmit === 'function') {
      reviewStepRef.handleSubmit();
    }
  };

  // Helper function to render progress indicator
  const renderProgressIndicator = () => {
    const totalSteps = steps.length;
    const progress = Math.round(((activeStep + 1) / totalSteps) * 100);
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${progress}%`}</Typography>
        </Box>
      </Box>
    );
  };

  // Helper function to render current step summary
  const renderStepSummary = () => {
    return (
      <Box sx={{ mt: 1, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {steps[activeStep].label}
        </Typography>
      </Box>
    );
  };

  // If still loading dependencies, show loading indicator
  if (isLoading) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 4 }} />
        <Typography variant="h5" gutterBottom>
          Loading Agent Wizard...
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Preparing your agent creation experience
        </Typography>
      </Container>
    );
  }

  // If there was an error loading dependencies
  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 8, mb: 8 }}>
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
        <Typography variant="body1" paragraph>
          We encountered an issue while loading the Agent Wizard. Please try again later or contact support.
        </Typography>
        <Button component={Link} to="/" variant="contained">
          Return to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <WizardProvider>
      <Container maxWidth="md" sx={{ mt: { xs: 2, md: 4 }, mb: { xs: 2, md: 4 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Typography variant="h4" sx={{ mb: { xs: 2, md: 4 }, textAlign: 'center', color: '#2d3c59', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
            Create New Agent
          </Typography>
          
          {/* Mobile stepper (vertical orientation) */}
          {isMobile ? (
            <Box sx={{ mb: 3 }}>
              {renderProgressIndicator()}
              {renderStepSummary()}
              <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 2 }}>
                {steps.map((step, index) => (
                  <Step key={step.label} completed={index < activeStep}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                )).filter((_, index) => 
                  // Show only the previous, current, and next steps in mobile view
                  index >= activeStep - 1 && index <= activeStep + 1
                )}
              </Stepper>
            </Box>
          ) : (
            /* Desktop stepper (horizontal orientation) */
            <Box sx={{ mb: 4 }}>
              {renderProgressIndicator()}
              <Stepper 
                activeStep={activeStep} 
                alternativeLabel 
                sx={{ 
                  mb: 2, 
                  overflowX: 'auto', 
                  '& .MuiStepLabel-label': {
                    fontSize: '0.85rem',
                  },
                }}
              >
                {steps.map((step, index) => (
                  <Step key={step.label}>
                    <StepLabel>{step.label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
              {renderStepSummary()}
            </Box>
          )}
          
          {/* Current step wrapper with consistent padding and styling */}
          <Box sx={{ p: { xs: 0, md: 1 }, mb: 3, minHeight: { xs: '40vh', md: '50vh' } }}>
            {/* Render the current step component */}
            {React.createElement(steps[activeStep].component, {
              ref: (el) => stepRefs.current[activeStep] = el
            })}
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 2, sm: 0 } }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              variant="outlined"
              sx={{ mr: { xs: 0, sm: 1 }, order: { xs: 2, sm: 1 } }}
              fullWidth={isMobile}
            >
              Back
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleSubmit}
                sx={{ 
                  backgroundColor: '#2d3c59',
                  order: { xs: 1, sm: 2 },
                  px: 3,
                  py: 1
                }}
                fullWidth={isMobile}
              >
                Create Agent
              </Button>
            ) : (
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleNext}
                sx={{ 
                  backgroundColor: '#2d3c59',
                  order: { xs: 1, sm: 2 }
                }}
                fullWidth={isMobile}
              >
                Next
              </Button>
            )}
          </Box>
        </Paper>
      </Container>
    </WizardProvider>
  );
};

// Export the main component
export default AgentWizard; 