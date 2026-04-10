// ============================================================
// panda-shot-engine — Complete Editor State Management
// useEditorState.ts — React Context + useReducer with Undo/Redo
// Now supports CharacterAsset, SceneAsset, AppearanceItem, etc.
// ============================================================

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  ReactNode,
} from 'react';

import { Shot as DslShot, DiagnosticMessage, serializeShot } from '../../core/dsl/types';
import { parseShots } from '../../core/dsl/parser';
import { serializeShot, serializeShots } from '../../core/dsl/serializer';
import { Validator } from '../../core/dsl/validator';
import type {
  CharacterAsset,
  SceneAsset,
  ExpressionSet,
  AppearanceItem,
  AppearancePreset,
} from '../../core/project/types';
import {
  FULL_DEMO_DSL,
  DEMO_CHARACTERS,
  DEMO_SCENES,
} from '../../demo/demo-project';

// ─── Re-export demo types for backward compat ───────────────

export { DEMO_CHARACTERS, DEMO_SCENES } from '../../demo/demo-project';

// Re-export DemoCharacter / DemoScene if demo-project still uses them
export type { CharacterAsset, SceneAsset } from '../../core/project/types';

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
  playbackTime: number;
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
  showManager: boolean;
  managerTab: string;
}

// ─── Project Model ──────────────────────────────────────────

export interface PandaProject {
  name: string;
  shots: RendererShot[];
  characters: CharacterAsset[];
  scenes: SceneAsset[];
}

// ─── Undo/Redo ──────────────────────────────────────────────

export interface UndoEntry {
  description: string;
  snapshot: {
    dslText: string;
    currentShotIndex: number;
    selectedElement: SelectedElement | null;
  };
}

export type RendererShot = DslShot & {
  dsl: string;
  label: string;
};

function captureSnapshot(state: EditorState): UndoEntry['snapshot'] {
  return {
    dslText: state.dslText,
    currentShotIndex: state.currentShotIndex,
    selectedElement: state.selectedElement,
  };
}

// ─── Action Types ───────────────────────────────────────────

export type EditorAction =
  | { type: 'SET_PROJECT'; project: Omit<PandaProject, 'shots'> & { shots: DslShot[] }; dslText: string }
  | { type: 'NEW_PROJECT' }
  | { type: 'SET_CURRENT_SHOT'; index: number }
  | { type: 'SELECT_SHOT'; index: number }
  | { type: 'ADD_SHOT'; afterIndex: number }
  | { type: 'ADD_SHOT'; shot: Partial<RendererShot> & { id: string; duration: number } }
  | { type: 'REMOVE_SHOT'; index: number }
  | { type: 'REMOVE_SHOT'; shotId: string }
  | { type: 'REORDER_SHOT'; fromIndex: number; toIndex: number }
  | { type: 'REORDER_SHOTS'; fromIndex: number; toIndex: number }
  | { type: 'DUPLICATE_SHOT'; index: number }
  | { type: 'SET_DSL_TEXT'; text: string }
  | { type: 'UPDATE_DSL'; text: string }
  | { type: 'PARSE_DSL' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SEEK'; time: number }
  | { type: 'SET_PLAYBACK_TIME'; time: number }
  | { type: 'STOP' }
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
  | { type: 'SET_PROJECT_NAME'; name: string }
  // Manager overlay
  | { type: 'SHOW_MANAGER'; tab?: string }
  | { type: 'HIDE_MANAGER' }
  | { type: 'SET_MANAGER_TAB'; tab: string }
  // Character management
  | { type: 'ADD_CHARACTER'; character: CharacterAsset }
  | { type: 'UPDATE_CHARACTER'; character: CharacterAsset }
  | { type: 'REMOVE_CHARACTER'; characterId: string }
  // Expression management
  | { type: 'SET_CHARACTER_EXPRESSION'; characterId: string; expressionName: string; expression: ExpressionSet }
  | { type: 'REMOVE_CHARACTER_EXPRESSION'; characterId: string; expressionName: string }
  // Appearance management
  | { type: 'ADD_APPEARANCE_ITEM'; characterId: string; item: AppearanceItem }
  | { type: 'UPDATE_APPEARANCE_ITEM'; characterId: string; item: AppearanceItem }
  | { type: 'REMOVE_APPEARANCE_ITEM'; characterId: string; itemId: string }
  | { type: 'ADD_APPEARANCE_PRESET'; characterId: string; preset: AppearancePreset }
  | { type: 'UPDATE_APPEARANCE_PRESET'; characterId: string; preset: AppearancePreset }
  | { type: 'REMOVE_APPEARANCE_PRESET'; characterId: string; presetId: string }
  | { type: 'SET_ACTIVE_PRESET'; characterId: string; presetId: string }
  // Scene management
  | { type: 'ADD_SCENE'; scene: SceneAsset }
  | { type: 'UPDATE_SCENE'; scene: SceneAsset }
  | { type: 'REMOVE_SCENE'; sceneId: string };

// ─── Helpers ────────────────────────────────────────────────

function tryParseDsl(text: string): {
  shots: DslShot[];
  errors: DiagnosticMessage[];
  warnings: DiagnosticMessage[];
} {
  try {
    const shots = parseShots(text);
    const validator = new Validator();
    const result = validator.validateAll(shots);
    return { shots, errors: result.errors, warnings: result.warnings };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const lineMatch = msg.match(/at (\d+):(\d+)/);
    const line = lineMatch ? parseInt(lineMatch[1], 10) : 1;
    const column = lineMatch ? parseInt(lineMatch[2], 10) : 1;
    return { shots: [], errors: [{ line, column, message: msg, severity: 'error' }], warnings: [] };
  }
}

function normalizeShotsWithDsl(shots: DslShot[], dslText: string): RendererShot[] {
  const shotTexts = dslText
    .split(/\n(?=shot ")/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.startsWith('shot "'));

  return shots.map((shot, index) => ({
    ...shot,
    dsl: shotTexts[index] ?? serializeShot(shot),
    label: shot.id,
  }));
}

function rebuildProjectFromDsl(state: EditorState, dslText: string): Partial<EditorState> {
  const { shots, errors, warnings } = tryParseDsl(dslText);
  const shotsWithDsl = normalizeShotsWithDsl(shots, dslText);

  const project: PandaProject = {
    name: state.project?.name ?? 'Untitled Project',
    shots: shotsWithDsl,
    characters: state.project?.characters ?? [...DEMO_CHARACTERS],
    scenes: state.project?.scenes ?? [...DEMO_SCENES],
  };
  return {
    project,
    dslText,
    dslErrors: errors,
    dslWarnings: warnings,
    currentShotIndex: Math.min(state.currentShotIndex, Math.max(0, shotsWithDsl.length - 1)),
  };
}

// ─── Helper: update a character in the project ──────────────

function updateCharInProject(state: EditorState, charId: string, updater: (c: CharacterAsset) => CharacterAsset): EditorState {
  if (!state.project) return state;
  const characters = state.project.characters.map((c) =>
    c.id === charId ? updater(c) : c,
  );
  return { ...state, project: { ...state.project, characters } };
}

// ─── Initial State ──────────────────────────────────────────

function createInitialState(): EditorState {
  const dslText = FULL_DEMO_DSL;
  const { shots, errors, warnings } = tryParseDsl(dslText);
  const normalizedShots = normalizeShotsWithDsl(shots, dslText);

  const project: PandaProject = {
    name: 'Panda Shot Engine — 客栈相遇',
    shots: normalizedShots,
    characters: [...DEMO_CHARACTERS],
    scenes: [...DEMO_SCENES],
  };

  return {
    project,
    currentShotIndex: 0,
    playbackTime: 0,
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
    showManager: false,
    managerTab: 'characters',
  };
}

const initialState = createInitialState();

// ─── Reducer ────────────────────────────────────────────────

function pushUndo(state: EditorState, description: string): EditorState {
  const entry: UndoEntry = { description, snapshot: captureSnapshot(state) };
  return { ...state, undoStack: [...state.undoStack.slice(-49), entry], redoStack: [] };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {

    // ─── Project ──────────────────────────────────────────
    case 'SET_PROJECT':
      return { ...state, project: action.project, dslText: action.dslText,
        currentShotIndex: 0, playbackTime: 0, selectedElement: null,
        ...rebuildProjectFromDsl(state, action.dslText) };

    case 'NEW_PROJECT': {
      const newDsl = `shot "新镜头_001":\n  duration: 5s\n  set: "inn_interior"\n\n  at 0s:\n    camera wide\n\n  transition: cut`;
      const s = pushUndo(state, 'New Project');
      return { ...s, ...rebuildProjectFromDsl(s, newDsl), playbackTime: 0, selectedElement: null };
    }

    case 'SET_PROJECT_NAME':
      if (!state.project) return state;
      return { ...state, project: { ...state.project, name: action.name } };

    // ─── Shot nav ─────────────────────────────────────────
    case 'SET_CURRENT_SHOT': {
      const max = (state.project?.shots.length ?? 1) - 1;
      return { ...state, currentShotIndex: Math.max(0, Math.min(action.index, max)),
        playbackTime: 0, selectedElement: null };
    }

    case 'SELECT_SHOT': {
      const max = (state.project?.shots.length ?? 1) - 1;
      return {
        ...state,
        currentShotIndex: Math.max(0, Math.min(action.index, max)),
        playbackTime: 0,
      };
    }

    case 'ADD_SHOT': {
      if (!state.project) return state;
      if ('shot' in action) {
        const shots = [...state.project.shots, action.shot as RendererShot];
        return {
          ...state,
          project: { ...state.project, shots },
          currentShotIndex: shots.length - 1,
          playbackTime: 0,
        };
      }
      const s = pushUndo(state, 'Add Shot');
      const num = state.project.shots.length + 1;
      const newDsl = s.dslText + `\n\nshot "新镜头_${String(num).padStart(3, '0')}":\n  duration: 5s\n  set: "inn_interior"\n\n  at 0s:\n    camera wide\n\n  transition: cut`;
      return { ...s, ...rebuildProjectFromDsl(s, newDsl), currentShotIndex: action.afterIndex + 1, playbackTime: 0 };
    }

    case 'REMOVE_SHOT': {
      if (!state.project || state.project.shots.length <= 1) return state;
      if ('shotId' in action) {
        const shots = state.project.shots.filter((shot) => shot.id !== action.shotId);
        return {
          ...state,
          project: { ...state.project, shots },
          currentShotIndex: Math.min(state.currentShotIndex, Math.max(0, shots.length - 1)),
          playbackTime: 0,
        };
      }
      const s = pushUndo(state, 'Remove Shot');
      const shots = [...state.project.shots];
      shots.splice(action.index, 1);
      const newDsl = serializeShots(shots);
      return { ...s, ...rebuildProjectFromDsl(s, newDsl),
        currentShotIndex: Math.min(s.currentShotIndex, Math.max(0, shots.length - 1)), playbackTime: 0 };
    }

    case 'REORDER_SHOT': {
      if (!state.project) return state;
      const s = pushUndo(state, 'Reorder Shot');
      const shots = [...state.project.shots];
      const [moved] = shots.splice(action.fromIndex, 1);
      shots.splice(action.toIndex, 0, moved);
      return { ...s, ...rebuildProjectFromDsl(s, serializeShots(shots)), currentShotIndex: action.toIndex };
    }

    case 'REORDER_SHOTS': {
      if (!state.project) return state;
      const shots = [...state.project.shots];
      const [moved] = shots.splice(action.fromIndex, 1);
      shots.splice(action.toIndex, 0, moved);
      return {
        ...state,
        project: { ...state.project, shots },
        currentShotIndex: action.toIndex,
      };
    }

    case 'DUPLICATE_SHOT': {
      if (!state.project) return state;
      const s = pushUndo(state, 'Duplicate Shot');
      const shots = [...state.project.shots];
      const orig = shots[action.index];
      if (!orig) return state;
      const dup: DslShot = { ...JSON.parse(JSON.stringify(orig)), id: orig.id + '_copy' };
      shots.splice(action.index + 1, 0, dup);
      return { ...s, ...rebuildProjectFromDsl(s, serializeShots(shots)), currentShotIndex: action.index + 1 };
    }

    // ─── DSL ──────────────────────────────────────────────
    case 'SET_DSL_TEXT':
      return { ...state, dslText: action.text };

    case 'UPDATE_DSL':
      return { ...state, dslText: action.text };

    case 'PARSE_DSL': {
      const s = pushUndo(state, 'Edit DSL');
      return { ...s, ...rebuildProjectFromDsl(s, s.dslText) };
    }

    // ─── Playback ─────────────────────────────────────────
    case 'PLAY': return { ...state, isPlaying: true };
    case 'PAUSE': return { ...state, isPlaying: false };
    case 'TOGGLE_PLAY': return { ...state, isPlaying: !state.isPlaying };
    case 'STOP': return { ...state, isPlaying: false, playbackTime: 0 };
    case 'SEEK': {
      const max = state.project?.shots[state.currentShotIndex]?.duration ?? 0;
      return { ...state, playbackTime: Math.max(0, Math.min(action.time, max)) };
    }
    case 'SET_PLAYBACK_TIME': {
      const max = state.project?.shots[state.currentShotIndex]?.duration ?? 0;
      return { ...state, playbackTime: Math.max(0, Math.min(action.time, max)) };
    }
    case 'SET_SPEED': return { ...state, playbackSpeed: action.speed };

    // ─── Selection ────────────────────────────────────────
    case 'SELECT_ELEMENT': return { ...state, selectedElement: action.element };
    case 'DESELECT': return { ...state, selectedElement: null };

    // ─── Undo/Redo ────────────────────────────────────────
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const redo: UndoEntry = { description: 'Redo', snapshot: captureSnapshot(state) };
      const entry = state.undoStack[state.undoStack.length - 1];
      const rebuilt = rebuildProjectFromDsl(state, entry.snapshot.dslText);
      return { ...state, ...rebuilt, currentShotIndex: entry.snapshot.currentShotIndex,
        selectedElement: entry.snapshot.selectedElement,
        undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, redo] };
    }
    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const undo: UndoEntry = { description: 'Undo', snapshot: captureSnapshot(state) };
      const entry = state.redoStack[state.redoStack.length - 1];
      const rebuilt = rebuildProjectFromDsl(state, entry.snapshot.dslText);
      return { ...state, ...rebuilt, currentShotIndex: entry.snapshot.currentShotIndex,
        selectedElement: entry.snapshot.selectedElement,
        undoStack: [...state.undoStack, undo], redoStack: state.redoStack.slice(0, -1) };
    }

    // ─── Zoom & View ──────────────────────────────────────
    case 'SET_ZOOM': return { ...state, zoom: Math.max(25, Math.min(200, action.zoom)) };
    case 'SET_TIMELINE_ZOOM': return { ...state, timelineZoom: Math.max(0.25, Math.min(4, action.zoom)) };
    case 'SET_VIEW_MODE': return { ...state, viewMode: action.mode };

    case 'UPDATE_SHOT_PROPERTY': {
      if (!state.project) return state;
      const s = pushUndo(state, `Update ${action.key}`);
      const shots = [...state.project.shots];
      const shot = { ...shots[action.shotIndex] };
      (shot as Record<string, unknown>)[action.key] = action.value;
      shots[action.shotIndex] = shot;
      const newDsl = serializeShots(shots);
      const { errors, warnings } = tryParseDsl(newDsl);
      return { ...s, project: { ...s.project!, shots }, dslText: newDsl, dslErrors: errors, dslWarnings: warnings };
    }

    case 'UPDATE_PANEL_LAYOUT':
      return { ...state, panelLayout: { ...state.panelLayout, ...action.layout } };

    case 'TOGGLE_PANEL_COLLAPSE': {
      const collapsed = new Set(state.panelLayout.collapsedPanels);
      collapsed.has(action.panelId) ? collapsed.delete(action.panelId) : collapsed.add(action.panelId);
      return { ...state, panelLayout: { ...state.panelLayout, collapsedPanels: collapsed } };
    }

    // ─── Manager overlay ──────────────────────────────────
    case 'SHOW_MANAGER':
      return { ...state, showManager: true, managerTab: action.tab ?? state.managerTab };
    case 'HIDE_MANAGER':
      return { ...state, showManager: false };
    case 'SET_MANAGER_TAB':
      return { ...state, managerTab: action.tab };

    // ─── Character CRUD ───────────────────────────────────
    case 'ADD_CHARACTER': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        characters: [...state.project.characters, action.character] } };
    }
    case 'UPDATE_CHARACTER': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        characters: state.project.characters.map((c) =>
          c.id === action.character.id ? action.character : c) } };
    }
    case 'REMOVE_CHARACTER': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        characters: state.project.characters.filter((c) => c.id !== action.characterId) } };
    }

    // ─── Expression management ────────────────────────────
    case 'SET_CHARACTER_EXPRESSION':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        expressions: { ...c.expressions, [action.expressionName]: action.expression },
      }));

    case 'REMOVE_CHARACTER_EXPRESSION':
      return updateCharInProject(state, action.characterId, (c) => {
        const expressions = { ...c.expressions };
        delete expressions[action.expressionName];
        return { ...c, expressions };
      });

    // ─── Appearance Item CRUD ─────────────────────────────
    case 'ADD_APPEARANCE_ITEM':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearanceItems: [...c.appearanceItems, action.item],
      }));

    case 'UPDATE_APPEARANCE_ITEM':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearanceItems: c.appearanceItems.map((i) =>
          i.id === action.item.id ? action.item : i),
      }));

    case 'REMOVE_APPEARANCE_ITEM':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearanceItems: c.appearanceItems.filter((i) => i.id !== action.itemId),
        // Also remove from all presets
        appearancePresets: c.appearancePresets.map((p) => ({
          ...p,
          itemIds: p.itemIds.filter((id) => id !== action.itemId),
        })),
      }));

    // ─── Appearance Preset CRUD ───────────────────────────
    case 'ADD_APPEARANCE_PRESET':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearancePresets: [...c.appearancePresets, action.preset],
        activePresetId: c.activePresetId ?? action.preset.id,
      }));

    case 'UPDATE_APPEARANCE_PRESET':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearancePresets: c.appearancePresets.map((p) =>
          p.id === action.preset.id ? action.preset : p),
      }));

    case 'REMOVE_APPEARANCE_PRESET':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        appearancePresets: c.appearancePresets.filter((p) => p.id !== action.presetId),
        activePresetId: c.activePresetId === action.presetId ? undefined : c.activePresetId,
      }));

    case 'SET_ACTIVE_PRESET':
      return updateCharInProject(state, action.characterId, (c) => ({
        ...c,
        activePresetId: action.presetId,
      }));

    // ─── Scene CRUD ───────────────────────────────────────
    case 'ADD_SCENE': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        scenes: [...state.project.scenes, action.scene] } };
    }
    case 'UPDATE_SCENE': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        scenes: state.project.scenes.map((s) =>
          s.id === action.scene.id ? action.scene : s) } };
    }
    case 'REMOVE_SCENE': {
      if (!state.project) return state;
      return { ...state, project: { ...state.project,
        scenes: state.project.scenes.filter((s) => s.id !== action.sceneId) } };
    }

    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  currentShot: RendererShot | null;
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

  return React.createElement(EditorContext.Provider, { value }, children);
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within an EditorProvider');
  return ctx;
}
