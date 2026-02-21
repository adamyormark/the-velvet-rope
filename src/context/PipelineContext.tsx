'use client';

import React, { createContext, useContext, useReducer, useCallback, type ReactNode } from 'react';
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

function loadFromStorage(): PipelineState {
  if (typeof window === 'undefined') return initialState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return initialState;
}

function saveToStorage(state: PipelineState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

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
  let next: PipelineState;
  switch (action.type) {
    case 'SET_RAW_ATTENDEES':
      next = { ...state, rawAttendees: action.payload };
      break;
    case 'SET_ENRICHED_PROFILES':
      next = { ...state, enrichedProfiles: action.payload };
      break;
    case 'SET_PITCHES':
      next = { ...state, pitches: action.payload };
      break;
    case 'ADD_BIOMETRIC_RESULT':
      next = { ...state, biometricResults: [...state.biometricResults, action.payload] };
      break;
    case 'SET_BIOMETRIC_RESULTS':
      next = { ...state, biometricResults: action.payload };
      break;
    case 'SET_GUEST_LIST':
      next = { ...state, guestList: action.payload };
      break;
    case 'SET_VENUE_CONFIG':
      next = { ...state, venueConfig: action.payload };
      break;
    case 'SET_DJ_CONFIG':
      next = { ...state, djConfig: action.payload };
      break;
    case 'SET_SIMULATION_RESULT':
      next = { ...state, simulationResult: action.payload };
      break;
    case 'SET_STAGE':
      next = { ...state, currentStage: action.payload };
      break;
    case 'LOAD_STATE':
      next = action.payload;
      break;
    case 'RESET':
      next = initialState;
      break;
    default:
      next = state;
  }
  // Persist synchronously inside the reducer so it's saved before navigation
  saveToStorage(next);
  return next;
}

interface PipelineContextValue {
  state: PipelineState;
  dispatch: React.Dispatch<Action>;
}

const PipelineContext = createContext<PipelineContextValue | null>(null);

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, loadFromStorage);

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
