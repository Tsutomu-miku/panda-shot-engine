/**
 * Editor State Management — useReducer + Context with Undo/Redo
 * 
 * Uses image-based CharacterAsset and SceneAsset types.
 */

import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { CharacterAsset, SceneAsset, DslShot, PandaProject, ExpressionSet } from '../../core/project/types';
import { ActionDefinition } from '../../core/skeleton/types';
import { createDemoProject } from '../../demo/demo-project';

// Re-export types for convenience
export type { CharacterAsset, SceneAsset, DslShot, PandaProject, ExpressionSet };

// ─── Selection ──────────────────────────────────────────────

export interface SelectedElement {
  type: 'character' | 'scene' | 'bone' | 'keyframe' | 'action' | 'expression';
  shotIndex: number;
  id: string;
  /** For expression selection: the parent character ID */
  parentId?: string;
}

// ─── Editor State ───────────────────────────────────────────

export interface EditorState {
  project: PandaProject;
  currentShotIndex: number;
  dslText: string;
  selectedElement: SelectedElement | null;
  isPlaying: boolean;
  playbackTime: number;
  zoom: number;
  showGrid: boolean;
  showBones: boolean;
  /** Undo stack */
  undoStack: PandaProject[];
  /** Redo stack */
  redoStack: PandaProject[];
}

// ─── Actions ────────────────────────────────────────────────

export type EditorAction =
  // Project
  | { type: 'LOAD_PROJECT'; project: PandaProject }
  | { type: 'SET_PROJECT_NAME'; name: string }
  // Shot management
  | { type: 'SELECT_SHOT'; index: number }
  | { type: 'ADD_SHOT'; shot: DslShot }
  | { type: 'UPDATE_SHOT'; shotId: string; updates: Partial<DslShot> }
  | { type: 'REMOVE_SHOT'; shotId: string }
  | { type: 'REORDER_SHOTS'; fromIndex: number; toIndex: number }
  // DSL
  | { type: 'UPDATE_DSL'; text: string }
  // Selection
  | { type: 'SELECT_ELEMENT'; element: SelectedElement }
  | { type: 'DESELECT' }
  // Playback
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_PLAYBACK_TIME'; time: number }
  | { type: 'STOP' }
  // View
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_BONES' }
  // Character CRUD (image-based)
  | { type: 'ADD_CHARACTER'; character: CharacterAsset }
  | { type: 'UPDATE_CHARACTER'; charId: string; updates: Partial<CharacterAsset> }
  | { type: 'UPDATE_CHARACTER_PART'; charId: string; partKey: string; imageData: string }
  | { type: 'REMOVE_CHARACTER_PART'; charId: string; partKey: string }
  | { type: 'REMOVE_CHARACTER'; charId: string }
  | { type: 'DUPLICATE_CHARACTER'; charId: string }
  | { type: 'SET_CHARACTER_THUMBNAIL'; charId: string; imageData: string }
  // Expression CRUD (image sticker based)
  | { type: 'ADD_EXPRESSION'; charId: string; expression: ExpressionSet }
  | { type: 'UPDATE_EXPRESSION'; charId: string; exprId: string; updates: Partial<ExpressionSet> }
  | { type: 'UPDATE_EXPRESSION_SLOT'; charId: string; exprId: string; slot: 'eyesImage' | 'mouthImage' | 'eyebrowImage' | 'overlayImage'; imageData: string | null }
  | { type: 'REMOVE_EXPRESSION'; charId: string; exprId: string }
  | { type: 'DUPLICATE_EXPRESSION'; charId: string; exprId: string }
  // Scene CRUD
  | { type: 'ADD_SCENE'; scene: SceneAsset }
  | { type: 'UPDATE_SCENE'; sceneId: string; updates: Partial<SceneAsset> }
  | { type: 'REMOVE_SCENE'; sceneId: string }
  | { type: 'DUPLICATE_SCENE'; sceneId: string }
  | { type: 'SET_SCENE_BACKGROUND'; sceneId: string; imageData: string | null }
  // Action CRUD
  | { type: 'ADD_CUSTOM_ACTION'; action: ActionDefinition }
  | { type: 'UPDATE_CUSTOM_ACTION'; actionId: string; updates: Partial<ActionDefinition> }
  | { type: 'REMOVE_CUSTOM_ACTION'; actionId: string }
  | { type: 'DUPLICATE_CUSTOM_ACTION'; actionId: string }
  // Undo/Redo
  | { type: 'UNDO' }
  | { type: 'REDO' };

// ─── Helpers ────────────────────────────────────────────────

const MAX_UNDO = 50;

function pushUndo(state: EditorState): { undoStack: PandaProject[]; redoStack: PandaProject[] } {
  const stack = [...state.undoStack, JSON.parse(JSON.stringify(state.project))];
  if (stack.length > MAX_UNDO) stack.shift();
  return { undoStack: stack, redoStack: [] };
}

function updateCharacter(characters: CharacterAsset[], charId: string, fn: (c: CharacterAsset) => CharacterAsset): CharacterAsset[] {
  return characters.map((c) => c.id === charId ? fn(c) : c);
}

// ─── Reducer ────────────────────────────────────────────────

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    // ── Project ──
    case 'LOAD_PROJECT':
      return {
        ...state,
        project: action.project,
        currentShotIndex: 0,
        dslText: action.project.shots[0]?.dsl ?? '',
        undoStack: [],
        redoStack: [],
      };

    case 'SET_PROJECT_NAME':
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, name: action.name },
      };

    // ── Shot ──
    case 'SELECT_SHOT': {
      const shot = state.project.shots[action.index];
      return {
        ...state,
        currentShotIndex: action.index,
        dslText: shot?.dsl ?? '',
        selectedElement: null,
      };
    }

    case 'ADD_SHOT':
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, shots: [...state.project.shots, action.shot] },
      };

    case 'UPDATE_SHOT': {
      const shots = state.project.shots.map((s) =>
        s.id === action.shotId ? { ...s, ...action.updates } : s,
      );
      const idx = shots.findIndex((s) => s.id === action.shotId);
      const newDsl = idx === state.currentShotIndex && action.updates.dsl !== undefined
        ? action.updates.dsl
        : state.dslText;
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, shots },
        dslText: newDsl,
      };
    }

    case 'REMOVE_SHOT': {
      const shots = state.project.shots.filter((s) => s.id !== action.shotId);
      const newIdx = Math.min(state.currentShotIndex, shots.length - 1);
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, shots },
        currentShotIndex: Math.max(0, newIdx),
        dslText: shots[Math.max(0, newIdx)]?.dsl ?? '',
      };
    }

    case 'REORDER_SHOTS': {
      const shots = [...state.project.shots];
      const [moved] = shots.splice(action.fromIndex, 1);
      shots.splice(action.toIndex, 0, moved);
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, shots },
      };
    }

    // ── DSL ──
    case 'UPDATE_DSL': {
      const shots = state.project.shots.map((s, i) =>
        i === state.currentShotIndex ? { ...s, dsl: action.text } : s,
      );
      return {
        ...state,
        project: { ...state.project, shots },
        dslText: action.text,
      };
    }

    // ── Selection ──
    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.element };
    case 'DESELECT':
      return { ...state, selectedElement: null };

    // ── Playback ──
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SET_PLAYBACK_TIME':
      return { ...state, playbackTime: action.time };
    case 'STOP':
      return { ...state, isPlaying: false, playbackTime: 0 };

    // ── View ──
    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.1, Math.min(4, action.zoom)) };
    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };
    case 'TOGGLE_BONES':
      return { ...state, showBones: !state.showBones };

    // ── Character CRUD ──
    case 'ADD_CHARACTER':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: [...state.project.characters, action.character],
        },
      };

    case 'UPDATE_CHARACTER':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => ({
            ...c,
            ...action.updates,
          })),
        },
      };

    case 'UPDATE_CHARACTER_PART':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => ({
            ...c,
            parts: { ...c.parts, [action.partKey]: action.imageData },
          })),
        },
      };

    case 'REMOVE_CHARACTER_PART':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => {
            const parts = { ...c.parts };
            delete parts[action.partKey];
            return { ...c, parts };
          }),
        },
      };

    case 'REMOVE_CHARACTER':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: state.project.characters.filter((c) => c.id !== action.charId),
        },
      };

    case 'DUPLICATE_CHARACTER': {
      const orig = state.project.characters.find((c) => c.id === action.charId);
      if (!orig) return state;
      let copyName = orig.name + ' (Copy)';
      let counter = 2;
      while (state.project.characters.some((c) => c.name === copyName)) {
        copyName = `${orig.name} (Copy ${counter++})`;
      }
      const dup: CharacterAsset = {
        ...JSON.parse(JSON.stringify(orig)),
        id: orig.id + '_copy_' + Date.now().toString(36),
        name: copyName,
      };
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: [...state.project.characters, dup],
        },
      };
    }

    case 'SET_CHARACTER_THUMBNAIL':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => ({
            ...c,
            thumbnail: action.imageData,
          })),
        },
      };

    // ── Expression CRUD ──
    case 'ADD_EXPRESSION': {
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => ({
            ...c,
            expressions: { ...c.expressions, [action.expression.id]: action.expression },
          })),
        },
      };
    }

    case 'UPDATE_EXPRESSION':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => ({
            ...c,
            expressions: {
              ...c.expressions,
              [action.exprId]: { ...c.expressions[action.exprId], ...action.updates },
            },
          })),
        },
      };

    case 'UPDATE_EXPRESSION_SLOT':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => {
            const expr = c.expressions[action.exprId];
            if (!expr) return c;
            const updatedExpr = { ...expr };
            if (action.imageData === null) {
              delete (updatedExpr as any)[action.slot];
            } else {
              (updatedExpr as any)[action.slot] = action.imageData;
            }
            return { ...c, expressions: { ...c.expressions, [action.exprId]: updatedExpr } };
          }),
        },
      };

    case 'REMOVE_EXPRESSION':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => {
            const exprs = { ...c.expressions };
            delete exprs[action.exprId];
            return { ...c, expressions: exprs };
          }),
        },
      };

    case 'DUPLICATE_EXPRESSION': {
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          characters: updateCharacter(state.project.characters, action.charId, (c) => {
            const orig = c.expressions[action.exprId];
            if (!orig) return c;
            let copyName = orig.name + ' (Copy)';
            let counter = 2;
            const existing = Object.values(c.expressions);
            while (existing.some((e) => e.name === copyName)) {
              copyName = `${orig.name} (Copy ${counter++})`;
            }
            const newId = orig.id + '_copy_' + Date.now().toString(36);
            const dup: ExpressionSet = { ...JSON.parse(JSON.stringify(orig)), id: newId, name: copyName };
            return { ...c, expressions: { ...c.expressions, [newId]: dup } };
          }),
        },
      };
    }

    // ── Scene CRUD ──
    case 'ADD_SCENE':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          scenes: [...state.project.scenes, action.scene],
        },
      };

    case 'UPDATE_SCENE':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          scenes: state.project.scenes.map((s) =>
            s.id === action.sceneId ? { ...s, ...action.updates } : s,
          ),
        },
      };

    case 'REMOVE_SCENE':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          scenes: state.project.scenes.filter((s) => s.id !== action.sceneId),
        },
      };

    case 'DUPLICATE_SCENE': {
      const orig = state.project.scenes.find((s) => s.id === action.sceneId);
      if (!orig) return state;
      let copyName = orig.name + ' (Copy)';
      let counter = 2;
      while (state.project.scenes.some((s) => s.name === copyName)) {
        copyName = `${orig.name} (Copy ${counter++})`;
      }
      const dup: SceneAsset = {
        ...JSON.parse(JSON.stringify(orig)),
        id: orig.id + '_copy_' + Date.now().toString(36),
        name: copyName,
      };
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, scenes: [...state.project.scenes, dup] },
      };
    }

    case 'SET_SCENE_BACKGROUND':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          scenes: state.project.scenes.map((s) =>
            s.id === action.sceneId
              ? { ...s, backgroundImage: action.imageData ?? undefined }
              : s,
          ),
        },
      };

    // ── Custom Action CRUD ──
    case 'ADD_CUSTOM_ACTION':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          customActions: [...state.project.customActions, action.action],
        },
      };

    case 'UPDATE_CUSTOM_ACTION':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          customActions: state.project.customActions.map((a) =>
            a.id === action.actionId ? { ...a, ...action.updates } : a,
          ),
        },
      };

    case 'REMOVE_CUSTOM_ACTION':
      return {
        ...state,
        ...pushUndo(state),
        project: {
          ...state.project,
          customActions: state.project.customActions.filter((a) => a.id !== action.actionId),
        },
      };

    case 'DUPLICATE_CUSTOM_ACTION': {
      const orig = state.project.customActions.find((a) => a.id === action.actionId);
      if (!orig) return state;
      let copyName = orig.name + ' (Copy)';
      let counter = 2;
      while (state.project.customActions.some((a) => a.name === copyName)) {
        copyName = `${orig.name} (Copy ${counter++})`;
      }
      const dup: ActionDefinition = {
        ...JSON.parse(JSON.stringify(orig)),
        id: 'custom_copy_' + Date.now().toString(36),
        name: copyName,
      };
      return {
        ...state,
        ...pushUndo(state),
        project: { ...state.project, customActions: [...state.project.customActions, dup] },
      };
    }

    // ── Undo/Redo ──
    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const prev = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        project: prev,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, JSON.parse(JSON.stringify(state.project))],
        dslText: prev.shots[state.currentShotIndex]?.dsl ?? '',
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        project: next,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, JSON.parse(JSON.stringify(state.project))],
        dslText: next.shots[state.currentShotIndex]?.dsl ?? '',
      };
    }

    default:
      return state;
  }
}

// ─── Initial State ──────────────────────────────────────────

const demoProject = createDemoProject();

const initialState: EditorState = {
  project: demoProject,
  currentShotIndex: 0,
  dslText: demoProject.shots[0]?.dsl ?? '',
  selectedElement: null,
  isPlaying: false,
  playbackTime: 0,
  zoom: 1,
  showGrid: true,
  showBones: true,
  undoStack: [],
  redoStack: [],
};

// ─── Context ────────────────────────────────────────────────

interface EditorContextValue {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const EditorContext = createContext<EditorContextValue | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor must be used within EditorProvider');
  return ctx;
}
