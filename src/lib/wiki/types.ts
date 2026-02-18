import type { Timestamp } from 'firebase/firestore';

export type WikiCategory = 'guide' | 'tutorial' | 'tip' | 'general';
export type SubmissionType = 'new_page' | 'edit_suggestion' | 'resource';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface WikiPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  category: WikiCategory;
  tags: string[];
  locale: string;
  authorUid: string;
  authorName: string;
  authorEmail: string | null;
  forYouEligible: boolean;
  approvedBy: string;
  approvedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
}

export interface WikiSubmission {
  id: string;
  type: SubmissionType;
  targetPageId: string | null;
  targetStaticPage: string | null;
  title: string;
  content: string;
  description: string;
  category: WikiCategory;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  locale: string;
  authorUid: string;
  authorName: string;
  authorEmail: string | null;
  status: SubmissionStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
}

export interface SubmitNewPageData {
  title: string;
  content: string;
  category: WikiCategory;
  tags: string[];
  locale: string;
  authorName: string;
  authorEmail: string | null;
}

export interface SubmitEditSuggestionData extends SubmitNewPageData {
  targetPageId: string | null;
  targetStaticPage: string | null;
}

export interface SubmitResourceData extends SubmitNewPageData {
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface AdminAction {
  action: 'approve' | 'reject';
  submissionId: string;
  reviewNote?: string;
}
