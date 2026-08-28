import { describe, expect, it } from 'vitest';
import {
  dirLabel,
  fileNameOf,
  flattenDirs,
  importInto,
  isPdf,
  splitExtension,
  uniqueName,
} from '../src/lib/importPath';
import type { TreeNode } from '../src/vault/VaultAdapter';
import { FakeVault } from './fakeVault';

describe('fileNameOf', () => {
  it('takes the last segment of either separator', () => {
    expect(fileNameOf('C:/Users/x/Downloads/set-3.pdf')).toBe('set-3.pdf');
    expect(fileNameOf('C:\\Users\\x\\Downloads\\set-3.pdf')).toBe('set-3.pdf');
    expect(fileNameOf('set-3.pdf')).toBe('set-3.pdf');
  });
});

describe('splitExtension', () => {
  it('splits on the last dot', () => {
    expect(splitExtension('set-3.pdf')).toEqual(['set-3', '.pdf']);
    expect(splitExtension('cat.2024.mock.pdf')).toEqual(['cat.2024.mock', '.pdf']);
  });

  it('treats a leading dot as a hidden file, not an extension', () => {
    expect(splitExtension('.catprep')).toEqual(['.catprep', '']);
    expect(splitExtension('README')).toEqual(['README', '']);
  });
});

describe('uniqueName', () => {
  it('keeps a free name as it is', () => {
    expect(uniqueName(['a.pdf'], 'set-3.pdf')).toBe('set-3.pdf');
  });

  it('numbers around a collision', () => {
    expect(uniqueName(['set-3.pdf'], 'set-3.pdf')).toBe('set-3 (2).pdf');
    expect(uniqueName(['set-3.pdf', 'set-3 (2).pdf'], 'set-3.pdf')).toBe('set-3 (3).pdf');
  });

  it('collides case-insensitively - the vault may sit on Windows', () => {
    expect(uniqueName(['SET-3.PDF'], 'set-3.pdf')).toBe('set-3 (2).pdf');
  });

  it('handles a name with no extension', () => {
    expect(uniqueName(['notes'], 'notes')).toBe('notes (2)');
  });
});

const tree: TreeNode[] = [
  {
    name: 'QA',
    path: 'QA',
    isDirectory: true,
    children: [
      { name: 'Arithmetic', path: 'QA/Arithmetic', isDirectory: true, children: [] },
      { name: 'set-3.pdf', path: 'QA/set-3.pdf', isDirectory: false },
    ],
  },
  { name: 'VARC', path: 'VARC', isDirectory: true, children: [] },
  { name: 'loose.pdf', path: 'loose.pdf', isDirectory: false },
];

describe('flattenDirs', () => {
  it('lists the root first, then every folder depth-first', () => {
    expect(flattenDirs(tree)).toEqual(['', 'QA', 'QA/Arithmetic', 'VARC']);
  });

  it('is just the root for an empty vault', () => {
    expect(flattenDirs([])).toEqual(['']);
  });
});

describe('dirLabel', () => {
  it('names the root rather than showing an empty option', () => {
    expect(dirLabel('')).toBe('/ (vault root)');
    expect(dirLabel('QA/Arithmetic')).toBe('QA/Arithmetic');
  });
});

describe('isPdf', () => {
  it('ignores case', () => {
    expect(isPdf('a/B.PDF')).toBe(true);
    expect(isPdf('a/b.pdf')).toBe(true);
    expect(isPdf('a/b.txt')).toBe(false);
  });
});

describe('importInto', () => {
  function vaultWith(outside: Record<string, string>): FakeVault {
    const vault = new FakeVault();
    for (const [path, body] of Object.entries(outside)) vault.outside.set(path, body);
    return vault;
  }

  it('copies picked files into the destination folder', async () => {
    const vault = vaultWith({ 'D:/dl/set-3.pdf': 'THREE', 'D:/dl/set-4.pdf': 'FOUR' });
    vault.dirs.add('QA');

    const added = await importInto(vault, 'QA', ['D:/dl/set-3.pdf', 'D:/dl/set-4.pdf']);

    expect(added).toBe(2);
    expect(vault.files.get('QA/set-3.pdf')).toBe('THREE');
    expect(vault.files.get('QA/set-4.pdf')).toBe('FOUR');
  });

  it('imports to the vault root when no folder is chosen', async () => {
    const vault = vaultWith({ 'D:/dl/set-3.pdf': 'THREE' });

    await importInto(vault, '', ['D:/dl/set-3.pdf']);

    expect(vault.files.get('set-3.pdf')).toBe('THREE');
  });

  it('never overwrites a file already in the vault', async () => {
    const vault = vaultWith({ 'D:/dl/set-3.pdf': 'NEW' });
    vault.dirs.add('QA');
    vault.files.set('QA/set-3.pdf', 'ANNOTATED');

    await importInto(vault, 'QA', ['D:/dl/set-3.pdf']);

    expect(vault.files.get('QA/set-3.pdf')).toBe('ANNOTATED');
    expect(vault.files.get('QA/set-3 (2).pdf')).toBe('NEW');
  });

  it('keeps two same-named files picked in one go apart', async () => {
    const vault = vaultWith({ 'D:/a/set-3.pdf': 'A', 'D:/b/set-3.pdf': 'B' });
    vault.dirs.add('QA');

    const added = await importInto(vault, 'QA', ['D:/a/set-3.pdf', 'D:/b/set-3.pdf']);

    expect(added).toBe(2);
    expect(vault.files.get('QA/set-3.pdf')).toBe('A');
    expect(vault.files.get('QA/set-3 (2).pdf')).toBe('B');
  });

  it('creates a destination folder that does not exist yet', async () => {
    const vault = vaultWith({ 'D:/dl/set-3.pdf': 'THREE' });

    await importInto(vault, 'QA/Arithmetic', ['D:/dl/set-3.pdf']);

    expect(vault.ops).toContain('mkdir QA/Arithmetic');
    expect(vault.files.get('QA/Arithmetic/set-3.pdf')).toBe('THREE');
  });

  it('does nothing when the pick was cancelled', async () => {
    const vault = vaultWith({});

    expect(await importInto(vault, 'QA', [])).toBe(0);
    expect(vault.ops).toEqual([]);
  });
});
