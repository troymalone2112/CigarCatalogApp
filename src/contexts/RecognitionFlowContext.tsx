import React, { createContext, useContext, useState, useCallback } from 'react';
import { Cigar } from '../types';

interface RecognitionFlowState {
  isActive: boolean;
  cigar: Cigar | null;
  singleStickPrice: string | null;
}

interface RecognitionFlowContextType {
  recognitionFlow: RecognitionFlowState;
  startRecognitionFlow: (cigar: Cigar, singleStickPrice: string) => void;
  clearRecognitionFlow: () => void;
}

const RecognitionFlowContext = createContext<RecognitionFlowContextType | undefined>(undefined);

export const useRecognitionFlow = () => {
  const context = useContext(RecognitionFlowContext);
  if (!context) {
    throw new Error('useRecognitionFlow must be used within RecognitionFlowProvider');
  }
  return context;
};

export const RecognitionFlowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [recognitionFlow, setRecognitionFlow] = useState<RecognitionFlowState>({
    isActive: false,
    cigar: null,
    singleStickPrice: null,
  });

  const startRecognitionFlow = useCallback((cigar: Cigar, singleStickPrice: string) => {
    console.log('🎯 Starting recognition flow with cigar:', cigar.brand, cigar.line);
    setRecognitionFlow({
      isActive: true,
      cigar,
      singleStickPrice,
    });
  }, []);

  const clearRecognitionFlow = useCallback(() => {
    console.log('🧹 Clearing recognition flow');
    setRecognitionFlow({
      isActive: false,
      cigar: null,
      singleStickPrice: null,
    });
  }, []);

  return (
    <RecognitionFlowContext.Provider value={{ recognitionFlow, startRecognitionFlow, clearRecognitionFlow }}>
      {children}
    </RecognitionFlowContext.Provider>
  );
};






