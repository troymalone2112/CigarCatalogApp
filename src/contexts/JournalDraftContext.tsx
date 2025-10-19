import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { JournalEntry, Cigar } from '../types';

interface JournalDraft {
  id: string;
  cigar: Cigar;
  notes: string;
  rating: number;
  selectedFlavors: string[];
  photos: string[];
  location: string;
  createdAt: Date;
  lastModified: Date;
  recognitionImageUrl?: string;
}

interface JournalDraftContextType {
  currentDraft: JournalDraft | null;
  isDraftActive: boolean;
  saveDraft: (draft: Partial<JournalDraft>) => Promise<void>;
  loadDraft: (cigarId: string) => Promise<JournalDraft | null>;
  clearDraft: () => Promise<void>;
  restoreDraft: () => Promise<JournalDraft | null>;
  hasUnsavedChanges: boolean;
}

const JournalDraftContext = createContext<JournalDraftContextType | undefined>(undefined);

export const useJournalDraft = () => {
  const context = useContext(JournalDraftContext);
  if (context === undefined) {
    throw new Error('useJournalDraft must be used within a JournalDraftProvider');
  }
  return context;
};

const DRAFT_STORAGE_KEY = 'journal_draft';
const DRAFT_EXPIRY_HOURS = 24; // Drafts expire after 24 hours

export const JournalDraftProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentDraft, setCurrentDraft] = useState<JournalDraft | null>(null);
  const [isDraftActive, setIsDraftActive] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Handle app state changes to save draft when going to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('📱 Journal Draft - App state changed:', appState, '->', nextAppState);
      
      if (appState.match(/active/) && nextAppState.match(/inactive|background/)) {
        console.log('💾 Journal Draft - App going to background, saving draft...');
        if (currentDraft && hasUnsavedChanges) {
          saveDraftToStorage(currentDraft);
        }
      }
      
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [appState, currentDraft, hasUnsavedChanges]);

  // Auto-save draft every 30 seconds if there are unsaved changes
  useEffect(() => {
    if (!isDraftActive || !hasUnsavedChanges || !currentDraft) return;

    const autoSaveInterval = setInterval(() => {
      console.log('💾 Journal Draft - Auto-saving draft...');
      saveDraftToStorage(currentDraft);
      setHasUnsavedChanges(false);
    }, 30000); // 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [isDraftActive, hasUnsavedChanges, currentDraft]);

  const saveDraftToStorage = async (draft: JournalDraft) => {
    try {
      const draftData = {
        ...draft,
        lastModified: new Date(),
      };
      
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      console.log('✅ Journal Draft - Draft saved to storage');
    } catch (error) {
      console.error('❌ Journal Draft - Failed to save draft:', error);
    }
  };

  const saveDraft = async (draftData: Partial<JournalDraft>) => {
    try {
      if (!currentDraft) {
        console.log('⚠️ Journal Draft - No current draft to update');
        return;
      }

      const updatedDraft: JournalDraft = {
        ...currentDraft,
        ...draftData,
        lastModified: new Date(),
      };

      setCurrentDraft(updatedDraft);
      setHasUnsavedChanges(true);
      
      // Save to storage immediately for important changes
      await saveDraftToStorage(updatedDraft);
      
      console.log('✅ Journal Draft - Draft updated and saved');
    } catch (error) {
      console.error('❌ Journal Draft - Failed to save draft:', error);
    }
  };

  const loadDraft = async (cigarId: string): Promise<JournalDraft | null> => {
    try {
      const draftData = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      
      if (!draftData) {
        console.log('📝 Journal Draft - No draft found');
        return null;
      }

      const draft: JournalDraft = JSON.parse(draftData);
      
      // Check if draft is for the same cigar
      if (draft.cigar.id !== cigarId) {
        console.log('📝 Journal Draft - Draft is for different cigar, ignoring');
        return null;
      }

      // Check if draft has expired
      const now = new Date();
      const draftAge = now.getTime() - new Date(draft.lastModified).getTime();
      const maxAge = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (draftAge > maxAge) {
        console.log('📝 Journal Draft - Draft has expired, clearing');
        await clearDraft();
        return null;
      }

      console.log('✅ Journal Draft - Draft loaded successfully');
      return draft;
    } catch (error) {
      console.error('❌ Journal Draft - Failed to load draft:', error);
      return null;
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setCurrentDraft(null);
      setIsDraftActive(false);
      setHasUnsavedChanges(false);
      console.log('✅ Journal Draft - Draft cleared');
    } catch (error) {
      console.error('❌ Journal Draft - Failed to clear draft:', error);
    }
  };

  const restoreDraft = async (): Promise<JournalDraft | null> => {
    try {
      const draftData = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      
      if (!draftData) {
        console.log('📝 Journal Draft - No draft to restore');
        return null;
      }

      const draft: JournalDraft = JSON.parse(draftData);
      
      // Check if draft has expired
      const now = new Date();
      const draftAge = now.getTime() - new Date(draft.lastModified).getTime();
      const maxAge = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (draftAge > maxAge) {
        console.log('📝 Journal Draft - Draft has expired, clearing');
        await clearDraft();
        return null;
      }

      setCurrentDraft(draft);
      setIsDraftActive(true);
      setHasUnsavedChanges(false);
      
      console.log('✅ Journal Draft - Draft restored successfully');
      return draft;
    } catch (error) {
      console.error('❌ Journal Draft - Failed to restore draft:', error);
      return null;
    }
  };

  const startNewDraft = (cigar: Cigar, recognitionImageUrl?: string) => {
    const newDraft: JournalDraft = {
      id: `draft_${Date.now()}`,
      cigar,
      notes: '',
      rating: 5,
      selectedFlavors: [],
      photos: [],
      location: '',
      createdAt: new Date(),
      lastModified: new Date(),
      recognitionImageUrl,
    };

    setCurrentDraft(newDraft);
    setIsDraftActive(true);
    setHasUnsavedChanges(false);
    
    console.log('📝 Journal Draft - New draft started');
  };

  const value = {
    currentDraft,
    isDraftActive,
    saveDraft,
    loadDraft,
    clearDraft,
    restoreDraft,
    hasUnsavedChanges,
  };

  return (
    <JournalDraftContext.Provider value={value}>
      {children}
    </JournalDraftContext.Provider>
  );
};
