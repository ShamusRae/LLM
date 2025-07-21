import React, { createContext, useContext, ReactNode } from 'react';

interface WizardContextType {
  wizardData: Record<string, any>;
  setWizardData: (data: Record<string, any>) => void;
}

const WizardContext = createContext<WizardContextType | undefined>(undefined);

export const WizardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [wizardData, setWizardData] = React.useState<Record<string, any>>({});

  return (
    <WizardContext.Provider value={{ wizardData, setWizardData }}>
      {children}
    </WizardContext.Provider>
  );
};

export const useWizard = () => {
  const context = useContext(WizardContext);
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider');
  }
  return context;
}; 