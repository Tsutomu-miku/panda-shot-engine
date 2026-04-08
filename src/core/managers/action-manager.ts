/**
 * Action Manager — CRUD for custom ActionDefinition, extending the built-in ACTION_LIBRARY
 */

import { ActionDefinition, ActionKeyframe } from '../skeleton/types';
import { ACTION_LIBRARY, getAction, getActionIds } from '../skeleton/action-library';

export interface ActionCreateInput {
  name: string;
  duration?: number;
  loop?: boolean;
  easing?: string;
  keyframes?: ActionKeyframe[];
}

export interface ActionUpdateInput {
  name?: string;
  duration?: number;
  loop?: boolean;
  easing?: string;
  keyframes?: ActionKeyframe[];
}

function generateActionId(name: string): string {
  return 'custom_' + name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') + '_' + Date.now().toString(36);
}

const DEFAULT_KEYFRAMES: ActionKeyframe[] = [
  { time: 0, boneStates: {} },
  { time: 1, boneStates: {} },
];

export class ActionManager {
  /**
   * Get all available actions (built-in + custom).
   */
  static getAllActions(customActions: ActionDefinition[]): ActionDefinition[] {
    const builtIn = getActionIds().map((id) => getAction(id)!);
    return [...builtIn, ...customActions];
  }

  /**
   * Get only built-in action IDs.
   */
  static getBuiltInIds(): string[] {
    return getActionIds();
  }

  /**
   * Check if an action ID is built-in (non-editable).
   */
  static isBuiltIn(actionId: string): boolean {
    return getActionIds().includes(actionId);
  }

  /**
   * Create a new custom action.
   */
  static create(
    customActions: ActionDefinition[],
    input: ActionCreateInput,
  ): { customActions: ActionDefinition[]; newAction: ActionDefinition } {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Action name is required');
    }

    // Check against both built-in and custom
    const allIds = [...getActionIds(), ...customActions.map((a) => a.id)];
    const allNames = [
      ...getActionIds().map((id) => getAction(id)!.name),
      ...customActions.map((a) => a.name),
    ];
    if (allNames.includes(input.name.trim())) {
      throw new Error(`Action "${input.name}" already exists`);
    }

    const newAction: ActionDefinition = {
      id: generateActionId(input.name),
      name: input.name.trim(),
      duration: input.duration ?? 1.0,
      loop: input.loop ?? false,
      easing: input.easing ?? 'ease-in-out',
      keyframes: input.keyframes ?? [...DEFAULT_KEYFRAMES],
    };

    return {
      customActions: [...customActions, newAction],
      newAction,
    };
  }

  /**
   * Update a custom action. Built-in actions cannot be updated.
   */
  static update(
    customActions: ActionDefinition[],
    actionId: string,
    input: ActionUpdateInput,
  ): ActionDefinition[] {
    if (ActionManager.isBuiltIn(actionId)) {
      throw new Error('Cannot modify built-in actions');
    }

    const idx = customActions.findIndex((a) => a.id === actionId);
    if (idx === -1) throw new Error(`Custom action "${actionId}" not found`);

    const updated = [...customActions];
    updated[idx] = {
      ...updated[idx],
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.duration !== undefined && { duration: Math.max(0.1, input.duration) }),
      ...(input.loop !== undefined && { loop: input.loop }),
      ...(input.easing !== undefined && { easing: input.easing }),
      ...(input.keyframes !== undefined && { keyframes: input.keyframes }),
    };
    return updated;
  }

  /**
   * Remove a custom action. Built-in actions cannot be removed.
   */
  static remove(customActions: ActionDefinition[], actionId: string): ActionDefinition[] {
    if (ActionManager.isBuiltIn(actionId)) {
      throw new Error('Cannot remove built-in actions');
    }
    return customActions.filter((a) => a.id !== actionId);
  }

  /**
   * Duplicate a custom action.
   */
  static duplicate(
    customActions: ActionDefinition[],
    actionId: string,
  ): { customActions: ActionDefinition[]; newAction: ActionDefinition } {
    // Can duplicate both built-in and custom
    const allActions = ActionManager.getAllActions(customActions);
    const original = allActions.find((a) => a.id === actionId);
    if (!original) throw new Error(`Action "${actionId}" not found`);

    let copyName = original.name + ' (副本)';
    let counter = 2;
    while (allActions.some((a) => a.name === copyName)) {
      copyName = `${original.name} (副本${counter})`;
      counter++;
    }

    const newAction: ActionDefinition = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateActionId(copyName),
      name: copyName,
    };

    return {
      customActions: [...customActions, newAction],
      newAction,
    };
  }

  /**
   * Add a keyframe to an action.
   */
  static addKeyframe(
    customActions: ActionDefinition[],
    actionId: string,
    keyframe: ActionKeyframe,
  ): ActionDefinition[] {
    if (ActionManager.isBuiltIn(actionId)) {
      throw new Error('Cannot modify built-in actions');
    }

    const idx = customActions.findIndex((a) => a.id === actionId);
    if (idx === -1) throw new Error(`Custom action "${actionId}" not found`);

    const updated = [...customActions];
    const action = { ...updated[idx] };
    const kfs = [...action.keyframes, keyframe].sort((a, b) => a.time - b.time);
    action.keyframes = kfs;
    updated[idx] = action;
    return updated;
  }

  /**
   * Remove a keyframe from an action by index.
   */
  static removeKeyframe(
    customActions: ActionDefinition[],
    actionId: string,
    keyframeIndex: number,
  ): ActionDefinition[] {
    if (ActionManager.isBuiltIn(actionId)) {
      throw new Error('Cannot modify built-in actions');
    }

    const idx = customActions.findIndex((a) => a.id === actionId);
    if (idx === -1) throw new Error(`Custom action "${actionId}" not found`);

    const updated = [...customActions];
    const action = { ...updated[idx] };
    if (action.keyframes.length <= 2) {
      throw new Error('Action must have at least 2 keyframes');
    }
    action.keyframes = action.keyframes.filter((_, i) => i !== keyframeIndex);
    updated[idx] = action;
    return updated;
  }

  /**
   * Get action IDs referenced in DSL text.
   */
  static getReferencedIds(dslText: string): Set<string> {
    const ids = new Set<string>();
    const regex = /action\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(dslText)) !== null) ids.add(m[1]);
    return ids;
  }
}
