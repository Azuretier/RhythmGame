'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { marked } from 'marked';
import { MAX_CONTENT_LENGTH } from '@/lib/wiki/constants';
import styles from './WikiPage.module.css';

interface WikiEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Configure marked to strip raw HTML for XSS safety
const renderer = new marked.Renderer();
const originalHtml = renderer.html.bind(renderer);
renderer.html = function (token) {
  // Escape raw HTML blocks instead of rendering them
  const text = typeof token === 'string' ? token : token.raw;
  return `<pre><code>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
});

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?>/gi, '')
    .replace(/<form[\s\S]*?<\/form>/gi, '')
    .replace(/<input[\s\S]*?>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '');
}

const TOOLBAR_ACTIONS = [
  { label: 'B', prefix: '**', suffix: '**', key: 'bold' },
  { label: 'I', prefix: '*', suffix: '*', key: 'italic' },
  { label: 'H', prefix: '## ', suffix: '', key: 'heading' },
  { label: '🔗', prefix: '[', suffix: '](url)', key: 'link' },
  { label: '`', prefix: '`', suffix: '`', key: 'code' },
  { label: '```', prefix: '```\n', suffix: '\n```', key: 'codeblock' },
  { label: '•', prefix: '- ', suffix: '', key: 'list' },
] as const;

export default function WikiEditor({ value, onChange, placeholder }: WikiEditorProps) {
  const t = useTranslations('wiki');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newText = value.slice(0, start) + prefix + selected + suffix + value.slice(end);

    onChange(newText);

    requestAnimationFrame(() => {
      textarea.focus();
      const cursorPos = start + prefix.length + selected.length;
      textarea.setSelectionRange(cursorPos, cursorPos);
    });
  }, [value, onChange]);

  const renderedHtml = useMemo(() => {
    if (!value) return '';
    try {
      const raw = marked.parse(value);
      return sanitizeHtml(typeof raw === 'string' ? raw : '');
    } catch {
      return '<p>Error rendering preview</p>';
    }
  }, [value]);

  return (
    <div className={styles.editorContainer}>
      {/* Toolbar */}
      <div className={styles.editorToolbar}>
        <div className={styles.editorToolbarActions}>
          {TOOLBAR_ACTIONS.map((action) => (
            <button
              key={action.key}
              type="button"
              className={styles.editorToolbarBtn}
              onClick={() => insertMarkdown(action.prefix, action.suffix)}
              title={action.key}
            >
              {action.label}
            </button>
          ))}
        </div>
        <div className={styles.editorTabs}>
          <button
            type="button"
            className={`${styles.editorTab} ${activeTab === 'edit' ? styles.editorTabActive : ''}`}
            onClick={() => setActiveTab('edit')}
          >
            {t('editorEdit')}
          </button>
          <button
            type="button"
            className={`${styles.editorTab} ${activeTab === 'preview' ? styles.editorTabActive : ''}`}
            onClick={() => setActiveTab('preview')}
          >
            {t('editorPreview')}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.editorContent}>
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            className={styles.editorTextarea}
            value={value}
            onChange={(e) => onChange(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
            placeholder={placeholder || t('editorPlaceholder')}
            spellCheck={false}
          />
        ) : (
          <div
            className={styles.editorPreviewPane}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        )}
      </div>

      {/* Character count */}
      <div className={styles.editorFooter}>
        <span className={styles.editorCharCount}>
          {value.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
