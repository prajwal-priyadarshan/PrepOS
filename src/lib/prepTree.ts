import type { TreeNode } from '@/vault/VaultAdapter';
import { GENERAL_SECTION, type Prep, type Section } from './model';

/**
 * Scoping the vault to one prep.
 *
 * Pure tree surgery, kept out of the store so the awkward case - a prep rooted
 * at the vault itself, with other preps nested inside it - is testable rather
 * than discovered as one prep's PDFs showing up in another prep's tree.
 */

/** The nodes at `folder`, or the whole tree when it is ''. */
export function subtreeAt(nodes: readonly TreeNode[], folder: string): TreeNode[] {
  if (folder === '') return [...nodes];
  for (const node of nodes) {
    if (node.path === folder) return [...(node.children ?? [])];
    if (node.isDirectory && node.children && folder.startsWith(`${node.path}/`)) {
      return subtreeAt(node.children, folder);
    }
  }
  // The folder is gone - deleted outside the app, or not created yet.
  return [];
}

/** Drop whole branches by path. Used to keep other preps out of a root prep. */
export function excludePaths(
  nodes: readonly TreeNode[],
  excluded: ReadonlySet<string>,
): TreeNode[] {
  const out: TreeNode[] = [];
  for (const node of nodes) {
    if (excluded.has(node.path)) continue;
    out.push(
      node.children ? { ...node, children: excludePaths(node.children, excluded) } : { ...node },
    );
  }
  return out;
}

/**
 * What one prep's file tree looks like.
 *
 * A prep at the vault root would otherwise swallow every other prep's folder,
 * so those are cut out - the only place the preps have to know about each other.
 */
export function treeForPrep(
  nodes: readonly TreeNode[],
  prep: Prep | null,
  allPreps: readonly Prep[] = [],
): TreeNode[] {
  if (prep === null) return [...nodes];
  const scoped = subtreeAt(nodes, prep.folder);
  const others = new Set(
    allPreps.filter((p) => p.id !== prep.id && p.folder !== '').map((p) => p.folder),
  );
  return others.size === 0 ? scoped : excludePaths(scoped, others);
}

/**
 * The sections a prep offers: its immediate subfolders, plus GENERAL for
 * material that never got filed. Derived from disk, never from a constant.
 */
export function sectionsForPrep(
  nodes: readonly TreeNode[],
  prep: Prep | null,
  allPreps: readonly Prep[] = [],
): Section[] {
  const scoped = treeForPrep(nodes, prep, allPreps);
  const folders = scoped.filter((node) => node.isDirectory).map((node) => node.name);
  return folders.includes(GENERAL_SECTION) ? folders : [...folders, GENERAL_SECTION];
}

/** Folders inside a prep, as vault-relative paths, for the import destination. */
export function prepFolders(
  nodes: readonly TreeNode[],
  prep: Prep | null,
  allPreps: readonly Prep[] = [],
): string[] {
  const root = prep?.folder ?? '';
  const out: string[] = [root];
  const walk = (level: readonly TreeNode[]) => {
    for (const node of level) {
      if (!node.isDirectory) continue;
      out.push(node.path);
      if (node.children) walk(node.children);
    }
  };
  walk(treeForPrep(nodes, prep, allPreps));
  return out;
}
