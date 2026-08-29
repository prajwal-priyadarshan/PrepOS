import { joinPath, type TreeNode, type VaultAdapter } from '@/vault/VaultAdapter';

/**
 * Path arithmetic for bringing outside files in.
 *
 * Kept away from TauriVault so the rules that decide where an imported PDF
 * lands - and what it is called when the name is taken - are testable without
 * a filesystem. The adapter only copies bytes.
 */

/** Last segment of a path, either separator. '' when there is no segment. */
export function fileNameOf(path: string): string {
  const parts = path.replace(/\\/g, '/').split('/');
  return parts.at(-1) ?? '';
}

/** ['set-3', '.pdf'] - extension includes the dot, '' when there is none. */
export function splitExtension(name: string): [string, string] {
  const dot = name.lastIndexOf('.');
  // A leading dot is a hidden file, not an extension.
  if (dot <= 0) return [name, ''];
  return [name.slice(0, dot), name.slice(dot)];
}

/**
 * A free name in a folder that already holds `existing`.
 *
 * Importing the same set twice is a normal thing to do - a second copy of last
 * week's paper with fresh annotations. Overwriting the first one silently is
 * not an acceptable answer, so the second becomes 'set-3 (2).pdf'.
 * Comparison is case-insensitive: Windows would collide where a check on exact
 * names would not.
 */
export function uniqueName(existing: readonly string[], name: string): string {
  const taken = new Set(existing.map((n) => n.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;

  const [stem, ext] = splitExtension(name);
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

/**
 * Every folder in the tree, depth-first, as vault-relative paths. '' - the
 * vault root - is first, so it can be the default destination.
 */
export function flattenDirs(nodes: readonly TreeNode[]): string[] {
  const out: string[] = [''];
  const walk = (level: readonly TreeNode[]) => {
    for (const node of level) {
      if (!node.isDirectory) continue;
      out.push(node.path);
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/** How a destination folder is labelled in the picker, relative to its prep. */
export function dirLabel(path: string, prepFolder = ''): string {
  if (path === prepFolder) return prepFolder === '' ? '/ (vault root)' : '/ (prep root)';
  if (prepFolder !== '' && path.startsWith(`${prepFolder}/`)) {
    return path.slice(prepFolder.length + 1);
  }
  return path === '' ? '/ (vault root)' : path;
}

export const PDF_EXTENSION = 'pdf';

/** Old and new PowerPoint alike - a vault holds years of both. */
export const PRESENTATION_EXTENSIONS = ['ppt', 'pptx'] as const;

/** What "Add PDFs or PPTs" offers the file picker. */
export const IMPORTABLE_EXTENSIONS = [PDF_EXTENSION, ...PRESENTATION_EXTENSIONS];

export function isPdf(path: string): boolean {
  return path.toLowerCase().endsWith(`.${PDF_EXTENSION}`);
}

/**
 * Copy outside files into `destDir`, renaming around collisions. Returns how
 * many landed.
 *
 * Sequential on purpose: the names already claimed by this same batch have to
 * be visible to the next file, and a study vault import is a handful of files,
 * not a thousand.
 */
export async function importInto(
  vault: VaultAdapter,
  destDir: string,
  sources: readonly string[],
): Promise<number> {
  if (sources.length === 0) return 0;
  if (destDir !== '' && !(await vault.exists(destDir))) await vault.mkdirp(destDir);

  const taken = (await vault.listDir(destDir)).map((entry) => entry.name);
  let added = 0;
  for (const source of sources) {
    const name = uniqueName(taken, fileNameOf(source));
    taken.push(name);
    await vault.importFile(source, joinPath(destDir, name));
    added += 1;
  }
  return added;
}
