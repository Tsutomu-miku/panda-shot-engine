import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor } from '../../hooks/useEditorState';
import { KEYWORDS as DSL_KEYWORDS } from '../../../core/dsl/types';

import './DslEditor.css';

const CHARACTER_NAMES = new Set(['hero', 'villain', 'sidekick', 'elder', 'beast']);

function highlightLine(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    if (remaining.startsWith('#')) {
      tokens.push(<span key={key++} className="tok-comment">{remaining}</span>);
      break;
    }

    const strMatch = remaining.match(/^"[^"]*"/);
    if (strMatch) {
      tokens.push(<span key={key++} className="tok-string">{strMatch[0]}</span>);
      remaining = remaining.slice(strMatch[0].length);
      continue;
    }

    const numMatch = remaining.match(/^(\d+\.?\d*)(s|ms|deg|px|%)?/);
    if (numMatch) {
      tokens.push(<span key={key++} className="tok-number">{numMatch[0]}</span>);
      remaining = remaining.slice(numMatch[0].length);
      continue;
    }

    const wordMatch = remaining.match(/^[a-zA-Z_][\w-]*/);
    if (wordMatch) {
      const word = wordMatch[0];
      const className = DSL_KEYWORDS.has(word)
        ? 'tok-keyword'
        : CHARACTER_NAMES.has(word)
        ? 'tok-character'
        : 'tok-identifier';
      tokens.push(<span key={key++} className={className}>{word}</span>);
      remaining = remaining.slice(word.length);
      continue;
    }

    const puncMatch = remaining.match(/^[:\s,]+/);
    if (puncMatch) {
      tokens.push(<span key={key++} className="tok-punctuation">{puncMatch[0]}</span>);
      remaining = remaining.slice(puncMatch[0].length);
      continue;
    }

    tokens.push(<span key={key++} className="tok-default">{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return tokens;
}

const DslEditor: React.FC = () => {
  const { state, dispatch, currentShot } = useEditor();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [localText, setLocalText] = useState(state.dslText);

  useEffect(() => {
    setLocalText(state.dslText);
  }, [state.dslText]);

  const lineCount = useMemo(() => localText.split('\n').length, [localText]);
  const lines = useMemo(() => localText.split('\n'), [localText]);

  const highlighted = useMemo(
    () =>
      lines.map((line, index) => (
        <div key={index} className="dsl-line" style={{ minHeight: '20.4px' }}>
          {highlightLine(line)}
          {'\n'}
        </div>
      )),
    [lines],
  );

  const handleChange = useCallback(
    (text: string) => {
      setLocalText(text);
      dispatch({ type: 'UPDATE_DSL', text });
    },
    [dispatch],
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  return (
    <div className="dsl-editor">
      <div className="panel-header">
        <span className="panel-header__title">DSL Editor</span>
      </div>

      <div className="dsl-editor__container">
        <div className="dsl-editor__line-numbers" ref={lineNumbersRef}>
          {Array.from({ length: lineCount }, (_, index) => (
            <div key={index} className="dsl-editor__line-number">
              {index + 1}
            </div>
          ))}
        </div>

        <div className="dsl-editor__content">
          <div className="dsl-editor__highlight" ref={highlightRef}>
            {highlighted}
          </div>

          <textarea
            ref={textareaRef}
            className="dsl-editor__textarea"
            value={localText}
            onChange={(e) => handleChange(e.target.value)}
            onScroll={handleScroll}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        </div>
      </div>

      <div className="dsl-editor__status">
        <span>
          Lines: {lineCount} | Chars: {localText.length}
        </span>
        <span className="valid">{currentShot ? currentShot.id : 'No shot selected'}</span>
      </div>
    </div>
  );
};

export default DslEditor;
