import { studyDay } from './studyDay';

export type Section = 'VARC' | 'DILR' | 'QA' | 'GENERAL';

export const SECTIONS: readonly Section[] = ['VARC', 'DILR', 'QA', 'GENERAL'];

export type ErrorCause = 'concept-gap' | 'silly-mistake' | 'time-pressure' | 'misread';

export interface StudySession {
  id: string;
  studyDay: string; // 'YYYY-MM-DD', 4am boundary
  startedAt: string; // ISO, absolute
  activeSeconds: number; // idle already excluded
  section: Section;
  filePath?: string;
  attempted?: number;
  correct?: number;
  note?: string;
}

export interface ReadingEntry {
  id: string;
  studyDay: string;
  source: string;
  title: string;
  minutes: number;
  /** Your one-liner. Required - writing it is the practice. */
  summary: string;
}

/**
 * A note written whenever something is worth keeping - mid-page, between sets,
 * or long after the reader is closed. Unlike ReadingEntry and ErrorEntry it
 * demands no structure beyond a body: the cost of writing one has to stay near
 * zero or they stop being written at all.
 */
export interface NoteEntry {
  id: string;
  studyDay: string;
  createdAt: string; // ISO, absolute
  section: Section;
  body: string;
  /** What was open when it was written, when anything was. */
  filePath?: string;
  page?: number;
}

export interface ErrorEntry {
  id: string;
  studyDay: string;
  section: Section;
  topic: string;
  cause: ErrorCause;
  note: string;
  reviewedOn?: string;
}

export interface MockSectionResult {
  attempted: number;
  correct: number;
  score: number;
}

export interface MockResult {
  id: string;
  date: string;
  provider: string;
  sections: Record<Section, MockSectionResult>;
  percentile?: number;
}

export interface Recording {
  id: string;
  studyDay: string;
  filePath: string;
  topic: string;
  durationSeconds: number;
  selfRating?: 1 | 2 | 3 | 4 | 5;
  rewatchedOn?: string;
}

export interface AppState {
  version: 1;
  sessions: StudySession[];
  reading: ReadingEntry[];
  notes: NoteEntry[];
  errors: ErrorEntry[];
  mocks: MockResult[];
  recordings: Recording[];
  lastPage: Record<string, number>;
  /** Written from computeStreak(); derived, never read back in. */
  streakFreezesUsed: string[];
}

export const CURRENT_VERSION = 1 as const;

export function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    sessions: [],
    reading: [],
    notes: [],
    errors: [],
    mocks: [],
    recordings: [],
    lastPage: {},
    streakFreezesUsed: [],
  };
}

/**
 * Top-level folder name decides the section. Saves a dropdown three times a day
 * for 450 days. The app never enforces the convention - anything unrecognised,
 * including files sitting at the vault root, is GENERAL.
 */
export function sectionForPath(vaultRelativePath: string): Section {
  const top = vaultRelativePath.split('/')[0]?.toUpperCase();
  if (top === 'VARC' || top === 'DILR' || top === 'QA') return top;
  return 'GENERAL';
}

/** Crypto-backed id; every record needs one and collisions would be silent. */
export function newId(): string {
  return crypto.randomUUID();
}

export interface NoteDraft {
  body: string;
  section: Section;
  filePath?: string;
  page?: number;
  /** Injectable for tests; the wall clock otherwise. */
  at?: Date;
}

/**
 * Both timestamps come from one instant here rather than from two separate
 * now() calls: a note written at 03:59:59.9 must not land on one study day
 * while its ISO stamp says the other.
 */
export function createNote(draft: NoteDraft): NoteEntry {
  const at = draft.at ?? new Date();
  return {
    id: newId(),
    studyDay: studyDay(at),
    createdAt: at.toISOString(),
    section: draft.section,
    body: draft.body.trim(),
    ...(draft.filePath !== undefined ? { filePath: draft.filePath } : {}),
    ...(draft.page !== undefined ? { page: draft.page } : {}),
  };
}
