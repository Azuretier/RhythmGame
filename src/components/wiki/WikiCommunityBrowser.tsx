'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { marked } from 'marked';
import { useGoogleSync } from '@/lib/google-sync/context';
import { useProfile } from '@/lib/profile/context';
import {
  fetchPublishedPages,
  submitNewPage,
  submitEditSuggestion,
  submitResource,
} from '@/lib/wiki/firestore';
import {
  WIKI_CATEGORIES,
  MAX_TITLE_LENGTH,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from '@/lib/wiki/constants';
import type { WikiPage, WikiCategory, SubmissionType } from '@/lib/wiki/types';
import WikiEditor from './WikiEditor';
import styles from './WikiPage.module.css';

type BrowserMode = 'list' | 'detail' | 'create';

interface WikiCommunityBrowserProps {
  locale: string;
  initialEditTarget?: { pageId?: string; staticPage?: string; title?: string; content?: string } | null;
  onClearEditTarget?: () => void;
}

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

export default function WikiCommunityBrowser({
  locale,
  initialEditTarget,
  onClearEditTarget,
}: WikiCommunityBrowserProps) {
  const t = useTranslations('wiki');
  const { isLinked, googleEmail, googleDisplayName, linkGoogle } = useGoogleSync();
  const { profile } = useProfile();

  const [mode, setMode] = useState<BrowserMode>('list');
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<WikiPage | null>(null);
  const [filterCategory, setFilterCategory] = useState<WikiCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create form state
  const [submissionType, setSubmissionType] = useState<SubmissionType>('new_page');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<WikiCategory>('guide');
  const [tagsInput, setTagsInput] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit suggestion state
  const [editTargetPageId, setEditTargetPageId] = useState<string | null>(null);
  const [editTargetStaticPage, setEditTargetStaticPage] = useState<string | null>(null);

  const loadPages = useCallback(async () => {
    setLoading(true);
    const result = await fetchPublishedPages(locale);
    setPages(result);
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Handle initial edit target from WikiPage
  useEffect(() => {
    if (initialEditTarget) {
      setMode('create');
      setSubmissionType('edit_suggestion');
      setTitle(initialEditTarget.title || '');
      setContent(initialEditTarget.content || '');
      setEditTargetPageId(initialEditTarget.pageId || null);
      setEditTargetStaticPage(initialEditTarget.staticPage || null);
    }
  }, [initialEditTarget]);

  const filteredPages = useMemo(() => {
    let result = pages;
    if (filterCategory !== 'all') {
      result = result.filter((p) => p.category === filterCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [pages, filterCategory, searchQuery]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setCategory('guide');
    setTagsInput('');
    setDescription('');
    setDifficulty('beginner');
    setSubmissionType('new_page');
    setEditTargetPageId(null);
    setEditTargetStaticPage(null);
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const handleSubmit = async () => {
    if (!isLinked) return;
    if (!title.trim() || !content.trim()) {
      setSubmitError(t('errorRequiredFields'));
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().slice(0, MAX_TAG_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_TAGS);

    const authorName = profile?.name || googleDisplayName || 'Anonymous';

    try {
      if (submissionType === 'new_page') {
        await submitNewPage({
          title: title.trim(),
          content,
          category,
          tags,
          locale,
          authorName,
          authorEmail: googleEmail,
        });
      } else if (submissionType === 'edit_suggestion') {
        await submitEditSuggestion({
          title: title.trim(),
          content,
          category,
          tags,
          locale,
          authorName,
          authorEmail: googleEmail,
          targetPageId: editTargetPageId,
          targetStaticPage: editTargetStaticPage,
        });
      } else if (submissionType === 'resource') {
        await submitResource({
          title: title.trim(),
          content,
          description: description.trim(),
          category,
          tags,
          locale,
          authorName,
          authorEmail: googleEmail,
          difficulty,
        });
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        resetForm();
        setMode('list');
        onClearEditTarget?.();
      }, 2000);
    } catch (error) {
      console.error('[Wiki] Submit failed:', error);
      setSubmitError(t('errorSubmitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = (page: WikiPage) => {
    setSelectedPage(page);
    setMode('detail');
  };

  const openCreate = () => {
    resetForm();
    setMode('create');
  };

  const suggestEditForPage = (page: WikiPage) => {
    resetForm();
    setMode('create');
    setSubmissionType('edit_suggestion');
    setTitle(page.title);
    setContent(page.content);
    setCategory(page.category);
    setTagsInput(page.tags.join(', '));
    setEditTargetPageId(page.id);
  };

  const backToList = () => {
    setMode('list');
    setSelectedPage(null);
    onClearEditTarget?.();
  };

  // --- LIST MODE ---
  if (mode === 'list') {
    return (
      <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        <section className={styles.section}>
          <div className={styles.communityHeader}>
            <div>
              <h2 className={styles.sectionTitle}>{t('communityTitle')}</h2>
              <p className={styles.paragraph}>{t('communityDesc')}</p>
            </div>
            <button className={styles.communityCreateBtn} onClick={openCreate}>
              {t('createPage')}
            </button>
          </div>

          {/* Filters */}
          <div className={styles.communityFilters}>
            <div className={styles.communityFilterTabs}>
              <button
                className={`${styles.communityFilterTab} ${filterCategory === 'all' ? styles.communityFilterTabActive : ''}`}
                onClick={() => setFilterCategory('all')}
              >
                {t('filterAll')}
              </button>
              {WIKI_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  className={`${styles.communityFilterTab} ${filterCategory === cat.value ? styles.communityFilterTabActive : ''}`}
                  onClick={() => setFilterCategory(cat.value)}
                >
                  {t(cat.labelKey)}
                </button>
              ))}
            </div>
            <input
              type="text"
              className={styles.communitySearchInput}
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Page Cards */}
          {loading ? (
            <div className={styles.communityLoading}>{t('loading')}</div>
          ) : filteredPages.length === 0 ? (
            <div className={styles.communityEmpty}>
              <p>{t('noPages')}</p>
            </div>
          ) : (
            <div className={styles.communityGrid}>
              {filteredPages.map((page) => (
                <button
                  key={page.id}
                  className={styles.communityCard}
                  onClick={() => openDetail(page)}
                >
                  <span className={styles.communityCardCategory}>{t(`category${page.category.charAt(0).toUpperCase() + page.category.slice(1)}` as 'categoryGuide')}</span>
                  <h3 className={styles.communityCardTitle}>{page.title}</h3>
                  <div className={styles.communityCardMeta}>
                    <span>{page.authorName}</span>
                    <span>{page.createdAt?.toDate?.()?.toLocaleDateString?.(locale) ?? ''}</span>
                  </div>
                  {page.tags.length > 0 && (
                    <div className={styles.communityCardTags}>
                      {page.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className={styles.communityCardTag}>{tag}</span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>
      </motion.div>
    );
  }

  // --- DETAIL MODE ---
  if (mode === 'detail' && selectedPage) {
    const renderedContent = (() => {
      try {
        const raw = marked.parse(selectedPage.content);
        return sanitizeHtml(typeof raw === 'string' ? raw : '');
      } catch {
        return '<p>Error rendering content</p>';
      }
    })();

    return (
      <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
        <section className={styles.section}>
          <button className={styles.communityBackBtn} onClick={backToList}>
            {t('backToList')}
          </button>

          <div className={styles.communityDetailHeader}>
            <span className={styles.communityCardCategory}>
              {t(`category${selectedPage.category.charAt(0).toUpperCase() + selectedPage.category.slice(1)}` as 'categoryGuide')}
            </span>
            <h2 className={styles.sectionTitle}>{selectedPage.title}</h2>
            <div className={styles.communityDetailMeta}>
              <span>{t('byAuthor', { name: selectedPage.authorName })}</span>
              <span>{selectedPage.createdAt?.toDate?.()?.toLocaleDateString?.(locale) ?? ''}</span>
            </div>
            {selectedPage.tags.length > 0 && (
              <div className={styles.communityCardTags}>
                {selectedPage.tags.map((tag) => (
                  <span key={tag} className={styles.communityCardTag}>{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div
            className={styles.communityMarkdownContent}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />

          <div className={styles.communityDetailActions}>
            <button
              className={styles.communitySuggestEditBtn}
              onClick={() => suggestEditForPage(selectedPage)}
            >
              {t('suggestEdit')}
            </button>
          </div>
        </section>
      </motion.div>
    );
  }

  // --- CREATE / EDIT MODE ---
  return (
    <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <section className={styles.section}>
        <button className={styles.communityBackBtn} onClick={backToList}>
          {t('backToList')}
        </button>

        <h2 className={styles.sectionTitle}>
          {submissionType === 'edit_suggestion' ? t('suggestEdit') : t('createPage')}
        </h2>

        {!isLinked ? (
          <div className={styles.communityLoginPrompt}>
            <p>{t('loginRequired')}</p>
            <button className={styles.communityLoginBtn} onClick={linkGoogle}>
              {t('signInWithGoogle')}
            </button>
          </div>
        ) : (
          <div className={styles.communityForm}>
            {/* Submission type selector */}
            {submissionType !== 'edit_suggestion' && (
              <div className={styles.communityFormGroup}>
                <label className={styles.communityFormLabel}>{t('submissionType')}</label>
                <div className={styles.communityTypeSelector}>
                  {(['new_page', 'resource'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`${styles.communityTypeBtn} ${submissionType === type ? styles.communityTypeBtnActive : ''}`}
                      onClick={() => setSubmissionType(type)}
                    >
                      {t(type === 'new_page' ? 'typeNewPage' : 'typeResource')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className={styles.communityFormGroup}>
              <label className={styles.communityFormLabel}>{t('titleLabel')}</label>
              <input
                type="text"
                className={styles.communityFormInput}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder={t('titlePlaceholder')}
              />
              <span className={styles.communityFormHint}>
                {title.length} / {MAX_TITLE_LENGTH}
              </span>
            </div>

            {/* Category */}
            <div className={styles.communityFormGroup}>
              <label className={styles.communityFormLabel}>{t('categoryLabel')}</label>
              <select
                className={styles.communityFormSelect}
                value={category}
                onChange={(e) => setCategory(e.target.value as WikiCategory)}
              >
                {WIKI_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {t(cat.labelKey)}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div className={styles.communityFormGroup}>
              <label className={styles.communityFormLabel}>{t('tagsLabel')}</label>
              <input
                type="text"
                className={styles.communityFormInput}
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder={t('tagsPlaceholder')}
              />
              <span className={styles.communityFormHint}>{t('tagsHint')}</span>
            </div>

            {/* Description (resources only) */}
            {submissionType === 'resource' && (
              <>
                <div className={styles.communityFormGroup}>
                  <label className={styles.communityFormLabel}>{t('descriptionLabel')}</label>
                  <input
                    type="text"
                    className={styles.communityFormInput}
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
                    placeholder={t('descriptionPlaceholder')}
                  />
                </div>
                <div className={styles.communityFormGroup}>
                  <label className={styles.communityFormLabel}>{t('difficultyLabel')}</label>
                  <select
                    className={styles.communityFormSelect}
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'beginner' | 'intermediate' | 'advanced')}
                  >
                    <option value="beginner">{t('difficultyBeginner')}</option>
                    <option value="intermediate">{t('difficultyIntermediate')}</option>
                    <option value="advanced">{t('difficultyAdvanced')}</option>
                  </select>
                </div>
              </>
            )}

            {/* Content Editor */}
            <div className={styles.communityFormGroup}>
              <label className={styles.communityFormLabel}>{t('contentLabel')}</label>
              <WikiEditor
                value={content}
                onChange={setContent}
                placeholder={t('contentPlaceholder')}
              />
            </div>

            {/* Submit */}
            {submitError && <div className={styles.communityFormError}>{submitError}</div>}
            {submitSuccess && <div className={styles.communityFormSuccess}>{t('submitSuccess')}</div>}

            <button
              className={styles.communitySubmitBtn}
              onClick={handleSubmit}
              disabled={submitting || !title.trim() || !content.trim()}
            >
              {submitting ? t('submitting') : t('submitForReview')}
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
}
