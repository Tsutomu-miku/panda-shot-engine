import React, { useRef, useEffect, useCallback } from 'react';
import { useEditor, Character } from '../../hooks/useEditorState';

/* ================================================================
   Draw a placeholder panda-style character
   ================================================================ */

type Expression = 'neutral' | 'happy' | 'angry' | 'shocked' | 'smirk' | 'crying';

function drawPlaceholderCharacter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  facing: 'left' | 'right' = 'right',
  expression: Expression = 'neutral',
  scale: number = 1
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Flip if facing left
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  const headR = 28;

  /* --- Body (rectangle) --- */
  ctx.fillStyle = '#e0e0e0';
  ctx.fillRect(-18, headR - 2, 36, 44);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-18, headR - 2, 36, 44);

  /* --- Limbs (lines) --- */
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  // Arms
  ctx.beginPath();
  ctx.moveTo(-18, headR + 6);
  ctx.lineTo(-34, headR + 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18, headR + 6);
  ctx.lineTo(34, headR + 30);
  ctx.stroke();
  // Legs
  ctx.beginPath();
  ctx.moveTo(-10, headR + 42);
  ctx.lineTo(-14, headR + 64);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(10, headR + 42);
  ctx.lineTo(14, headR + 64);
  ctx.stroke();

  /* --- Head (circle) --- */
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  /* --- Ears --- */
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-20, -22, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(20, -22, 9, 0, Math.PI * 2);
  ctx.fill();

  /* --- Eye patches (panda style) --- */
  ctx.fillStyle = '#222';
  // Left eye patch
  ctx.beginPath();
  ctx.ellipse(-10, -4, 10, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // Right eye patch
  ctx.beginPath();
  ctx.ellipse(10, -4, 10, 8, 0.2, 0, Math.PI * 2);
  ctx.fill();

  /* --- Eyes (white dots inside patches) --- */
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-10, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(10, -4, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Pupils
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-9, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(11, -4, 1.8, 0, Math.PI * 2);
  ctx.fill();

  /* --- Nose --- */
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(0, 6, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  /* --- Mouth (expression) --- */
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';

  switch (expression) {
    case 'happy':
      ctx.beginPath();
      ctx.arc(0, 10, 8, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
      break;
    case 'angry':
      // Inverted V
      ctx.beginPath();
      ctx.moveTo(-6, 13);
      ctx.lineTo(0, 17);
      ctx.lineTo(6, 13);
      ctx.stroke();
      // Angry eyebrows
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-16, -13);
      ctx.lineTo(-6, -10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16, -13);
      ctx.lineTo(6, -10);
      ctx.stroke();
      break;
    case 'shocked':
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.ellipse(0, 14, 5, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'smirk':
      ctx.beginPath();
      ctx.arc(4, 11, 6, 0, 0.7 * Math.PI);
      ctx.stroke();
      break;
    case 'crying':
      ctx.beginPath();
      ctx.arc(0, 16, 8, 1.1 * Math.PI, 1.9 * Math.PI);
      ctx.stroke();
      // Tear drops
      ctx.fillStyle = '#64b5f6';
      ctx.beginPath();
      ctx.ellipse(-12, 6, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(12, 4, 2, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'neutral':
    default:
      ctx.beginPath();
      ctx.moveTo(-6, 13);
      ctx.lineTo(6, 13);
      ctx.stroke();
      break;
  }

  /* --- Name label --- */
  // Undo the facing flip for text
  if (facing === 'left') {
    ctx.scale(-1, 1);
  }

  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Background pill
  const textW = ctx.measureText(name).width + 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.roundRect(-textW / 2, headR + 70, textW, 18, 4);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillText(name, 0, headR + 73);

  ctx.restore();
}

/* ================================================================
   Canvas Preview Component
   ================================================================ */

const ZOOM_OPTIONS = [50, 75, 100, 150];

const CanvasPreview: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { state, dispatch, currentShot } = useEditor();

  /* ---------- Draw ---------- */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    /* Background */
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a2a3e');
    grad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    /* Floor line */
    ctx.strokeStyle = '#3a3a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, H * 0.78);
    ctx.lineTo(W, H * 0.78);
    ctx.stroke();

    /* Safe area */
    const safeMargin = 0.05;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(
      W * safeMargin,
      H * safeMargin,
      W * (1 - 2 * safeMargin),
      H * (1 - 2 * safeMargin)
    );
    ctx.setLineDash([]);

    /* Center crosshair */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    /* Rule-of-thirds guides (faint) */
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.moveTo(W / 3, 0);
    ctx.lineTo(W / 3, H);
    ctx.moveTo((2 * W) / 3, 0);
    ctx.lineTo((2 * W) / 3, H);
    ctx.moveTo(0, H / 3);
    ctx.lineTo(W, H / 3);
    ctx.moveTo(0, (2 * H) / 3);
    ctx.lineTo(W, (2 * H) / 3);
    ctx.stroke();

    /* Draw characters */
    if (currentShot) {
      currentShot.characters.forEach((ch) => {
        const px = (ch.position?.x ?? 0.5) * W;
        const py = (ch.position?.y ?? 0.6) * H;
        drawPlaceholderCharacter(
          ctx,
          px,
          py,
          ch.name,
          ch.facing ?? 'right',
          (ch.expression as Expression) ?? 'neutral',
          ch.scale ?? 1
        );
      });
    }

    /* Scene name overlay */
    if (currentShot) {
      ctx.font = '10px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`scene: ${currentShot.scene}`, W - 12, H - 8);
    }
  }, [currentShot, state.selectedCharacterId]);

  /* ---------- Resize & Redraw ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const resize = () => {
      const rect = wrapper.getBoundingClientRect();
      const maxW = rect.width - 24;
      const maxH = rect.height - 24;
      const zoom = state.zoom / 100;

      // 16:9 ratio
      let w = maxW * zoom;
      let h = w * (9 / 16);

      if (h > maxH * zoom) {
        h = maxH * zoom;
        w = h * (16 / 9);
      }

      canvas.width = Math.floor(w);
      canvas.height = Math.floor(h);
      draw();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrapper);
    return () => observer.disconnect();
  }, [draw, state.zoom]);

  /* Redraw on state changes */
  useEffect(() => {
    draw();
  }, [draw, state.currentTime, state.selectedCharacterId]);

  return (
    <div className="panel canvas-panel">
      {/* Shot ID badge */}
      <span className="canvas-panel__shot-id">
        {currentShot ? `# ${currentShot.id}` : 'No shot selected'}
      </span>

      {/* Canvas wrapper */}
      <div className="canvas-panel__wrapper" ref={wrapperRef}>
        <canvas ref={canvasRef} className="canvas-panel__canvas" />
      </div>

      {/* Zoom control */}
      <div className="canvas-panel__zoom">
        {ZOOM_OPTIONS.map((z) => (
          <button
            key={z}
            className={`btn btn--small ${state.zoom === z ? 'active' : ''}`}
            onClick={() => dispatch({ type: 'SET_ZOOM', zoom: z })}
          >
            {z}%
          </button>
        ))}
      </div>
    </div>
  );
};

export default CanvasPreview;
