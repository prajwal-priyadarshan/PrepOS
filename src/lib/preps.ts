import type { AppState, Prep } from './model';

/** The prep in force, or null if the id has gone stale. */
export function activePrepOf(state: AppState): Prep | null {
  return state.preps.find((prep) => prep.id === state.activePrepId) ?? null;
}

export function prepById(state: AppState, id: string): Prep | null {
  return state.preps.find((prep) => prep.id === id) ?? null;
}

export function prepName(state: AppState, id: string): string {
  return prepById(state, id)?.name ?? 'Unfiled';
}

/**
 * A folder name from a typed one: 'Amazon SDE interview' -> 'Amazon-SDE-interview'.
 *
 * Used for prep folders and for the sections inside them. Only a suggestion
 * where the dialog lets it be edited - but either way it has to be safe on
 * Windows, where a colon or a question mark makes a folder that cannot be
 * created and an error that does not say why.
 */
export function folderSlug(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^A-Za-z0-9 _-]/g, '')
    .replace(/ +/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return cleaned.length > 0 ? cleaned : 'prep';
}

/** Rejects a folder that would collide with a prep that already exists. */
export function folderIsFree(preps: readonly Prep[], folder: string, exceptId?: string): boolean {
  const wanted = folder.toLowerCase();
  return !preps.some((prep) => prep.id !== exceptId && prep.folder.toLowerCase() === wanted);
}
