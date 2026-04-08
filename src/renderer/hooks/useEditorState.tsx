// ============================================================
// panda-shot-engine — Complete Editor State Management
// useEditorState.ts — React Context + useReducer with Command Pattern Undo/Redo
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

import { Shot as DslShot, DiagnosticMessage } from '../../core/dsl/types';
import { parseShots } from '../../core/dsl/parser';
import { serializeShots } from '../../core/dsl/serializer';
import { Validator } from '../../core/dsl/validator';
import {
  FULL_DEMO_DSL,
  DEMO_CHARACTERS,
  DEMO_SCENES,
  DemoCharacter,
  DemoScene,
} from '../../demo/demo-project';

// ─── Selected Element ───────────────────────────────────────

export type SelectedElementType = 'shot' | 'character' | 'timelineEvent' | 'camera';

export interface SelectedElement {
  type: SelectedElementType;
  shotIndex: number;
  id: string;
  trackId?: string;
}

// ─── Panel Layout ───────────────────────────────────────────

export interface PanelLayout {
  leftWidth: number;
  rightWidth: number;
  timelineHeight: number;
  leftSplitRatio: number;
  rightSplitRatio: number;
  collapsedPanels: Set<string>;
}

// ─── Editor State ───────────────────────────────────────────

export interface EditorState {
  project: PandaProject | null;
  currentShotIndex: number;
  currentTime: number;
  isPlaying: boolean;
  playbackSpeed: number;
  zoom: number;
  selectedElement: SelectedElement | null;
  dslText: string;
  dslErrors: DiagnosticMessage[];
  dslWarnings: DiagnosticMessage[];
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  panelLayout: PanelLayout;
  viewMode: 'edit' | 'preview' | 'split';
  timelineZoom: number;
}

// ─── Project Model ──────────────────────────────────────────

export interface PandaProject {
  name: string;
  shots: DslShot[];
  characters: DemoCharacter[];
  scenes: DemoScene[];
}

// ─── Undo/Redo Command Pattern ──────────────────────────────

export interface UndoEntry {
  description: string;
  snapshot: {
    dslText: string;
    currentShotIndex: number;
    selectedElement: SelectedElement | null;
  };
}

function captureSnapshot(state: EditorState): UndoEntry['snapshot'] {
  return {
    dslText: state.dslText,
    currentShotIndex: state.currentShotIndex,
    selectedElement: state.selectedElement,
  };
}

// ─── Action Types ───────────────────────────────────────────

export type EditorAction =
  | { type: 'SET_PROJECT'; project: PandaProject; dslText: string }
  | { type: 'NEW_PROJECT' }
  | { type: 'SET_CURRENT_SHOT'; index: number }
  | { type: 'ADD_SHOT'; afterIndex: number }
  | { type: 'REMOVE_SHOT'; index: number }
  | { type: 'REORDER_SHOT'; fromIndex: number; toIndex: number }
  | { type: 'DUPLICATE_SHOT'; index: number }
  | { type: 'SET_DSL_TEXT'; text: string }
  | { type: 'PARSE_DSL' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'SEEK'; time: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SELECT_ELEMENT'; element: SelectedElement }
  | { type: 'DESELECT' }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_TIMELINE_ZOOM'; zoom: number }
  | { type: 'SET_VIEW_MODE'; mode: 'edit' | 'preview' | 'split' }
  | { type: 'UPDATE_SHOT_PROPERTY'; shotIndex: number; key: string; value: unknown }
  | { type: 'UPDATE_PANEL_LAYOUT'; layout: Partial<PanelLayout> }
  | { type: 'TOGGLE_PANEL_COLLAPSE'; panelId: string }
  | { type: 'SET_PROJECT_NAME'; name: string };

// ─── Helpers: parse DSL and extract shots ───────────────────

function tryParseDsl(text: string): {
  shots: DslShot[];
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
} {
  try {
    const shots = parseShots(text);
    const validator = new Validator();
    const result = validator.validateAll(shots);
    return {
      shots,
      errors: result.errors,
      warnings: result.warnings,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lineMatch = msg.match(/at (\d+):(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    const column = lineMatch ? parseInt(lineMatch[2], 10) : 1;
    return {
      shots: [],
      errors: [{ line, column, message: msg, severity: 'error' }],
      warnings: [],
    };
  }
}

function rebuildProjectFromDsl(
  state: EditorState,
  dslText: string,
): Partial<EditorState> {
  const { shots, errors, warnings } = tryParseDsl(dslText);
  const project: PandaProject = {
    name: state.project?.name ?? 'Untitled Project',
    shots,
    characters: state.project?.characters ?? [...DEMO_CHARACTERS],
    scenes: state.project?.scenes ?? [...DEMO_SCENES],
  };
  return {
    project,
    dslText,
    dslErrors: errors,
    dslWarnings: warnings,
    currentShotIndex: Math.min(
      state.currentShotIndex,
      Math.max(0, shots.length - 1),
    ),
  };
}

// ─── Initial State ──────────────────────────────────────────

function createInitialState(): EditorState {
  const dslText = FULL_DEMO_DSL;
  const { shots, errors, warnings } = tryParseDsl(dslText);

  const project: PandaProject = {
    name: 'Panda Shot Engine — 客栈相遇',
    shots,
    characters: [...DEMO_CHARACTERS],
    scenes: [...DEMO_SCENES],
  };

  return {
    project,
    currentShotIndex: 0,
    currentTime: 0,
    isPlaying: false,
    playbackSpeed: 1,
    zoom: 100,
    selectedElement: null,
    dslText,
    dslErrors: errors,
    dslWarnings: warnings,
    undoStack: [],
    redoStack: [],
    panelLayout: {
      leftWidth: 240,
      rightWidth: 320,
      timelineHeight: 220,
      leftSplitRatio: 0.4,
      rightSplitRatio: 0.6,
      collapsedPanels: new Set<string>(),
    },
    viewMode: 'edit',
    timelineZoom: 1,
  };
}

const initialState = createInitialState();

// ─── Reducer ────────────────────────────────────────────────

function pushUndo(state: EditorState, description: string): EditorState {
  const entry: UndoEntry = { description, snapshot: captureSnapshot(state) };
  return {
    ...state,
    undoStack: [...state.undoStack.slice(-49), entry],
    redoStack: [],
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // ─── Project ──────────────────────────────────────────
    case 'SET_PROJECT': {
      return {
        ...state,
        project: action.project,
        dslText: action.dslText,
        currentShotIndex: 0,
        currentTime: 0,
        selectedElement: null,
        ...rebuildProjectFromDsl(state, action.dslText),
      };
    }

    case 'NEW_PROJECT': {
      const newDsl = `shot "新镜头_001":\n  duration: 5s\n  set: "inn_interior"\n\n  at 0s:\n    camera wide\n\n  transition: cut`;
      const stateWithUndo = pushUndo(state, 'New Project');
      return {
        ...stateWithUndo,
        ...rebuildProjectFromDsl(stateWithUndo, newDsl),
        currentTime: 0,
        selectedElement: null,
      };
    }

    case 'SET_PROJECT_NAME': {
      if (!state.project) return state;
      return {
        ...state,
        project: { ...state.project, name: action.name },
      };
    }

    // ─── Shot navigation ──────────────────────────────────
    case 'SET_CURRENT_SHOT': {
      const maxIndex = (state.project?.shots.length ?? 1) - 1;
      const index = Math.max(0, Math.min(action.index, maxIndex));
      return {
        ...state,
        currentShotIndex: index,
        currentTime: 0,
        selectedElement: null,
      };
    }

    case 'ADD_SHOT': {
      if (!state.project) return state;
      const stateU = pushUndo(state, 'Add Shot');
      const newShotNum = state.project.shots.length + 1;
      const newShotDsl = `\n\nshot "新镜头_${String(newShotNum).padStart(3, '0')}":\n  duration: 5s\n  set: "inn_interior"\n\n  at 0s:\n    camera wide\n\n  transition: cut`;
      const lines = stateU.dslText.split('\n');
      // Find where to insert: after the shot at afterIndex
      let insertLineIndex = lines.length;
      let shotCount = -1;
      for (let i = 0; i < lines.length; i++) {
        if (/^shot\s+"/.test(lines[i].trim())) {
          shotCount++;
          if (shotCount > action.afterIndex) {
            insertLineIndex = i;
            break;
          }
        }
      }
      const newDslText =
        insertLineIndex >= lines.length
          ? stateU.dslText + newShotDsl
          : [
              ...lines.slice(0, insertLineIndex),
              newShotDsl,
              '',
              ...lines.slice(insertLineIndex),
            ].join('\n');
      return {
        ...stateU,
        ...rebuildProjectFromDsl(stateU, newDslText),
        currentShotIndex: action.afterIndex + 1,
        currentTime: 0,
      };
    }

    case 'REMOVE_SHOT': {
      if (!state.project || state.project.shots.length <= 1) return state;
      const stateU = pushUndo(state, 'Remove Shot');
      const shots = [...state.project.shots];
      shots.splice(action.index, 1);
      const newDslText = serializeShots(shots);
      return {
        ...stateU,
        ...rebuildProjectFromDsl(stateU, newDslText),
        currentShotIndex: Math.min(
          stateU.currentShotIndex,
          Math.max(0, shots.length - 1),
        ),
        currentTime: 0,
      };
    }

    case 'REORDER_SHOT': {
      if (!state.project) return state;
      const stateU = pushUndo(state, 'Reorder Shot');
      const shots = [...state.project.shots];
      const [moved] = shots.splice(action.fromIndex, 1);
      shots.splice(action.toIndex, 0, moved);
      const newDslText = serializeShots(shots);
      return {
        ...stateU,
        ...rebuildProjectFromDsl(stateU, newDslText),
        currentShotIndex: action.toIndex,
      };
    }

    case 'DUPLICATE_SHOT': {
      if (!state.project) return state;
      const stateU = pushUndo(state, 'Duplicate Shot');
      const shots = [...state.project.shots];
      const orig = shots[action.index];
      if (!orig) return state;
      const dup: DslShot = {
        ...JSON.parse(JSON.stringify(orig)),
        id: orig.id + '_copy',
      };
      shots.splice(action.index + 1, 0, dup);
      const newDslText = serializeShots(shots);
      return {
        ...stateU,
        ...rebuildProjectFromDsl(stateU, newDslText),
        currentShotIndex: action.index + 1,
      };
    }

    // ─── DSL text ─────────────────────────────────────────
    case 'SET_DSL_TEXT': {
      return {
        ...state,
        dslText: action.text,
      };
    }

    case 'PARSE_DSL': {
      const stateU = pushUndo(state, 'Edit DSL');
      return {
        ...stateU,
        ...rebuildProjectFromDsl(stateU, stateU.dslText),
      };
    }

    // ─── Playback ─────────────────────────────────────────
    case 'PLAY': {
      const maxTime = state.project?.shots[state.currentShotIndex]?.duration ?? 0;
      return {
        ...state,
        isPlaying: true,
        currentTime: state.currentTime >= maxTime ? 0 : state.currentTime,
      };
    }

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'SEEK': {
      const maxTime = state.project?.shots[state.currentShotIndex]?.duration ?? 0;
      return {
        ...state,
        currentTime: Math.max(0, Math.min(action.time, maxTime)),
      };
    }

    case 'SET_SPEED':
      return { ...state, playbackSpeed: action.speed };

    // ─── Selection ────────────────────────────────────────
    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.element };

    case 'DESELECT':
      return { ...state, selectedElement: null };

    // ─── Undo/Redo ────────────────────────────────────────
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const redoEntry: UndoEntry = {
        description: 'Redo',
        snapshot: captureSnapshot(state),
      };
      const undoEntry = state.undoStack[state.undoStack.length - 1];
      const newUndoStack = state.undoStack.slice(0, -1);
      const restored = undoEntry.snapshot;
      const rebuilt = rebuildProjectFromDsl(state, restored.dslText);
      return {
        ...state,
        ...rebuilt,
        currentShotIndex: restored.currentShotIndex,
        selectedElement: restored.selectedElement,
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, redoEntry],
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const undoEntry: UndoEntry = {
        description: 'Undo',
        snapshot: captureSnapshot(state),
      };
      const redoEntry = state.redoStack[state.redoStack.length - 1];
      const newRedoStack = state.redoStack.slice(0, -1);
      const restored = redoEntry.snapshot;
      const rebuilt = rebuildProjectFromDsl(state, restored.dslText);
      return {
        ...state,
        ...rebuilt,
        currentShotIndex: restored.currentShotIndex,
        selectedElement: restored.selectedElement,
        undoStack: [...state.undoStack, undoEntry],
        redoStack: newRedoStack,
      };
    }

    // ─── Zoom & View ──────────────────────────────────────
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(25, Math.min(200, action.zoom)) };

    case 'SET_TIMELINE_ZOOM':
      return {
        ...state,
        timelineZoom: Math.max(0.25, Math.min(4, action.zoom)),
      };

    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };

    // ─── Shot property update ─────────────────────────────
    case 'UPDATE_SHOT_PROPERTY': {
      if (!state.project) return state;
      const stateU = pushUndo(state, `Update ${action.key}`);
      const shots = [...state.project.shots];
      const shot = { ...shots[action.shotIndex] };
      (shot as Record<string, unknown>)[action.key] = action.value;
      shots[action.shotIndex] = shot;
      const newDslText = serializeShots(shots);
      return {
        ...stateU,
        project: { ...stateU.project!, shots },
        dslText: newDslText,
        ...(() => {
          const { errors, warnings } = tryParseDsl(newDslText);
          return { dslErrors: errors, dslWarnings: warnings };
        })(),
      };
    }

    // ─── Panel Layout ─────────────────────────────────────
    case 'UPDATE_PANEL_LAYOUT':
      return {
        ...state,
        panelLayout: { ...state.panelLayout, ...action.layout },
      };

    case 'TOGGLE_PANEL_COLLAPSE': {
      const collapsed = new Set(state.panelLayout.collapsedPanels);
      if (collapsed.has(action.panelId)) {
        collapsed.delete(action.panelId);
      } else {
        collapsed.add(action.panelId);
      }
      return {
        ...state,
        panelLayout: { ...state.panelLayout, collapsedPanels: collapsed },
      };
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  currentShot: DslShot | null;
  totalDuration: number;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const currentShot = useMemo(
    () => state.project?.shots[state.currentShotIndex] ?? null,
    [state.project, state.currentShotIndex],
  );

  const totalDuration = useMemo(() => {
    if (!state.project) return 0;
    return state.project.shots.reduce((sum, s) => sum + s.duration, 0);
  }, [state.project]);

  const value = useMemo(
    () => ({ state, dispatch, currentShot, totalDuration }),
    [state, dispatch, currentShot, totalDuration],
  );

  return (
    <EditorContext.Provider value={value}>
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

// ─── Re-exports for convenience ─────────────────────────────

export { DEMO_CHARACTERS, DEMO_SCENES } from '../../demo/demo-project';
export type { DemoCharacter, DemoScene } from '../../demo/demo-project';
