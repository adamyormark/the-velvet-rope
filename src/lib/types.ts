// === Stage 1: Entity Profiling ===

export interface RawAttendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  title: string;
  industry: string;
  yearsExperience: number;
  skills: string;
  interests: string;
  linkedinUrl: string;
  bio: string;
  connectionStrength: 'cold' | 'warm' | 'hot';
  lastInteraction: string;
  dealValue: number;
  eventHistory: string;
  personalityType: string;
  networkSize: number;
  influenceScore: number;
  notes: string;
}

export interface EnrichedProfile extends RawAttendee {
  parsedSkills: string[];
  parsedInterests: string[];
  parsedEventHistory: string[];
  avatarUrl: string;
  profileSummary: string;
  uniqueValue: string;
  potentialContributions: string[];
}

// === Stage 2: Pitch Generation ===

export interface AttendeePitch {
  attendeeId: string;
  pitchText: string;
  pitchTone: 'confident' | 'humble' | 'humorous' | 'passionate' | 'analytical';
  keyArguments: string[];
  generatedAt: string;
}

// === Stage 3: Biometric Vetting ===

export type FaceExpression =
  | 'neutral' | 'happy' | 'sad' | 'angry'
  | 'fearful' | 'disgusted' | 'surprised';

export interface ExpressionSnapshot {
  timestamp: number;
  expressions: Record<FaceExpression, number>;
  dominantExpression: FaceExpression;
  yesnessSignal: number;
}

export interface BiometricResult {
  attendeeId: string;
  snapshots: ExpressionSnapshot[];
  yesnessScore: number;
  peakPositive: number;
  peakNegative: number;
  engagementLevel: number;
  durationMs: number;
}

// === Stage 4: Guest List ===

export interface GuestListEntry {
  attendee: EnrichedProfile;
  biometricResult: BiometricResult;
  rank: number;
  admitted: boolean;
}

// === Stage 5: Venue + DJ ===

export interface VenueConfig {
  name: string;
  type: 'conference' | 'workshop' | 'networking' | 'hackathon' | 'roundtable';
  capacity: number;
  description: string;
}

export interface DjConfig {
  theme: string;
  goal: string;
  dynamics: 'competitive' | 'collaborative' | 'speed-dating' | 'open-floor' | 'structured';
  rounds: number;
  rules: string[];
  icebreaker: string;
}

// === Stage 6: Simulation ===

export interface AgentState {
  attendeeId: string;
  position: { x: number; y: number };
  currentGroupId: string | null;
  mood: string;
  energyLevel: number;
  satisfaction: number;
}

export interface SimulationGroup {
  id: string;
  memberIds: string[];
  topic: string;
  output: string;
  cohesion: number;
}

export interface SimulationRound {
  roundNumber: number;
  agentStates: AgentState[];
  groups: SimulationGroup[];
  narrative: string;
  events: SimulationEvent[];
}

export interface SimulationEvent {
  type: 'group_formed' | 'group_dissolved' | 'agent_moved' | 'output_produced' | 'conflict' | 'breakthrough';
  description: string;
  involvedAgentIds: string[];
}

export interface SimulationResult {
  rounds: SimulationRound[];
  finalGroups: SimulationGroup[];
  aggregatedOutput: string;
  totalRounds: number;
}

// === Stage 7: Evaluation ===

export interface EvaluationResult {
  goalAlignmentScore: number;
  goalAlignmentExplanation: string;
  topOutputs: { groupId: string; output: string; score: number }[];
  recommendations: {
    guestListChanges: string[];
    djChanges: string[];
    venueChanges: string[];
  };
  overallNarrative: string;
}

// === Pipeline State ===

export type PipelineStage =
  | 'upload' | 'profiles' | 'pitches' | 'bouncer'
  | 'guest-list' | 'venue' | 'party';

export interface PipelineState {
  currentStage: PipelineStage;
  rawAttendees: RawAttendee[];
  enrichedProfiles: EnrichedProfile[];
  pitches: AttendeePitch[];
  biometricResults: BiometricResult[];
  guestList: GuestListEntry[];
  venueConfig: VenueConfig | null;
  djConfig: DjConfig | null;
  simulationResult: SimulationResult | null;
}

export const STAGE_ORDER: PipelineStage[] = [
  'upload', 'profiles', 'pitches', 'bouncer',
  'guest-list', 'venue', 'party',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  upload: 'The Line',
  profiles: 'Dossiers',
  pitches: 'The Plea',
  bouncer: 'The Bouncer',
  'guest-list': 'The List',
  venue: 'The Venue',
  party: 'The Floor',
};

export const STAGE_ROUTES: Record<PipelineStage, string> = {
  upload: '/',
  profiles: '/profiles',
  pitches: '/pitches',
  bouncer: '/bouncer',
  'guest-list': '/guest-list',
  venue: '/venue',
  party: '/party',
};
