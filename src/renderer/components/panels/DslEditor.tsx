import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { useEditor, validateDsl, ValidationResult } from '../../hooks/useEditorState';

/* ================================================================
   Syntax Highlighter
   ================================================================ */

const KEYWORDS = new Set([
  'shot', 'duration', 'set', 'place', 'at', 'camera', 'expression',
  'action', 'say', 'sfx', 'vfx', 'bgm', 'transition', 'facing',
  'voice', 'shake', 'wide', 'close-up', 'medium',
]);

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Comment
    if (remaining.startsWith('#')) {
      tokens.push(
        <span key={key++} className="tok-comment">{remaining}</span>
      );
      remaining = '';
      continue;
    }

    // String
    const strMatch = remaining.match(/^"[^"]*"/);
    if (strMatch) {
      tokens.push(
        <span key={key++} className="tok-string">{strMatch[0]}</span>
      );
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    // Number with optional unit
    const numMatch = remaining.match(/^(\d+\.?\d*)(s|ms|px|%)?/);
    if (numMatch && (remaining === line.trimStart().slice(0, remaining.length) || /[\s:]/.test(remaining.charAt(-1) || ' '))) {
      // Only match if preceded by whitespace or colon (simple heuristic)
      const before = line.length - remaining.length;
      if (before === 0 || /[\s:,]/.test(line[before - 1])) {
        tokens.push(
          <span key={key++} className="tok-number">{numMatch[0]}</span>
        );
        remaining = remaining.slice(numMatch[0].length);
        continue;
      }
    }

    // Keyword or identifier
    const wordMatch = remaining.match(/^[a-zA-Z_][\w-]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      if (KEYWORDS.has(word)) {
        tokens.push(
          <span key={key++} className="tok-keyword">{word}</span>
        );
      } else {
        tokens.push(
          <span key={key++} className="tok-default">{word}</span>
        );
      }
      remaining = remaining.slice(word.length);
      continue;
    }

    // Punctuation & whitespace
    const puncMatch = remaining.match(/^[:\s,]+/);
    if (puncMatch) {
      tokens.push(
        <span key={key++} className="tok-punctuation">{puncMatch[0]}</span>
      );
      remaining = remaining.slice(puncMatch[0].length);
      continue;
    }

    // Fallback: single char
    tokens.push(
      <span key={key++} className="tok-default">{remaining[0]}</span>
    );
    remaining = remaining.slice(1);
  }

  return tokens;
}

function highlightDsl(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <div key={i} style={{ height: '20.4px' }}>
      {highlightLine(line)}
      {i < lines.length - 1 ? '\n' : ''}
    </div>
  ));
}

/* ================================================================
   DSL Editor Component
   ================================================================ */

const DslEditor: React.FC = () => {
  const { state, dispatch } = useEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [localText, setLocalText] = useState(state.dslText);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Sync external changes */
  useEffect(() => {
    setLocalText(state.dslText);
  }, [state.dslText]);

  /* Handle text change with debounce validation */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setLocalText(text);
      dispatch({ type: 'UPDATE_DSL', text });

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const result = validateDsl(text);
        dispatch({ type: 'SET_VALIDATION', result });
      }, 300);
    },
    [dispatch]
  );

  /* Sync scroll between textarea and highlight overlay */
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  /* Computed values */
  const lines = localText.split('\n');
  const lineCount = lines.length;
  const charCount = localText.length;
  const validation = state.validationResult;

  const highlighted = useMemo(() => highlightDsl(localText), [localText]);

  return (
    <div className="dsl-editor">
      <div className="panel-header">
        <span className="panel-header__title">DSL Editor</span>
      </div>

      <div className="dsl-editor__container">
        {/* Line numbers */}
        <div className="dsl-editor__line-numbers">
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="dsl-editor__line-number">
              {i + 1}
            </div>
          ))}
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
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      {/* Status bar */}
      <div className="dsl-editor__status">
        <span>
          Lines: {lineCount} | Chars: {charCount}
        </span>
        <span className={validation?.valid ? 'valid' : 'invalid'}>
          {validation?.valid
            ? '\u2705 Valid'
            : `\u274C ${validation?.errors.length ?? 0} error${(validation?.errors.length ?? 0) > 1 ? 's' : ''}`}
        </span>
      </div>
    </div>
  );
};

export default DslEditor;
