// ============================================================
// panda-shot-engine — Enhanced DSL Editor Component
// Syntax highlighting via textarea + overlay, line numbers,
// error/warning markers, debounced validation, DSL<->GUI sync
// ============================================================

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import { KEYWORDS as DSL_KEYWORDS } from '../../../core/dsl/types';
import type { DiagnosticMessage } from '../../../core/dsl/types';

// ─── Known character names for highlighting ─────────────────

const CHARACTER_NAMES = new Set([
  'hero', 'villain', 'sidekick', 'elder', 'merchant',
  'panda_warrior', 'villain_boss', 'innkeeper',
]);

// ─── Syntax Highlighter ─────────────────────────────────────

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Comment
    if (remaining.startsWith('#')) {
      tokens.push(<span key={key++} className="tok-comment">{remaining}</span>);
      remaining = '';
      continue;
    }

    // String literal
    const strMatch = remaining.match(/^"[^"]*"/);
    if (strMatch) {
      tokens.push(<span key={key++} className="tok-string">{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Number with optional unit (e.g. 5s, 0.3, 120deg, 500ms, 0.5s)
    const numMatch = remaining.match(/^(\d+\.?\d*)(s|ms|deg|px|%)?/);
    if (numMatch) {
      const before = line.length - remaining.length;
      if (before === 0 || /[\s:,]/.test(line[before - 1])) {
        tokens.push(<span key={key++} className="tok-number">{numMatch[0]}</span>);
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
    }

    // Identifier or keyword
    const wordMatch = remaining.match(/^[a-zA-Z_][\w]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      // Check for compound keyword (e.g. close-up, fade-black, enter-from)
      let fullWord = word;
      let lookAhead = remaining.slice(word.length);
      while (lookAhead.startsWith('-') && /^-[a-zA-Z]/.test(lookAhead)) {
        const nextPart = lookAhead.match(/^-([a-zA-Z_][\w]*)/);
        if (nextPart) {
          fullWord += nextPart[0];
          lookAhead = lookAhead.slice(nextPart[0].length);
        } else {
          break;
        }
      }

      if (DSL_KEYWORDS.has(fullWord)) {
        tokens.push(<span key={key++} className="tok-keyword">{fullWord}</span>);
        remaining = remaining.slice(fullWord.length);
      } else if (CHARACTER_NAMES.has(fullWord) || CHARACTER_NAMES.has(word)) {
        tokens.push(<span key={key++} className="tok-character">{fullWord}</span>);
        remaining = remaining.slice(fullWord.length);
      } else {
        tokens.push(<span key={key++} className="tok-identifier">{fullWord}</span>);
        remaining = remaining.slice(fullWord.length);
      }
      continue;
    }

    // Punctuation, whitespace, colon
    const puncMatch = remaining.match(/^[:\s,]+/);
    if (puncMatch) {
      tokens.push(<span key={key++} className="tok-punctuation">{puncMatch[0]}</span>);
      remaining = remaining.slice(puncMatch[0].length);
      continue;
    }

    // Fallback: single character
    tokens.push(<span key={key++} className="tok-default">{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return tokens;
}

// ─── Error line set helper ──────────────────────────────────

function buildDiagnosticLineMap(
  errors: DiagnosticMessage[],
  warnings: DiagnosticMessage[],
): { errorLines: Set<number>; warningLines: Set<number> } {
  const errorLines = new Set<number>();
  const warningLines = new Set<number>();
  for (const e of errors) errorLines.add(e.line);
  for (const w of warnings) warningLines.add(w.line);
  return { errorLines, warningLines };
}

// ─── DSL Editor Component ───────────────────────────────────

const DslEditor: React.FC = () => {
  const { state, dispatch } = useEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [localText, setLocalText] = useState(state.dslText);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external DSL changes into local text
  useEffect(() => {
    setLocalText(state.dslText);
  }, [state.dslText]);

  // Handle text change with debounced parsing
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalText(text);
      dispatch({ type: 'SET_DSL_TEXT', text });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        dispatch({ type: 'PARSE_DSL' });
      }, 400);
    },
    [dispatch],
  );

  // Sync scroll between textarea, highlight overlay, and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Tab key support
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setLocalText(newValue);
        dispatch({ type: 'SET_DSL_TEXT', text: newValue });
        // Restore cursor
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [dispatch],
  );

  // Computed values
  const lines = localText.split('\n');
  const lineCount = lines.length;
  const charCount = localText.length;
  const { errorLines, warningLines } = useMemo(
    () => buildDiagnosticLineMap(state.dslErrors, state.dslWarnings),
    [state.dslErrors, state.dslWarnings],
  );

  // Highlighted content
  const highlighted = useMemo(() => {
    return lines.map((line, i) => {
      const lineNum = i + 1;
      let className = 'dsl-line';
      if (errorLines.has(lineNum)) className += ' dsl-line--error';
      else if (warningLines.has(lineNum)) className += ' dsl-line--warning';
      return (
        <div key={i} className={className} style={{ minHeight: '20.4px' }}>
          {highlightLine(line)}
          {'\n'}
        </div>
      );
    });
  }, [localText, errorLines, warningLines]);

  // Error/warning summary
  const errorCount = state.dslErrors.length;
  const warningCount = state.dslWarnings.length;
  const hasErrors = errorCount > 0;

  return (
    <div className="dsl-editor">
      <div className="panel-header">
        <span className="panel-header__title">DSL Editor</span>
        <div className="dsl-editor__actions">
          <button
            className="btn btn--small"
            title="Format DSL"
            onClick={() => dispatch({ type: 'PARSE_DSL' })}
          >
            Format
          </button>
        </div>
      </div>

      <div className="dsl-editor__container">
        {/* Line numbers */}
        <div className="dsl-editor__line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            let markerClass = 'dsl-editor__line-number';
            if (errorLines.has(lineNum)) markerClass += ' line-error';
            else if (warningLines.has(lineNum)) markerClass += ' line-warning';
            return (
              <div key={i} className={markerClass}>
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Code area */}
        <div className="dsl-editor__content">
          {/* Highlight layer */}
          <div className="dsl-editor__highlight" ref={highlightRef}>
            {highlighted}
          </div>

          {/* Editable textarea */}
          <textarea
            ref={textareaRef}
            className="dsl-editor__textarea"
            value={localText}
            onChange={handleChange}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Diagnostics panel */}
      {(hasErrors || warningCount > 0) && (
        <div className="dsl-editor__diagnostics">
          {state.dslErrors.map((err, i) => (
            <div key={`e-${i}`} className="diagnostic diagnostic--error">
              <span className="diagnostic__icon">X</span>
              <span className="diagnostic__location">L{err.line}:{err.column}</span>
              <span className="diagnostic__message">{err.message}</span>
            </div>
          ))}
          {state.dslWarnings.map((warn, i) => (
            <div key={`w-${i}`} className="diagnostic diagnostic--warning">
              <span className="diagnostic__icon">!</span>
              <span className="diagnostic__location">L{warn.line}:{warn.column}</span>
              <span className="diagnostic__message">{warn.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Status bar */}
      <div className="dsl-editor__status">
        <span>
          Lines: {lineCount} | Chars: {charCount}
        </span>
        <span className={hasErrors ? 'invalid' : 'valid'}>
          {hasErrors
            ? `${errorCount} error${errorCount > 1 ? 's' : ''}`
            : warningCount > 0
            ? `${warningCount} warning${warningCount > 1 ? 's' : ''}`
            : 'Valid'}
        </span>
      </div>
    </div>
  );
};

export default DslEditor;
