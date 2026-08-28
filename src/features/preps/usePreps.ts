import type { Prep, Section } from '@/lib/model';
import { prepFolders, sectionsForPrep, treeForPrep } from '@/lib/prepTree';
import { useProgress } from '@/store/useProgress';
import { useVault } from '@/store/useVault';
import type { TreeNode } from '@/vault';

/**
 * Where the two stores meet.
 *
 * A prep is half state.json (its name and deadline) and half filesystem (its
 * material). Joining them in hooks keeps that seam in one place instead of in
 * every component that needs a scoped tree.
 */

export function usePreps(): Prep[] {
  return useProgress((s) => s.state.preps);
}

export function useActivePrep(): Prep | null {
  return useProgress((s) => s.state.preps.find((p) => p.id === s.state.activePrepId) ?? null);
}

export function usePrepTree(): TreeNode[] {
  const tree = useVault((s) => s.tree);
  const prep = useActivePrep();
  const preps = usePreps();
  return treeForPrep(tree, prep, preps);
}

export function usePrepSections(): Section[] {
  const tree = useVault((s) => s.tree);
  const prep = useActivePrep();
  const preps = usePreps();
  return sectionsForPrep(tree, prep, preps);
}

/** Vault-relative folders an import may target, scoped to the active prep. */
export function usePrepDestinations(): string[] {
  const tree = useVault((s) => s.tree);
  const prep = useActivePrep();
  const preps = usePreps();
  return prepFolders(tree, prep, preps);
}
