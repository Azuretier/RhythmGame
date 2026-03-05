'use client';

import React, { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface FileTab {
  id: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

interface CursorPosition {
  line: number;
  column: number;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ts: 'TypeScript',
  tsx: 'TypeScript React',
  js: 'JavaScript',
  jsx: 'JavaScript React',
  json: 'JSON',
  css: 'CSS',
  html: 'HTML',
  md: 'Markdown',
  txt: 'Plain Text',
  py: 'Python',
  rs: 'Rust',
  go: 'Go',
};

function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop() || '';
  return LANGUAGE_EXTENSIONS[ext] || 'Plain Text';
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

const DEFAULT_FILE: FileTab = {
  id: 'welcome',
  name: 'welcome.txt',
  content: `Welcome to the Azuretier Text Editor!

This is a VS Code-inspired editor with zero-indexed line numbers.
Notice that line numbers start from 0 instead of 1.

Features:
  - Zero-indexed line numbers (display starts at 0)
  - Multi-tab file editing
  - Create new files and rename them
  - Syntax-aware language detection
  - Cursor position tracking (zero-indexed)
  - Modified file indicators

Try creating a new file with the + button in the tab bar!`,
  language: 'Plain Text',
  modified: false,
};

export default function TextEditor() {
  const [files, setFiles] = useState<FileTab[]>([DEFAULT_FILE]);
  const [activeFileId, setActiveFileId] = useState<string>('welcome');
  const [cursor, setCursor] = useState<CursorPosition>({ line: 0, column: 0 });
  const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  const activeFile = files.find(f => f.id === activeFileId);
  const lines = activeFile?.content.split('\n') || [''];

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Update cursor position from textarea selection
  const updateCursorPosition = useCallback(() => {
    if (!textareaRef.current || !activeFile) return;
    const pos = textareaRef.current.selectionStart;
    const textBeforeCursor = activeFile.content.substring(0, pos);
    const linesBefore = textBeforeCursor.split('\n');
    const line = linesBefore.length - 1; // zero-indexed
    const column = linesBefore[linesBefore.length - 1].length;
    setCursor({ line, column });
  }, [activeFile]);

  // Handle text content changes
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setFiles(prev => prev.map(f =>
      f.id === activeFileId ? { ...f, content: newContent, modified: true } : f
    ));
  }, [activeFileId]);

  // Handle tab key for indentation
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const content = activeFile?.content || '';
      const newContent = content.substring(0, start) + '  ' + content.substring(end);
      setFiles(prev => prev.map(f =>
        f.id === activeFileId ? { ...f, content: newContent, modified: true } : f
      ));
      // Restore cursor position after state update
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  }, [activeFile, activeFileId]);

  // Create a new file
  const createNewFile = useCallback(() => {
    const id = generateId();
    const newFile: FileTab = {
      id,
      name: `untitled-${files.length}.txt`,
      content: '',
      language: 'Plain Text',
      modified: false,
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(id);
  }, [files.length]);

  // Close a file tab
  const closeFile = useCallback((e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    setFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId);
      if (remaining.length === 0) {
        const id = generateId();
        const emptyFile: FileTab = {
          id,
          name: 'untitled.txt',
          content: '',
          language: 'Plain Text',
          modified: false,
        };
        setActiveFileId(id);
        return [emptyFile];
      }
      if (activeFileId === fileId) {
        setActiveFileId(remaining[remaining.length - 1].id);
      }
      return remaining;
    });
  }, [activeFileId]);

  // Start renaming a tab on double-click
  const startRename = useCallback((fileId: string, currentName: string) => {
    setRenamingTabId(fileId);
    setRenameValue(currentName);
  }, []);

  // Finish renaming
  const finishRename = useCallback(() => {
    if (renamingTabId && renameValue.trim()) {
      setFiles(prev => prev.map(f =>
        f.id === renamingTabId
          ? { ...f, name: renameValue.trim(), language: detectLanguage(renameValue.trim()) }
          : f
      ));
    }
    setRenamingTabId(null);
  }, [renamingTabId, renameValue]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingTabId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingTabId]);

  // Focus textarea when switching tabs
  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeFileId]);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm">
      {/* Title Bar */}
      <div className="flex items-center h-8 bg-[#323233] px-4 text-xs text-[#cccccc] select-none shrink-0">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[#007acc]">
            <path d="M1 3L5 1L11 3L15 1V13L11 15L5 13L1 15V3Z" fill="currentColor" opacity="0.8" />
            <path d="M5 1V13M11 3V15" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
          </svg>
          <span>{activeFile?.name || 'Untitled'} - Azuretier Editor</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto shrink-0">
        {files.map(file => (
          <div
            key={file.id}
            onClick={() => setActiveFileId(file.id)}
            onDoubleClick={() => startRename(file.id, file.name)}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 text-xs cursor-pointer border-r border-[#1e1e1e] select-none min-w-0 shrink-0',
              file.id === activeFileId
                ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#007acc]'
                : 'bg-[#2d2d2d] text-[#969696] hover:bg-[#2d2d2d]/80'
            )}
          >
            {/* File icon */}
            <span className="text-[#519aba] shrink-0">
              {file.language.includes('TypeScript') ? 'TS' :
               file.language.includes('JavaScript') ? 'JS' :
               file.language === 'JSON' ? '{}' :
               file.language === 'CSS' ? '#' :
               file.language === 'HTML' ? '<>' :
               file.language === 'Python' ? 'PY' :
               file.language === 'Markdown' ? 'MD' : ''}
            </span>
            {renamingTabId === file.id ? (
              <input
                ref={renameInputRef}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={finishRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') finishRename();
                  if (e.key === 'Escape') setRenamingTabId(null);
                }}
                className="bg-[#3c3c3c] text-white text-xs px-1 py-0.5 outline-none border border-[#007acc] rounded-sm w-28"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate max-w-[120px]">{file.name}</span>
            )}
            {file.modified && <span className="w-2 h-2 rounded-full bg-white/60 shrink-0" />}
            <button
              onClick={(e) => closeFile(e, file.id)}
              className="ml-1 p-0.5 rounded hover:bg-[#3c3c3c] text-[#969696] hover:text-white shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>
        ))}
        {/* New Tab Button */}
        <button
          onClick={createNewFile}
          className="flex items-center justify-center w-9 h-9 text-[#969696] hover:text-white hover:bg-[#2d2d2d] shrink-0"
          title="New File"
        >
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M7 2V12M2 7H12" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Line Numbers (Zero-Indexed) */}
        <div
          ref={lineNumbersRef}
          className="flex flex-col bg-[#1e1e1e] text-[#858585] text-right select-none overflow-hidden shrink-0 pt-[2px]"
          style={{ width: `${Math.max(3, String(lines.length - 1).length + 1)}ch`, paddingRight: '8px', paddingLeft: '16px' }}
        >
          {lines.map((_, i) => (
            <div
              key={i}
              className={cn(
                'leading-[20px] h-[20px]',
                cursor.line === i && 'text-[#c6c6c6]'
              )}
            >
              {i}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <div className="relative flex-1 overflow-hidden">
          {/* Current line highlight */}
          <div
            className="absolute left-0 right-0 bg-[#2a2d2e] pointer-events-none"
            style={{
              top: cursor.line * 20 + 2,
              height: 20,
            }}
          />
          <textarea
            ref={textareaRef}
            value={activeFile?.content || ''}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onClick={updateCursorPosition}
            onKeyUp={updateCursorPosition}
            onSelect={updateCursorPosition}
            spellCheck={false}
            className={cn(
              'absolute inset-0 w-full h-full bg-transparent text-[#d4d4d4] resize-none outline-none',
              'leading-[20px] pt-[2px] pl-[4px] pr-4',
              'caret-[#aeafad]',
              'selection:bg-[#264f78]'
            )}
            style={{
              tabSize: 2,
              fontFamily: 'var(--font-geist-mono), Menlo, Monaco, "Courier New", monospace',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between h-6 bg-[#007acc] px-3 text-xs text-white select-none shrink-0">
        <div className="flex items-center gap-4">
          <span>Ln {cursor.line}, Col {cursor.column}</span>
          <span className="opacity-70">(zero-indexed)</span>
        </div>
        <div className="flex items-center gap-4">
          <span>{activeFile?.language || 'Plain Text'}</span>
          <span>UTF-8</span>
          <span>Spaces: 2</span>
        </div>
      </div>
    </div>
  );
}
