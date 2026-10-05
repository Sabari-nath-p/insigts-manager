import { cumulative, fillDays, flagHighLoad, healthStatus, median, pctChange, toCsv, toWeekly, weekStart } from './insights-calc';
import { addDays, previousRange, resolveRange } from './pm-dates';
import { needsRebalance, positionBetween } from './pm-position';

describe('healthStatus', () => {
  it('is Behind above 25% overdue', () => expect(healthStatus(8, 3, 0)).toBe('Behind'));
  it('is At risk above 10% overdue', () => expect(healthStatus(10, 2, 0)).toBe('At risk'));
  it('is At risk with more than 3 stuck', () => expect(healthStatus(20, 0, 4)).toBe('At risk'));
  it('is On track at the boundaries', () => {
    expect(healthStatus(4, 1, 0)).toBe('At risk'); // 25% is not > 25% but is > 10%
    expect(healthStatus(10, 1, 3)).toBe('On track'); // exactly 10% and 3 stuck
    expect(healthStatus(0, 0, 0)).toBe('On track');
  });
});

describe('flagHighLoad', () => {
  it('flags only members above 1.5x the average', () => {
    const flagged = flagHighLoad([{ id: 'a', open: 12 }, { id: 'b', open: 3 }, { id: 'c', open: 3 }, { id: 'd', open: 0 }]);
    expect([...flagged]).toEqual(['a']);
  });
  it('flags nobody when fewer than two people have work', () => {
    expect(flagHighLoad([{ id: 'a', open: 9 }]).size).toBe(0);
  });
});

describe('series helpers', () => {
  it('zero-fills days and accumulates', () => {
    const days = fillDays({ from: '2026-01-01', to: '2026-01-04' }, new Map([['2026-01-02', 2], ['2026-01-04', 1]]));
    expect(days.map((d) => d.count)).toEqual([0, 2, 0, 1]);
    expect(cumulative(days)).toEqual([0, 2, 2, 3]);
  });
  it('buckets by ISO week starting Monday', () => {
    expect(weekStart('2026-01-04')).toBe('2025-12-29'); // Sunday
    expect(weekStart('2026-01-05')).toBe('2026-01-05'); // Monday
    const weekly = toWeekly(fillDays({ from: '2026-01-05', to: '2026-01-12' }, new Map([['2026-01-05', 1], ['2026-01-11', 2], ['2026-01-12', 4]])));
    expect(weekly).toEqual([{ date: '2026-01-05', count: 3 }, { date: '2026-01-12', count: 4 }]);
  });
  it('computes median and percentage change', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNull();
    expect(pctChange(15, 10)).toBe(50);
    expect(pctChange(5, 0)).toBeNull();
    expect(pctChange(0, 0)).toBe(0);
  });
});

describe('date ranges', () => {
  it('resolves presets against a fixed today', () => {
    expect(resolveRange('7d', undefined, undefined, '2026-03-15')).toEqual({ from: '2026-03-09', to: '2026-03-15' });
    expect(resolveRange('this-month', undefined, undefined, '2026-03-15')).toEqual({ from: '2026-03-01', to: '2026-03-15' });
    expect(resolveRange('last-month', undefined, undefined, '2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(resolveRange(undefined, undefined, undefined, '2026-03-15')).toEqual({ from: '2026-02-14', to: '2026-03-15' });
  });
  it('prefers a valid custom range and ignores a bad one', () => {
    expect(resolveRange('7d', '2026-01-01', '2026-01-31', '2026-03-15')).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(resolveRange('7d', '2026-02-01', '2026-01-01', '2026-03-15')).toEqual({ from: '2026-03-09', to: '2026-03-15' });
  });
  it('builds the equal-length previous range', () => {
    expect(previousRange({ from: '2026-03-09', to: '2026-03-15' })).toEqual({ from: '2026-03-02', to: '2026-03-08' });
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('fractional positions', () => {
  it('places between, before and after neighbours', () => {
    expect(positionBetween(null, null)).toBe(1000);
    expect(positionBetween(1000, 2000)).toBe(1500);
    expect(positionBetween(null, 1000)).toBe(0);
    expect(positionBetween(2000, null)).toBe(3000);
  });
  it('detects collapsed gaps', () => {
    expect(needsRebalance(1, 1 + 1e-9)).toBe(true);
    expect(needsRebalance(1, 2)).toBe(false);
  });
});

describe('toCsv', () => {
  it('adds a BOM and quotes special characters', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'say "hi"'], [1, null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"x,y","say ""hi"""');
    expect(csv).toContain('1,');
  });
});
