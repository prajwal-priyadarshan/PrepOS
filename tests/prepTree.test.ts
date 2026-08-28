import { describe, expect, it } from 'vitest';
import { GENERAL_SECTION, type Prep } from '../src/lib/model';
import {
  excludePaths,
  prepFolders,
  sectionsForPrep,
  subtreeAt,
  treeForPrep,
} from '../src/lib/prepTree';
import type { TreeNode } from '../src/vault/VaultAdapter';

const dir = (name: string, path: string, children: TreeNode[] = []): TreeNode => ({
  name,
  path,
  isDirectory: true,
  children,
});
const file = (name: string, path: string): TreeNode => ({ name, path, isDirectory: false });

/** A vault mid-migration: CAT still at the root, two newer preps beside it. */
const vault: TreeNode[] = [
  dir('DBMS', 'DBMS', [
    dir('Indexing', 'DBMS/Indexing', [file('btree.pdf', 'DBMS/Indexing/btree.pdf')]),
    file('syllabus.pdf', 'DBMS/syllabus.pdf'),
  ]),
  dir('Interview', 'Interview', [dir('DSA', 'Interview/DSA')]),
  dir('QA', 'QA', [file('set-3.pdf', 'QA/set-3.pdf')]),
  dir('VARC', 'VARC', []),
  file('loose.pdf', 'loose.pdf'),
];

const CAT: Prep = { id: 'cat', name: 'CAT 2027', folder: '' };
const DBMS: Prep = { id: 'dbms', name: 'DBMS endsem', folder: 'DBMS' };
const INTERVIEW: Prep = { id: 'int', name: 'Interview', folder: 'Interview' };
const ALL = [CAT, DBMS, INTERVIEW];

describe('subtreeAt', () => {
  it('returns the whole tree for the vault root', () => {
    expect(subtreeAt(vault, '')).toHaveLength(vault.length);
  });

  it('descends to a nested folder', () => {
    expect(subtreeAt(vault, 'DBMS/Indexing').map((n) => n.name)).toEqual(['btree.pdf']);
  });

  it('is empty for a folder that is not there', () => {
    expect(subtreeAt(vault, 'Gone')).toEqual([]);
  });
});

describe('excludePaths', () => {
  it('drops whole branches by path', () => {
    const kept = excludePaths(vault, new Set(['DBMS', 'Interview']));
    expect(kept.map((n) => n.name)).toEqual(['QA', 'VARC', 'loose.pdf']);
  });

  it('does not mutate the tree it was given', () => {
    excludePaths(vault, new Set(['DBMS']));
    expect(vault.map((n) => n.name)).toContain('DBMS');
  });
});

describe('treeForPrep', () => {
  it('scopes a foldered prep to its own material', () => {
    expect(treeForPrep(vault, DBMS, ALL).map((n) => n.name)).toEqual(['Indexing', 'syllabus.pdf']);
  });

  it('keeps other preps out of a prep rooted at the vault', () => {
    // The whole point: CAT lives at the root, so without this it would list
    // DBMS and Interview as if they were CAT sections.
    expect(treeForPrep(vault, CAT, ALL).map((n) => n.name)).toEqual(['QA', 'VARC', 'loose.pdf']);
  });

  it('shows everything when there is no prep', () => {
    expect(treeForPrep(vault, null, ALL)).toHaveLength(vault.length);
  });
});

describe('sectionsForPrep', () => {
  it('reads sections off the prep folders', () => {
    expect(sectionsForPrep(vault, DBMS, ALL)).toEqual(['Indexing', GENERAL_SECTION]);
    expect(sectionsForPrep(vault, CAT, ALL)).toEqual(['QA', 'VARC', GENERAL_SECTION]);
  });

  it('always offers GENERAL, and never twice', () => {
    const withGeneral: TreeNode[] = [dir(GENERAL_SECTION, GENERAL_SECTION)];
    expect(sectionsForPrep(withGeneral, CAT, [CAT])).toEqual([GENERAL_SECTION]);
  });

  it('is just GENERAL for a prep with no folders yet', () => {
    expect(sectionsForPrep(vault, INTERVIEW, ALL)).toEqual(['DSA', GENERAL_SECTION]);
    expect(sectionsForPrep([], DBMS, ALL)).toEqual([GENERAL_SECTION]);
  });
});

describe('prepFolders', () => {
  it('offers the prep root first, then its folders depth-first', () => {
    expect(prepFolders(vault, DBMS, ALL)).toEqual(['DBMS', 'DBMS/Indexing']);
  });

  it('excludes other preps from a root prep destination list', () => {
    expect(prepFolders(vault, CAT, ALL)).toEqual(['', 'QA', 'VARC']);
  });
});
