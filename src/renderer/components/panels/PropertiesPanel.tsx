// ============================================================
// panda-shot-engine — Properties Panel
// Context-sensitive property editor for shots, characters,
// timeline events, and camera commands.
// ============================================================

import React, { useCallback, useMemo, useState } from 'react';
import {
  useEditor,
  SelectedElement,
  DEMO_CHARACTERS,
  DEMO_SCENES,
} from '../../hooks/useEditorState';
import {
  Shot,
  Command,
  PlaceCommand,
  CameraCommand,
  ActionCommand,
  ExpressionCommand,
  SayCommand,
  MoveCommand,
  EnterCommand,
  SfxCommand,
  VfxCommand,
  SemanticPosition,
  FacingDirection,
  CameraType,
  CameraMotion,
  TransitionType,
  TimelineEvent,
  SEMANTIC_POSITIONS,
  CAMERA_TYPES,
  CAMERA_MOTIONS,
  TRANSITION_TYPES,
  FACING_DIRECTIONS,
} from '../../../core/dsl/types';
import { serializeShots } from '../../../core/dsl/serializer';

// ─── Reusable Field Components ──────────────────────────────

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  hint?: string;
}

function FieldRow({ label, children, hint }: FieldRowProps) {
  return (
    <div className="prop-field-row">
      <label className="prop-field-label">{label}</label>
      <div className="prop-field-value">{children}</div>
      {hint && <span className="prop-field-hint">{hint}</span>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  hint?: string;
}

function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
  return (
    <FieldRow label={label} hint={hint}>
      <select
        className="prop-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FieldRow>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  unit,
  hint,
}: NumberFieldProps) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="prop-number-field">
        <input
          className="prop-number-input"
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && <span className="prop-number-unit">{unit}</span>}
      </div>
    </FieldRow>
  );
}

interface SliderFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  hint?: string;
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit,
  hint,
}: SliderFieldProps) {
  return (
    <FieldRow label={label} hint={hint}>
      <div className="prop-slider-field">
        <input
          className="prop-slider"
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value))}
        />
        <span className="prop-slider-value">
          {value}
          {unit ?? ''}
        </span>
      </div>
    </FieldRow>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  multiline?: boolean;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  multiline,
}: TextFieldProps) {
  return (
    <FieldRow label={label} hint={hint}>
      {multiline ? (
        <textarea
          className="prop-textarea"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          className="prop-text-input"
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </FieldRow>
  );
}

// ─── Section Header ─────────────────────────────────────────

function SectionHeader({
  title,
  icon,
  color,
}: {
  title: string;
  icon: string;
  color?: string;
}) {
  return (
    <div className="prop-section-header" style={color ? { borderColor: color } : undefined}>
      <span className="prop-section-icon">{icon}</span>
      <span className="prop-section-title">{title}</span>
    </div>
  );
}

// ─── Helper: clone shot array and mutate ────────────────────

function useShotMutator() {
  const { state, dispatch } = useEditor();

  const mutateShot = useCallback(
    (shotIndex: number, mutator: (shot: Shot) => Shot) => {
      if (!state.project) return;
      const shots = state.project.shots.map((s, i) =>
        i === shotIndex ? mutator(JSON.parse(JSON.stringify(s)) as Shot) : s,
      );
      const newDslText = serializeShots(shots);
      dispatch({ type: 'SET_DSL_TEXT', text: newDslText });
      // Trigger parse so the state updates
      setTimeout(() => dispatch({ type: 'PARSE_DSL' }), 0);
    },
    [state.project, dispatch],
  );

  return mutateShot;
}

// ─── Shot Properties ────────────────────────────────────────

function ShotProperties({ shot, shotIndex }: { shot: Shot; shotIndex: number }) {
  const mutateShot = useShotMutator();

  const sceneOptions = useMemo(
    () =>
      DEMO_SCENES.map((s) => ({
        value: s.id,
        label: `${s.id} — ${s.id.replace(/_/g, ' ')}`,
      })),
    [],
  );

  const transitionOptions = useMemo(
    () =>
      Array.from(TRANSITION_TYPES).map((t) => ({
        value: t,
        label: t,
      })),
    [],
  );

  return (
    <div className="prop-section">
      <SectionHeader title="Shot Properties" icon="S" color="#64b5f6" />

      <TextField
        label="ID"
        value={shot.id}
        onChange={(val) =>
          mutateShot(shotIndex, (s) => ({ ...s, id: val }))
        }
        hint="Unique shot identifier"
      />

      <NumberField
        label="Duration"
        value={shot.duration}
        onChange={(val) =>
          mutateShot(shotIndex, (s) => ({ ...s, duration: Math.max(0.5, val) }))
        }
        min={0.5}
        max={120}
        step={0.5}
        unit="s"
        hint="Total shot length"
      />

      <SelectField
        label="Set / Scene"
        value={shot.set}
        options={sceneOptions}
        onChange={(val) =>
          mutateShot(shotIndex, (s) => ({ ...s, set: val }))
        }
        hint="Background scene"
      />

      <SelectField
        label="Transition"
        value={shot.transition?.type ?? 'cut'}
        options={transitionOptions}
        onChange={(val) =>
          mutateShot(shotIndex, (s) => ({
            ...s,
            transition: { ...s.transition, type: val as TransitionType },
          }))
        }
      />

      {shot.transition?.type !== 'cut' && (
        <NumberField
          label="Trans Duration"
          value={shot.transition?.duration ?? 1}
          onChange={(val) =>
            mutateShot(shotIndex, (s) => ({
              ...s,
              transition: { ...s.transition, duration: val },
            }))
          }
          min={0.1}
          max={10}
          step={0.1}
          unit="s"
        />
      )}

      <div className="prop-info-block">
        <div className="prop-info-item">
          <span className="prop-info-label">Placements</span>
          <span className="prop-info-value">{shot.placements.length}</span>
        </div>
        <div className="prop-info-item">
          <span className="prop-info-label">Timeline Events</span>
          <span className="prop-info-value">{shot.timeline.length}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Character Placement Properties ─────────────────────────

function CharacterPlacementProperties({
  shot,
  shotIndex,
  placementId,
}: {
  shot: Shot;
  shotIndex: number;
  placementId: string;
}) {
  const mutateShot = useShotMutator();

  const placement = useMemo(
    () => shot.placements.find((p) => p.character === placementId),
    [shot.placements, placementId],
  );

  if (!placement) {
    return (
      <div className="prop-section">
        <SectionHeader title="Character Placement" icon="C" color="#66bb6a" />
        <div className="prop-empty">Placement not found: {placementId}</div>
      </div>
    );
  }

  const positionOptions = Array.from(SEMANTIC_POSITIONS).map((p) => ({
    value: p,
    label: p,
  }));

  const facingOptions = Array.from(FACING_DIRECTIONS).map((f) => ({
    value: f,
    label: f === 'left' ? 'Left' : 'Right',
  }));

  const charInfo = DEMO_CHARACTERS.find((c) => c.name === placement.character || c.id === placement.character);

  const mutatePlacement = (updater: (p: PlaceCommand) => PlaceCommand) => {
    mutateShot(shotIndex, (s) => ({
      ...s,
      placements: s.placements.map((p) =>
        p.character === placementId ? updater({ ...p }) : p,
      ),
    }));
  };

  return (
    <div className="prop-section">
      <SectionHeader title="Character Placement" icon="C" color="#66bb6a" />

      {charInfo && (
        <div className="prop-char-badge" style={{ borderColor: charInfo.color }}>
          <span
            className="prop-char-dot"
            style={{ backgroundColor: charInfo.color }}
          />
          <span className="prop-char-name">{charInfo.name}</span>
          <span className="prop-char-desc">{charInfo.description}</span>
        </div>
      )}

      <TextField
        label="Character"
        value={placement.character}
        onChange={(val) => mutatePlacement((p) => ({ ...p, character: val }))}
      />

      <SelectField
        label="Position"
        value={placement.position?.semantic ?? 'center'}
        options={positionOptions}
        onChange={(val) =>
          mutatePlacement((p) => ({
            ...p,
            position: { ...p.position, semantic: val as SemanticPosition },
          }))
        }
        hint="Horizontal stage position"
      />

      <SelectField
        label="Facing"
        value={placement.facing ?? 'right'}
        options={facingOptions}
        onChange={(val) =>
          mutatePlacement((p) => ({ ...p, facing: val as FacingDirection }))
        }
      />

      <SliderField
        label="Scale"
        value={placement.scale ?? 1}
        onChange={(val) =>
          mutatePlacement((p) => ({ ...p, scale: val }))
        }
        min={0.2}
        max={3}
        step={0.05}
        hint="Character size multiplier"
      />
    </div>
  );
}

// ─── Timeline Event Properties ──────────────────────────────

function TimelineEventProperties({
  shot,
  shotIndex,
  eventId,
}: {
  shot: Shot;
  shotIndex: number;
  eventId: string;
}) {
  const mutateShot = useShotMutator();

  // eventId format: "time_commandIndex" e.g. "2_0" means time=2, command index=0
  const parsed = useMemo(() => {
    const parts = eventId.split('_');
    if (parts.length >= 2) {
      const eventIdx = parseInt(parts[0], 10);
      const cmdIdx = parseInt(parts[1], 10);
      if (!isNaN(eventIdx) && !isNaN(cmdIdx)) {
        const event = shot.timeline[eventIdx];
        if (event && event.commands[cmdIdx]) {
          return { eventIdx, cmdIdx, event, command: event.commands[cmdIdx] };
        }
      }
    }
    // Fallback: search by time
    for (let ei = 0; ei < shot.timeline.length; ei++) {
      for (let ci = 0; ci < shot.timeline[ei].commands.length; ci++) {
        const key = `${ei}_${ci}`;
        if (key === eventId) {
          return {
            eventIdx: ei,
            cmdIdx: ci,
            event: shot.timeline[ei],
            command: shot.timeline[ei].commands[ci],
          };
        }
      }
    }
    return null;
  }, [shot.timeline, eventId]);

  if (!parsed) {
    return (
      <div className="prop-section">
        <SectionHeader title="Timeline Event" icon="T" color="#ffa726" />
        <div className="prop-empty">Event not found: {eventId}</div>
      </div>
    );
  }

  const { eventIdx, cmdIdx, event, command } = parsed;

  const mutateCommand = (updater: (cmd: Command) => Command) => {
    mutateShot(shotIndex, (s) => {
      const timeline = [...s.timeline];
      const te = { ...timeline[eventIdx], commands: [...timeline[eventIdx].commands] };
      te.commands[cmdIdx] = updater(JSON.parse(JSON.stringify(te.commands[cmdIdx])));
      timeline[eventIdx] = te;
      return { ...s, timeline };
    });
  };

  const mutateEventTime = (newTime: number) => {
    mutateShot(shotIndex, (s) => {
      const timeline = [...s.timeline];
      timeline[eventIdx] = { ...timeline[eventIdx], time: Math.max(0, newTime) };
      return { ...s, timeline };
    });
  };

  return (
    <div className="prop-section">
      <SectionHeader title="Timeline Event" icon="T" color="#ffa726" />

      <NumberField
        label="Time"
        value={event.time}
        onChange={mutateEventTime}
        min={0}
        max={shot.duration}
        step={0.1}
        unit="s"
        hint="Event start time"
      />

      <div className="prop-command-type-badge">
        Type: <strong>{command.type}</strong>
      </div>

      <CommandEditor command={command} mutateCommand={mutateCommand} shot={shot} />
    </div>
  );
}

// ─── Command Editor (polymorphic) ───────────────────────────

function CommandEditor({
  command,
  mutateCommand,
  shot,
}: {
  command: Command;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
  shot: Shot;
}) {
  switch (command.type) {
    case 'camera':
      return <CameraEditor command={command} mutateCommand={mutateCommand} />;
    case 'action':
      return <ActionEditor command={command} mutateCommand={mutateCommand} />;
    case 'expression':
      return <ExpressionEditor command={command} mutateCommand={mutateCommand} />;
    case 'say':
      return <SayEditor command={command} mutateCommand={mutateCommand} />;
    case 'move':
      return <MoveEditor command={command} mutateCommand={mutateCommand} />;
    case 'sfx':
      return <SfxEditor command={command} mutateCommand={mutateCommand} />;
    case 'vfx':
      return <VfxEditor command={command} mutateCommand={mutateCommand} />;
    default:
      return (
        <div className="prop-generic-cmd">
          <pre className="prop-json-preview">
            {JSON.stringify(command, null, 2)}
          </pre>
        </div>
      );
  }
}

// ─── Camera Editor ──────────────────────────────────────────

function CameraEditor({
  command,
  mutateCommand,
}: {
  command: CameraCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const cameraTypeOpts = Array.from(CAMERA_TYPES).map((t) => ({
    value: t,
    label: t,
  }));

  const motionOpts = [
    { value: '', label: '(none)' },
    ...Array.from(CAMERA_MOTIONS).map((m) => ({ value: m, label: m })),
  ];

  return (
    <div className="prop-command-editor">
      <SelectField
        label="Camera Type"
        value={command.cameraType}
        options={cameraTypeOpts}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            cameraType: val as CameraType,
          }))
        }
      />

      <SelectField
        label="Motion"
        value={command.motion ?? ''}
        options={motionOpts}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            motion: val ? (val as CameraMotion) : undefined,
          }))
        }
      />

      {command.target !== undefined && (
        <TextField
          label="Target"
          value={command.target ?? ''}
          onChange={(val) =>
            mutateCommand(() => ({ ...command, target: val || undefined }))
          }
          placeholder="Character or position"
        />
      )}

      {command.duration !== undefined && (
        <NumberField
          label="Duration"
          value={command.duration ?? 1}
          onChange={(val) =>
            mutateCommand(() => ({ ...command, duration: val }))
          }
          min={0.1}
          max={30}
          step={0.1}
          unit="s"
        />
      )}

      {command.intensity !== undefined && (
        <SliderField
          label="Intensity"
          value={command.intensity ?? 1}
          onChange={(val) =>
            mutateCommand(() => ({ ...command, intensity: val }))
          }
          min={0}
          max={5}
          step={0.1}
        />
      )}
    </div>
  );
}

// ─── Action Editor ──────────────────────────────────────────

function ActionEditor({
  command,
  mutateCommand,
}: {
  command: ActionCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const actionOptions = [
    'sword_slash',
    'sword_draw',
    'block',
    'dodge',
    'kick',
    'punch',
    'bow',
    'wave',
    'run',
    'jump',
    'sit',
    'stand',
  ].map((a) => ({ value: a, label: a }));

  return (
    <div className="prop-command-editor">
      <TextField
        label="Character"
        value={command.character}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, character: val }))
        }
      />

      <SelectField
        label="Action"
        value={command.action}
        options={actionOptions}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, action: val }))
        }
      />

      <TextField
        label="Target"
        value={command.target ?? ''}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            target: val || undefined,
          }))
        }
        placeholder="Optional target character"
      />
    </div>
  );
}

// ─── Expression Editor ──────────────────────────────────────

function ExpressionEditor({
  command,
  mutateCommand,
}: {
  command: ExpressionCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const charInfo = DEMO_CHARACTERS.find(
    (c) => c.name === command.character || c.id === command.character,
  );
  const expressions = charInfo?.expressions ?? [
    'neutral',
    'happy',
    'angry',
    'shocked',
    'smirk',
    'crying',
  ];
  const exprOptions = expressions.map((e) => ({ value: e, label: e }));

  return (
    <div className="prop-command-editor">
      <TextField
        label="Character"
        value={command.character}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, character: val }))
        }
      />

      <SelectField
        label="Expression"
        value={command.expression}
        options={exprOptions}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, expression: val }))
        }
      />
    </div>
  );
}

// ─── Say Editor ─────────────────────────────────────────────

function SayEditor({
  command,
  mutateCommand,
}: {
  command: SayCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  return (
    <div className="prop-command-editor">
      <TextField
        label="Character"
        value={command.character}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, character: val }))
        }
      />

      <TextField
        label="Dialogue"
        value={command.text}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, text: val }))
        }
        multiline
        placeholder="Character dialogue..."
      />

      <TextField
        label="Voice"
        value={command.voice ?? ''}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            voice: val || undefined,
          }))
        }
        placeholder="Optional voice ID"
      />
    </div>
  );
}

// ─── Move Editor ────────────────────────────────────────────

function MoveEditor({
  command,
  mutateCommand,
}: {
  command: MoveCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const positionOptions = Array.from(SEMANTIC_POSITIONS).map((p) => ({
    value: p,
    label: p,
  }));

  return (
    <div className="prop-command-editor">
      <TextField
        label="Character"
        value={command.character}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, character: val }))
        }
      />

      <SelectField
        label="Destination"
        value={command.to?.semantic ?? 'center'}
        options={positionOptions}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            to: { ...command.to, semantic: val as SemanticPosition },
          }))
        }
      />

      <NumberField
        label="Duration"
        value={command.duration}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, duration: val }))
        }
        min={0.1}
        max={30}
        step={0.1}
        unit="s"
      />
    </div>
  );
}

// ─── SFX Editor ─────────────────────────────────────────────

function SfxEditor({
  command,
  mutateCommand,
}: {
  command: SfxCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const sfxOptions = [
    'sword_clash',
    'footsteps',
    'door_open',
    'door_close',
    'glass_break',
    'crowd_gasp',
    'wind',
    'thunder',
    'explosion',
    'splash',
  ].map((s) => ({ value: s, label: s }));

  return (
    <div className="prop-command-editor">
      <SelectField
        label="Sound"
        value={command.sound}
        options={sfxOptions}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, sound: val }))
        }
      />
    </div>
  );
}

// ─── VFX Editor ─────────────────────────────────────────────

function VfxEditor({
  command,
  mutateCommand,
}: {
  command: VfxCommand;
  mutateCommand: (updater: (cmd: Command) => Command) => void;
}) {
  const vfxOptions = [
    'dust_cloud',
    'sparks',
    'blood_splash',
    'fire',
    'smoke',
    'lightning',
    'glow',
    'shockwave',
    'rain',
    'snow',
  ].map((v) => ({ value: v, label: v }));

  return (
    <div className="prop-command-editor">
      <SelectField
        label="Effect"
        value={command.effect}
        options={vfxOptions}
        onChange={(val) =>
          mutateCommand(() => ({ ...command, effect: val }))
        }
      />

      <TextField
        label="Target"
        value={command.target ?? ''}
        onChange={(val) =>
          mutateCommand(() => ({
            ...command,
            target: val || undefined,
          }))
        }
        placeholder="Target character or position"
      />
    </div>
  );
}

// ─── Camera Selection Properties ────────────────────────────

function CameraSelectionProperties({
  shot,
  shotIndex,
  cameraId,
}: {
  shot: Shot;
  shotIndex: number;
  cameraId: string;
}) {
  const mutateShot = useShotMutator();

  // Find camera command in timeline. cameraId may be "eventIdx_cmdIdx"
  const parsed = useMemo(() => {
    const parts = cameraId.split('_');
    if (parts.length >= 2) {
      const eventIdx = parseInt(parts[0], 10);
      const cmdIdx = parseInt(parts[1], 10);
      if (!isNaN(eventIdx) && !isNaN(cmdIdx)) {
        const event = shot.timeline[eventIdx];
        const cmd = event?.commands[cmdIdx];
        if (cmd && cmd.type === 'camera') {
          return { eventIdx, cmdIdx, event, camera: cmd as CameraCommand };
        }
      }
    }
    // Fallback: find first camera command
    for (let ei = 0; ei < shot.timeline.length; ei++) {
      for (let ci = 0; ci < shot.timeline[ei].commands.length; ci++) {
        const cmd = shot.timeline[ei].commands[ci];
        if (cmd.type === 'camera') {
          return {
            eventIdx: ei,
            cmdIdx: ci,
            event: shot.timeline[ei],
            camera: cmd as CameraCommand,
          };
        }
      }
    }
    return null;
  }, [shot.timeline, cameraId]);

  if (!parsed) {
    return (
      <div className="prop-section">
        <SectionHeader title="Camera" icon="CAM" color="#ab47bc" />
        <div className="prop-empty">Camera command not found</div>
      </div>
    );
  }

  const { eventIdx, cmdIdx, event, camera } = parsed;

  const cameraTypeOpts = Array.from(CAMERA_TYPES).map((t) => ({
    value: t,
    label: t,
  }));

  const motionOpts = [
    { value: '', label: '(none)' },
    ...Array.from(CAMERA_MOTIONS).map((m) => ({ value: m, label: m })),
  ];

  const mutateCam = (updater: (cam: CameraCommand) => CameraCommand) => {
    mutateShot(shotIndex, (s) => {
      const timeline = [...s.timeline];
      const te = { ...timeline[eventIdx], commands: [...timeline[eventIdx].commands] };
      te.commands[cmdIdx] = updater(JSON.parse(JSON.stringify(camera)));
      timeline[eventIdx] = te;
      return { ...s, timeline };
    });
  };

  return (
    <div className="prop-section">
      <SectionHeader title="Camera" icon="CAM" color="#ab47bc" />

      <NumberField
        label="Time"
        value={event.time}
        onChange={(val) =>
          mutateShot(shotIndex, (s) => {
            const tl = [...s.timeline];
            tl[eventIdx] = { ...tl[eventIdx], time: Math.max(0, val) };
            return { ...s, timeline: tl };
          })
        }
        min={0}
        max={shot.duration}
        step={0.1}
        unit="s"
      />

      <SelectField
        label="Camera Type"
        value={camera.cameraType}
        options={cameraTypeOpts}
        onChange={(val) =>
          mutateCam((c) => ({ ...c, cameraType: val as CameraType }))
        }
      />

      <SelectField
        label="Motion"
        value={camera.motion ?? ''}
        options={motionOpts}
        onChange={(val) =>
          mutateCam((c) => ({
            ...c,
            motion: val ? (val as CameraMotion) : undefined,
          }))
        }
      />

      <TextField
        label="Target"
        value={camera.target ?? ''}
        onChange={(val) =>
          mutateCam((c) => ({ ...c, target: val || undefined }))
        }
        placeholder="Target character"
      />

      <SliderField
        label="Intensity"
        value={camera.intensity ?? 1}
        onChange={(val) =>
          mutateCam((c) => ({ ...c, intensity: val }))
        }
        min={0}
        max={5}
        step={0.1}
      />

      <NumberField
        label="Duration"
        value={camera.duration ?? 1}
        onChange={(val) =>
          mutateCam((c) => ({ ...c, duration: val }))
        }
        min={0.1}
        max={30}
        step={0.1}
        unit="s"
      />
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="prop-empty-state">
      <div className="prop-empty-icon">i</div>
      <div className="prop-empty-title">No Selection</div>
      <div className="prop-empty-desc">
        Select a shot, character, or timeline event to view and edit its
        properties.
      </div>
      <div className="prop-empty-tips">
        <div className="prop-empty-tip">Click a shot in the shot list</div>
        <div className="prop-empty-tip">Click a character on the canvas</div>
        <div className="prop-empty-tip">Click an event in the timeline</div>
      </div>
    </div>
  );
}

// ─── Main PropertiesPanel Component ─────────────────────────

export default function PropertiesPanel() {
  const { state, currentShot } = useEditor();
  const { selectedElement } = state;
  const shotIndex = state.currentShotIndex;

  const renderContent = () => {
    if (!currentShot) {
      return (
        <div className="prop-empty-state">
          <div className="prop-empty-icon">!</div>
          <div className="prop-empty-title">No Shot Loaded</div>
          <div className="prop-empty-desc">
            Create or load a project to begin editing.
          </div>
        </div>
      );
    }

    if (!selectedElement) {
      // Show current shot properties by default when nothing is selected
      return (
        <div className="prop-content">
          <ShotProperties shot={currentShot} shotIndex={shotIndex} />
          <div className="prop-divider" />
          <div className="prop-hint-section">
            <SectionHeader title="Quick Info" icon="?" color="#78909c" />
            <div className="prop-info-block">
              <div className="prop-info-item">
                <span className="prop-info-label">Characters</span>
                <span className="prop-info-value">
                  {currentShot.placements.map((p) => p.character).join(', ') || 'None'}
                </span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">Camera</span>
                <span className="prop-info-value">
                  {(() => {
                    for (const te of currentShot.timeline) {
                      for (const cmd of te.commands) {
                        if (cmd.type === 'camera') return (cmd as CameraCommand).cameraType;
                      }
                    }
                    return 'Default';
                  })()}
                </span>
              </div>
              <div className="prop-info-item">
                <span className="prop-info-label">BGM</span>
                <span className="prop-info-value">
                  {currentShot.bgm?.track ?? 'None'}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    switch (selectedElement.type) {
      case 'shot':
        return (
          <div className="prop-content">
            <ShotProperties shot={currentShot} shotIndex={selectedElement.shotIndex} />
          </div>
        );

      case 'character':
        return (
          <div className="prop-content">
            <CharacterPlacementProperties
              shot={currentShot}
              shotIndex={shotIndex}
              placementId={selectedElement.id}
            />
          </div>
        );

      case 'timelineEvent':
        return (
          <div className="prop-content">
            <TimelineEventProperties
              shot={currentShot}
              shotIndex={shotIndex}
              eventId={selectedElement.id}
            />
          </div>
        );

      case 'camera':
        return (
          <div className="prop-content">
            <CameraSelectionProperties
              shot={currentShot}
              shotIndex={shotIndex}
              cameraId={selectedElement.id}
            />
          </div>
        );

      default:
        return <EmptyState />;
    }
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <span className="panel-header-title">Properties</span>
        {selectedElement && (
          <span className="panel-header-badge">
            {selectedElement.type}
          </span>
        )}
      </div>
      <div className="properties-panel-body">{renderContent()}</div>
    </div>
  );
}
