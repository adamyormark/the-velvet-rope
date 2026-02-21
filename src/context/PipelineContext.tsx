'use client';

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type {
  PipelineState, PipelineStage, RawAttendee, EnrichedProfile,
  AttendeePitch, BiometricResult, GuestListEntry, VenueConfig,
  DjConfig, SimulationResult,
} from '@/lib/types';

const STORAGE_KEY = 'velvet-rope-pipeline';

const initialState: PipelineState = {
  currentStage: 'upload',
  rawAttendees: [],
  enrichedProfiles: [],
  pitches: [],
  biometricResults: [],
  guestList: [],
  venueConfig: null,
  djConfig: null,
  simulationResult: null,
};

type Action =
  | { type: 'SET_RAW_ATTENDEES'; payload: RawAttendee[] }
  | { type: 'SET_ENRICHED_PROFILES'; payload: EnrichedProfile[] }
  | { type: 'SET_PITCHES'; payload: AttendeePitch[] }
  | { type: 'ADD_BIOMETRIC_RESULT'; payload: BiometricResult }
  | { type: 'SET_BIOMETRIC_RESULTS'; payload: BiometricResult[] }
  | { type: 'SET_GUEST_LIST'; payload: GuestListEntry[] }
  | { type: 'SET_VENUE_CONFIG'; payload: VenueConfig }
  | { type: 'SET_DJ_CONFIG'; payload: DjConfig }
  | { type: 'SET_SIMULATION_RESULT'; payload: SimulationResult }
  | { type: 'SET_STAGE'; payload: PipelineStage }
  | { type: 'LOAD_STATE'; payload: PipelineState }
  | { type: 'RESET' };

function reducer(state: PipelineState, action: Action): PipelineState {
  switch (action.type) {
    case 'SET_RAW_ATTENDEES':
      return { ...state, rawAttendees: action.payload };
    case 'SET_ENRICHED_PROFILES':
      return { ...state, enrichedProfiles: action.payload };
    case 'SET_PITCHES':
      return { ...state, pitches: action.payload };
    case 'ADD_BIOMETRIC_RESULT':
      return { ...state, biometricResults: [...state.biometricResults, action.payload] };
    case 'SET_BIOMETRIC_RESULTS':
      return { ...state, biometricResults: action.payload };
    case 'SET_GUEST_LIST':
      return { ...state, guestList: action.payload };
    case 'SET_VENUE_CONFIG':
      return { ...state, venueConfig: action.payload };
    case 'SET_DJ_CONFIG':
      return { ...state, djConfig: action.payload };
    case 'SET_SIMULATION_RESULT':
      return { ...state, simulationResult: action.payload };
    case 'SET_STAGE':
      return { ...state, currentStage: action.payload };
    case 'LOAD_STATE':
      return action.payload;
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface PipelineContextValue {
  state: PipelineState;
  dispatch: React.Dispatch<Action>;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        dispatch({ type: 'LOAD_STATE', payload: JSON.parse(saved) });
      }
    } catch {}
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state]);

  return (
    <PipelineContext.Provider value={{ state, dispatch }}>
      {children}
    </PipelineContext.Provider>
  );
}

export function usePipeline() {
  const ctx = useContext(PipelineContext);
  if (!ctx) throw new Error('usePipeline must be used within PipelineProvider');
  return ctx;
}
