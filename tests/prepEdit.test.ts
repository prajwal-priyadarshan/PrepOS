import { describe, expect, it } from 'vitest';
import { applyPrepEdit, type Prep } from '../src/lib/model';

const dated: Prep = { id: 'p', name: 'DBMS endsem', folder: 'DBMS', targetDate: '2026-11-20' };

describe('applyPrepEdit', () => {
  it('changes only the fields it names', () => {
    expect(applyPrepEdit(dated, { name: 'DBMS retake' })).toEqual({
      ...dated,
      name: 'DBMS retake',
    });
  });

  it('moves a deadline', () => {
    expect(applyPrepEdit(dated, { targetDate: '2026-12-04' }).targetDate).toBe('2026-12-04');
  });

  it('removes the key when a deadline is cleared, rather than storing undefined', () => {
    const open = applyPrepEdit(dated, { targetDate: undefined });
    expect(open.targetDate).toBeUndefined();
    // The written file has to match one that never had a deadline, or a cleared
    // prep and an open-ended prep reload as different things.
    expect('targetDate' in open).toBe(false);
    expect(JSON.parse(JSON.stringify(open))).toEqual({
      id: 'p',
      name: 'DBMS endsem',
      folder: 'DBMS',
    });
  });

  it('leaves an absent key alone - that is what makes clearing expressible', () => {
    expect(applyPrepEdit(dated, {}).targetDate).toBe('2026-11-20');
    expect(applyPrepEdit(dated, { name: 'x' }).targetDate).toBe('2026-11-20');
  });

  it('never rewrites the id', () => {
    expect(applyPrepEdit(dated, { name: 'x', folder: 'y' }).id).toBe('p');
  });
});
