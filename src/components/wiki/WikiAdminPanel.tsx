'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { marked } from 'marked';
import { useGoogleSync } from '@/lib/google-sync/context';
import { isWikiAdmin } from '@/lib/wiki/constants';
import { auth } from '@/lib/rhythmia/firebase';
import styles from './WikiPage.module.css';

interface Submission {
  id: string;
  type: string;
  title: string;
  content: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: string | null;
  authorName: string;
  authorEmail: string | null;
  status: string;
  createdAt: string | null;
  targetStaticPage: string | null;
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

export default function WikiAdminPanel() {
  const t = useTranslations('wiki');
  const { googleEmail } = useGoogleSync();

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isAdmin = isWikiAdmin(googleEmail);

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const user = auth?.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, []);

  const fetchSubmissions = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');

    try {
      const token = await getAuthToken();
      if (!token) {
        setError(t('errorAuth'));
        setLoading(false);
        return;
      }

      const res = await fetch('/api/wiki', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError(t('errorFetchSubmissions'));
        setLoading(false);
        return;
      }

      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch {
      setError(t('errorFetchSubmissions'));
    } finally {
      setLoading(false);
    }
  }, [isAdmin, getAuthToken, t]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleAction = async (submissionId: string, action: 'approve' | 'reject') => {
    setActionLoading(submissionId);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch('/api/wiki', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          submissionId,
          reviewNote: reviewNotes[submissionId] || '',
        }),
      });

      if (res.ok) {
        setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
      }
    } catch {
      setError(t('errorActionFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  if (!isAdmin) {
    return null;
  }

  const typeLabels: Record<string, string> = {
    new_page: t('typeNewPage'),
    edit_suggestion: t('typeSuggestEdit'),
    resource: t('typeResource'),
  };

  return (
    <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>{t('adminTitle')}</h2>
        <p className={styles.paragraph}>{t('adminDesc')}</p>

        {error && <div className={styles.communityFormError}>{error}</div>}

        {loading ? (
          <div className={styles.communityLoading}>{t('loading')}</div>
        ) : submissions.length === 0 ? (
          <div className={styles.communityEmpty}>
            <p>{t('noPendingSubmissions')}</p>
          </div>
        ) : (
          <div className={styles.adminList}>
            {submissions.map((sub) => {
              const isExpanded = expandedId === sub.id;
              const renderedPreview = (() => {
                if (!isExpanded) return '';
                try {
                  const raw = marked.parse(sub.content);
                  return sanitizeHtml(typeof raw === 'string' ? raw : '');
                } catch {
                  return '<p>Error rendering preview</p>';
                }
              })();

              return (
                <div key={sub.id} className={styles.adminItem}>
                  <div
                    className={styles.adminItemHeader}
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className={styles.adminItemInfo}>
                      <span className={styles.adminItemType}>{typeLabels[sub.type] || sub.type}</span>
                      <h3 className={styles.adminItemTitle}>{sub.title}</h3>
                      <div className={styles.adminItemMeta}>
                        <span>{sub.authorName}</span>
                        {sub.authorEmail && <span>{sub.authorEmail}</span>}
                        {sub.createdAt && (
                          <span>{new Date(sub.createdAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      {sub.targetStaticPage && (
                        <span className={styles.adminItemTarget}>
                          {t('editTargetLabel')}: {sub.targetStaticPage}
                        </span>
                      )}
                    </div>
                    <span className={styles.adminItemExpandIcon}>
                      {isExpanded ? '▲' : '▼'}
                    </span>
                  </div>

                  {isExpanded && (
                    <div className={styles.adminItemBody}>
                      {sub.description && (
                        <p className={styles.adminItemDescription}>{sub.description}</p>
                      )}
                      <div
                        className={styles.communityMarkdownContent}
                        dangerouslySetInnerHTML={{ __html: renderedPreview }}
                      />
                      <div className={styles.adminItemActions}>
                        <input
                          type="text"
                          className={styles.communityFormInput}
                          placeholder={t('reviewNotePlaceholder')}
                          value={reviewNotes[sub.id] || ''}
                          onChange={(e) =>
                            setReviewNotes((prev) => ({ ...prev, [sub.id]: e.target.value }))
                          }
                        />
                        <div className={styles.adminItemBtns}>
                          <button
                            className={styles.adminApproveBtn}
                            onClick={() => handleAction(sub.id, 'approve')}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? '...' : t('approve')}
                          </button>
                          <button
                            className={styles.adminRejectBtn}
                            onClick={() => handleAction(sub.id, 'reject')}
                            disabled={actionLoading === sub.id}
                          >
                            {actionLoading === sub.id ? '...' : t('reject')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
}
