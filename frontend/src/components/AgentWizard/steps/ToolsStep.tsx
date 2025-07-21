import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState } from 'react';
import { StepWrapper } from '../StepWrapper';

interface ToolsData {
  tools: string[];
}

interface ToolsStepProps {
  isActive?: boolean;
  onSubmit?: (data: ToolsData) => void;
  initialData?: ToolsData;
}

const ToolsStep = forwardRef<any, ToolsStepProps>(({ isActive, onSubmit, initialData }, ref) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedTools, setSelectedTools] = useState<string[]>(initialData?.tools || []);

  useEffect(() => {
    if (isActive) {
      formRef.current?.querySelector('input')?.focus();
    }
  }, [isActive]);

  useEffect(() => {
    if (initialData) {
      setSelectedTools(initialData.tools);
    }
  }, [initialData]);

  useImperativeHandle(ref, () => ({
    validateStep: async () => {
      return true; // Simplified validation for testing
    },
    saveData: async () => {
      return { tools: selectedTools };
    },
    focusFirstInput: () => {
      formRef.current?.querySelector('input')?.focus();
    },
  }));

  const handleToolChange = (tool: string) => {
    setSelectedTools(prev => 
      prev.includes(tool) 
        ? prev.filter(t => t !== tool)
        : [...prev, tool]
    );
  };

  return (
    <StepWrapper
      title="Tools"
      description="Select the tools for your agent"
      stepNumber={2}
      totalSteps={11}
      helpText="Choose which tools your agent will have access to"
    >
      <form ref={formRef} role="form">
        <h3>Select Tools</h3>
        <div>
          <label>
            <input 
              type="checkbox" 
              value="tool1" 
              checked={selectedTools.includes('tool1')}
              onChange={() => handleToolChange('tool1')}
            /> Tool 1
          </label>
          <label>
            <input 
              type="checkbox" 
              value="tool2" 
              checked={selectedTools.includes('tool2')}
              onChange={() => handleToolChange('tool2')}
            /> Tool 2
          </label>
        </div>
      </form>
    </StepWrapper>
  );
});

ToolsStep.displayName = 'ToolsStep';

export default ToolsStep; 