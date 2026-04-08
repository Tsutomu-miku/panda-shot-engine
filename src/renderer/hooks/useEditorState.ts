import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  ReactNode,
} from 'react';

/* ================================================================
   Types
   ================================================================ */

export interface Character {
  id: string;
  name: string;
  color: string;
  position?: { x: number; y: number };
  scale?: number;
  facing?: 'left' | 'right';
  expression?: string;
  action?: string;
}

export interface Scene {
  id: string;
  name: string;
  color: string;
}

export interface Prop {
  id: string;
  name: string;
  color: string;
}

export interface TimelineEvent {
  id: string;
  trackId: string;
  type: 'action' | 'expression' | 'say' | 'camera' | 'sfx';
  label: string;
  startTime: number;
  duration: number;
}

export interface Track {
  id: string;
  name: string;
  color: string;
  visible: boolean;
  events: TimelineEvent[];
}

export interface Shot {
  id: string;
  duration: number;
  scene: string;
  transition: string;
  characters: Character[];
  tracks: Track[];
}

export interface Project {
  name: string;
  shots: Shot[];
}

export interface ValidationError {
  line: number;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface EditorState {
  currentProject: Project | null;
  currentShotIndex: number;
  isPlaying: boolean;
  currentTime: number;
  selectedCharacterId: string | null;
  zoom: number;
  timelineZoom: number;
  dslText: string;
  validationResult: ValidationResult | null;
}

/* ================================================================
   Actions
   ================================================================ */

export type EditorAction =
  | { type: 'SET_PROJECT'; project: Project }
  | { type: 'SET_SHOT'; index: number }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; time: number }
  | { type: 'SELECT_CHARACTER'; id: string | null }
  | { type: 'UPDATE_DSL'; text: string }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
  | { type: 'SET_VALIDATION'; result: ValidationResult }
  | { type: 'UPDATE_CHARACTER'; id: string; changes: Partial<Character> }
  | { type: 'UPDATE_SHOT'; changes: Partial<Shot> }
  | { type: 'TOGGLE_TRACK_VISIBILITY'; trackId: string }
  | { type: 'SKIP_FORWARD' }
  | { type: 'SKIP_BACKWARD' };

/* ================================================================
   Default DSL
   ================================================================ */

export const DEFAULT_DSL = `shot "EP01_客栈相遇_001":
  duration: 5s
  set: "inn_interior_day"
  
  place panda_warrior at left-third facing right
  place villain_boss at right-third facing left
  
  at 0s:
    camera wide
    panda_warrior expression neutral
    villain_boss expression smirk
  
  at 1.5s:
    camera close-up villain_boss
    villain_boss say "你以为你能赢我？" voice "villain_deep"
    villain_boss expression angry
  
  at 3.0s:
    camera close-up panda_warrior
    panda_warrior expression angry
    panda_warrior say "今天就是你的末日！" voice "hero_firm"
  
  at 4.0s:
    camera wide shake 0.3s
    panda_warrior action sword_slash
    sfx "sword_swing"
  
  transition: cut`;

/* ================================================================
   Mock Data
   ================================================================ */

export const MOCK_CHARACTERS: Character[] = [
  {
    id: 'panda_warrior',
    name: '熊猫战士',
    color: '#4caf50',
    position: { x: 0.33, y: 0.6 },
    scale: 1,
    facing: 'right',
    expression: 'neutral',
    action: 'idle',
  },
  {
    id: 'villain_boss',
    name: '大反派',
    color: '#f44336',
    position: { x: 0.67, y: 0.6 },
    scale: 1,
    facing: 'left',
    expression: 'smirk',
    action: 'idle',
  },
  {
    id: 'innkeeper',
    name: '店小二',
    color: '#ff9800',
    position: { x: 0.5, y: 0.75 },
    scale: 0.8,
    facing: 'right',
    expression: 'neutral',
    action: 'idle',
  },
];

export const MOCK_SCENES: Scene[] = [
  { id: 'inn_interior_day', name: '客栈', color: '#795548' },
  { id: 'palace_hall', name: '皇宫', color: '#fdd835' },
  { id: 'street_day', name: '街道', color: '#8d6e63' },
];

export const MOCK_PROPS: Prop[] = [
  { id: 'iron_sword', name: '铁剑', color: '#90a4ae' },
  { id: 'wine_cup', name: '酒杯', color: '#ce93d8' },
  { id: 'scroll', name: '卷轴', color: '#fff9c4' },
];

const MOCK_TRACKS: Track[] = [
  {
    id: 'track_panda_warrior',
    name: '熊猫战士',
    color: '#4caf50',
    visible: true,
    events: [
      { id: 'e1', trackId: 'track_panda_warrior', type: 'expression', label: 'neutral', startTime: 0, duration: 3 },
      { id: 'e2', trackId: 'track_panda_warrior', type: 'expression', label: 'angry', startTime: 3, duration: 2 },
      { id: 'e3', trackId: 'track_panda_warrior', type: 'say', label: '"今天就是你的末日！"', startTime: 3, duration: 1 },
      { id: 'e4', trackId: 'track_panda_warrior', type: 'action', label: 'sword_slash', startTime: 4, duration: 1 },
    ],
  },
  {
    id: 'track_villain_boss',
    name: '大反派',
    color: '#f44336',
    visible: true,
    events: [
      { id: 'e5', trackId: 'track_villain_boss', type: 'expression', label: 'smirk', startTime: 0, duration: 1.5 },
      { id: 'e6', trackId: 'track_villain_boss', type: 'say', label: '"你以为你能赢我？"', startTime: 1.5, duration: 1.5 },
      { id: 'e7', trackId: 'track_villain_boss', type: 'expression', label: 'angry', startTime: 1.5, duration: 3.5 },
    ],
  },
  {
    id: 'track_camera',
    name: '相机',
    color: '#ab47bc',
    visible: true,
    events: [
      { id: 'e8', trackId: 'track_camera', type: 'camera', label: 'wide', startTime: 0, duration: 1.5 },
      { id: 'e9', trackId: 'track_camera', type: 'camera', label: 'close-up villain', startTime: 1.5, duration: 1.5 },
      { id: 'e10', trackId: 'track_camera', type: 'camera', label: 'close-up panda', startTime: 3, duration: 1 },
      { id: 'e11', trackId: 'track_camera', type: 'camera', label: 'wide shake', startTime: 4, duration: 1 },
    ],
  },
  {
    id: 'track_audio',
    name: '音频',
    color: '#42a5f5',
    visible: true,
    events: [
      { id: 'e12', trackId: 'track_audio', type: 'sfx', label: 'sword_swing', startTime: 4, duration: 0.5 },
    ],
  },
];

const MOCK_SHOTS: Shot[] = [
  {
    id: 'EP01_客栈相遇_001',
    duration: 5,
    scene: 'inn_interior_day',
    transition: 'cut',
    characters: MOCK_CHARACTERS.slice(0, 2),
    tracks: MOCK_TRACKS,
  },
  {
    id: 'EP01_客栈相遇_002',
    duration: 3,
    scene: 'inn_interior_day',
    transition: 'dissolve',
    characters: MOCK_CHARACTERS,
    tracks: [],
  },
  {
    id: 'EP01_皇宫对峙_003',
    duration: 8,
    scene: 'palace_hall',
    transition: 'cut',
    characters: [MOCK_CHARACTERS[0]],
    tracks: [],
  },
];

const MOCK_PROJECT: Project = {
  name: 'Panda Shot Engine',
  shots: MOCK_SHOTS,
};

/* ================================================================
   Initial State
   ================================================================ */

const initialState: EditorState = {
  currentProject: MOCK_PROJECT,
  currentShotIndex: 0,
  isPlaying: false,
  currentTime: 0,
  selectedCharacterId: null,
  zoom: 100,
  timelineZoom: 1,
  dslText: DEFAULT_DSL,
  validationResult: { valid: true, errors: [] },
};

/* ================================================================
   Reducer
   ================================================================ */

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'SET_PROJECT':
      return { ...state, currentProject: action.project, currentShotIndex: 0, currentTime: 0 };

    case 'SET_SHOT':
      return { ...state, currentShotIndex: action.index, currentTime: 0, selectedCharacterId: null };

    case 'PLAY':
      return { ...state, isPlaying: true };

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'STOP':
      return { ...state, isPlaying: false, currentTime: 0 };

    case 'SEEK':
      return { ...state, currentTime: Math.max(0, action.time) };

    case 'SELECT_CHARACTER':
      return { ...state, selectedCharacterId: action.id };

    case 'UPDATE_DSL':
      return { ...state, dslText: action.text };

    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };

    case 'SET_TIMELINE_ZOOM':
      return { ...state, timelineZoom: Math.max(0.25, Math.min(4, action.zoom)) };

    case 'SET_VALIDATION':
      return { ...state, validationResult: action.result };

    case 'UPDATE_CHARACTER': {
      if (!state.currentProject) return state;
      const shots = [...state.currentProject.shots];
      const shot = { ...shots[state.currentShotIndex] };
      shot.characters = shot.characters.map((c) =>
        c.id === action.id ? { ...c, ...action.changes } : c
      );
      shots[state.currentShotIndex] = shot;
      return {
        ...state,
        currentProject: { ...state.currentProject, shots },
      };
    }

    case 'UPDATE_SHOT': {
      if (!state.currentProject) return state;
      const shots = [...state.currentProject.shots];
      shots[state.currentShotIndex] = { ...shots[state.currentShotIndex], ...action.changes };
      return {
        ...state,
        currentProject: { ...state.currentProject, shots },
      };
    }

    case 'TOGGLE_TRACK_VISIBILITY': {
      if (!state.currentProject) return state;
      const shots = [...state.currentProject.shots];
      const shot = { ...shots[state.currentShotIndex] };
      shot.tracks = shot.tracks.map((t) =>
        t.id === action.trackId ? { ...t, visible: !t.visible } : t
      );
      shots[state.currentShotIndex] = shot;
      return {
        ...state,
        currentProject: { ...state.currentProject, shots },
      };
    }

    case 'SKIP_FORWARD': {
      const shot = state.currentProject?.shots[state.currentShotIndex];
      if (!shot) return state;
      return { ...state, currentTime: Math.min(state.currentTime + 0.5, shot.duration) };
    }

    case 'SKIP_BACKWARD': {
      return { ...state, currentTime: Math.max(state.currentTime - 0.5, 0) };
    }

    default:
      return state;
  }
}

/* ================================================================
   Context + Provider + Hook
   ================================================================ */

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  currentShot: Shot | null;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const currentShot =
    state.currentProject?.shots[state.currentShotIndex] ?? null;

  return (
    <EditorContext.Provider value={{ state, dispatch, currentShot }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}

/* ================================================================
   DSL Validation Helper
   ================================================================ */

export function validateDsl(text: string): ValidationResult {
  const errors: ValidationError[] = [];
  const lines = text.split('\n');

  if (lines.length === 0 || text.trim() === '') {
    errors.push({ line: 1, message: 'DSL is empty' });
    return { valid: false, errors };
  }

  // Check first line has shot declaration
  if (!/^shot\s+"[^"]+"\s*:/.test(lines[0].trim())) {
    errors.push({ line: 1, message: 'Expected shot declaration: shot "name":' });
  }

  // Check duration exists
  const hasDuration = lines.some((l) => /^\s+duration:\s+\d/.test(l));
  if (!hasDuration) {
    errors.push({ line: 2, message: 'Missing required field: duration' });
  }

  // Check for unmatched quotes
  lines.forEach((line, idx) => {
    const quoteCount = (line.match(/"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      errors.push({ line: idx + 1, message: 'Unmatched quote' });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
