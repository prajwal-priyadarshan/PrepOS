import { studyDay } from './studyDay';

/**
 * A section is the first folder inside a prep - 'QA', 'Transactions', 'DSA'.
 *
 * Deliberately not a union any more. Preps define their own sections by the
 * folders they contain, and adding a subject the week before an exam must not
 * require a code change.
 */
export type Section = string;

/** Material sitting loose in a prep folder, in no section of its own. */
export const GENERAL_SECTION = 'GENERAL';

/**
 * One thing you are preparing for.
 *
 * A prep is a folder plus a deadline. The folder is the source of truth for
 * what material belongs to it - the same rule as sections, one level up - so
 * moving a PDF between preps is a drag in Explorer, not a database edit.
 */
export interface Prep {
  id: string;
  name: string;
  /** Vault-relative. '' means the whole vault, which is what a pre-preps vault was. */
  folder: string;
  /** 'YYYY-MM-DD'. Absent for open-ended prep with no date to count down to. */
  targetDate?: string;
  archived?: boolean;
}

/**
 * The prep every pre-existing record belongs to.
 *
 * Migration only. A fresh vault starts with no preps at all and asks what the
 * first one is for - seeding a named exam here is how the app was CAT-shaped in
 * the first place. The id is fixed rather than generated so the backfill that
 * uses it stays idempotent.
 */
export const DEFAULT_PREP_ID = 'prep-default';

/** Deliberately unnamed and open-ended: it is whatever the user was already
 *  doing before preps existed, and both fields are theirs to correct. */
export function defaultPrep(): Prep {
  return { id: DEFAULT_PREP_ID, name: 'My prep', folder: '' };
}

/**
 * A change to a prep.
 *
 * A key that is absent leaves the field alone; a key present and undefined
 * removes it. The distinction is only expressible because
 * exactOptionalPropertyTypes is on, and it is the whole reason this type exists
 * instead of a plain Partial: clearing a deadline - going back to open-ended
 * prep - has to mean something different from not touching it.
 */
export interface PrepEdit {
  name?: string;
  folder?: string;
  targetDate?: string | undefined;
  archived?: boolean | undefined;
}

export function applyPrepEdit(prep: Prep, edit: PrepEdit): Prep {
  const next: Prep = {
    ...prep,
    ...(edit.name !== undefined ? { name: edit.name } : {}),
    ...(edit.folder !== undefined ? { folder: edit.folder } : {}),
  };
  // Deleted rather than set to undefined so the key leaves the written JSON
  // too, and a cleared deadline reads the same on reload as one never set.
  if ('targetDate' in edit) {
    if (edit.targetDate === undefined) delete next.targetDate;
    else next.targetDate = edit.targetDate;
  }
  if ('archived' in edit) {
    if (edit.archived === undefined) delete next.archived;
    else next.archived = edit.archived;
  }
  return next;
}

export function isPrep(value: unknown): value is Prep {
  if (typeof value !== 'object' || value === null) return false;
  const raw = value as Record<string, unknown>;
  return (
    typeof raw.id === 'string' &&
    typeof raw.name === 'string' &&
    typeof raw.folder === 'string' &&
    raw.id.length > 0
  );
}

export type ErrorCause = 'concept-gap' | 'silly-mistake' | 'time-pressure' | 'misread';

export interface StudySession {
  id: string;
  prepId: string;
  studyDay: string; // 'YYYY-MM-DD', 4am boundary
  startedAt: string; // ISO, absolute
  activeSeconds: number; // idle already excluded
  section: Section;
  filePath?: string;
  attempted?: number;
  correct?: number;
  note?: string;
}

/**
 * A note written whenever something is worth keeping - mid-page, between sets,
 * or long after the reader is closed. Unlike ReadingEntry and ErrorEntry it
 * demands no structure beyond a body: the cost of writing one has to stay near
 * zero or they stop being written at all.
 */
export interface NoteEntry {
  id: string;
  prepId: string;
  studyDay: string;
  createdAt: string; // ISO, absolute
  section: Section;
  body: string;
  /** What was open when it was written, when anything was. */
  filePath?: string;
  page?: number;
}

export interface ReadingEntry {
  id: string;
  prepId: string;
  studyDay: string;
  source: string;
  title: string;
  minutes: number;
  /** Your one-liner. Required - writing it is the practice. */
  summary: string;
}

export interface ErrorEntry {
  id: string;
  prepId: string;
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
  prepId: string;
  date: string;
  provider: string;
  sections: Record<Section, MockSectionResult>;
  percentile?: number;
}

export interface Recording {
  id: string;
  prepId: string;
  studyDay: string;
  filePath: string;
  topic: string;
  durationSeconds: number;
  selfRating?: 1 | 2 | 3 | 4 | 5;
  rewatchedOn?: string;
}

export interface AppState {
  version: 2;
  preps: Prep[];
  activePrepId: string;
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

export const CURRENT_VERSION = 2 as const;

/**
 * No preps, and no active one.
 *
 * An empty `preps` is the signal that nothing has been set up yet - the app
 * shows the first-prep screen instead of the workspace. Seeding a placeholder
 * here would put the user inside someone else's exam on first launch.
 */
export function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    preps: [],
    activePrepId: '',
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

/** '' for the whole vault; otherwise the path with the prep folder stripped. */
export function relativeToPrep(vaultRelativePath: string, prepFolder: string): string {
  if (prepFolder === '') return vaultRelativePath;
  if (vaultRelativePath === prepFolder) return '';
  if (vaultRelativePath.startsWith(`${prepFolder}/`)) {
    return vaultRelativePath.slice(prepFolder.length + 1);
  }
  return vaultRelativePath;
}

export function isInPrep(vaultRelativePath: string, prepFolder: string): boolean {
  if (prepFolder === '') return true;
  return vaultRelativePath === prepFolder || vaultRelativePath.startsWith(`${prepFolder}/`);
}

/**
 * Folder name decides the section. Saves a dropdown three times a day for 450
 * days. The app never enforces the convention - a file sitting loose in the
 * prep folder is GENERAL.
 */
export function sectionForPath(vaultRelativePath: string, prepFolder = ''): Section {
  const parts = relativeToPrep(vaultRelativePath, prepFolder)
    .split('/')
    .filter((part) => part.length > 0);
  // One part is the file itself, with no folder above it.
  return parts.length > 1 ? (parts[0] ?? GENERAL_SECTION) : GENERAL_SECTION;
}

/** Crypto-backed id; every record needs one and collisions would be silent. */
export function newId(): string {
  return crypto.randomUUID();
}

export interface NoteDraft {
  body: string;
  section: Section;
  prepId: string;
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
    prepId: draft.prepId,
    studyDay: studyDay(at),
    createdAt: at.toISOString(),
    section: draft.section,
    body: draft.body.trim(),
    ...(draft.filePath !== undefined ? { filePath: draft.filePath } : {}),
    ...(draft.page !== undefined ? { page: draft.page } : {}),
  };
}
