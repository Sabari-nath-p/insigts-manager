import { cleanDay, daysBeyondMonth, daysInMonth, withDay } from './calendar-days';

describe('calendar days', () => {
  it('knows month lengths, including February in a leap year', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 9)).toBe(31);
    expect(daysInMonth(2026, 10)).toBe(30);
  });

  it('trims text, drops blank posts and empty markers', () => {
    expect(cleanDay({ posts: [{ id: 'a', type: ' Video ', note: ' hi ' }, { id: 'b', type: '   ', note: '' }], marker: { label: '  ' } })).toEqual({
      posts: [{ id: 'a', type: 'Video', note: 'hi' }],
      marker: null,
    });
    expect(cleanDay({ posts: [], marker: { label: ' Onam ' } }).marker).toEqual({ label: 'Onam' });
  });

  it('replaces one day and leaves the others alone', () => {
    const days = { '3': { posts: [{ id: 'a', type: 'Poster', note: '' }], marker: null } };
    const next = withDay(days, 8, { posts: [{ id: 'b', type: 'Video', note: '' }], marker: null });
    expect(Object.keys(next).sort()).toEqual(['3', '8']);
    expect(days['3']).toBe(next['3']);
  });

  it('removes a day once nothing is left on it', () => {
    const days = { '3': { posts: [{ id: 'a', type: 'Poster', note: '' }], marker: null } };
    expect(withDay(days, 3, { posts: [], marker: null })).toEqual({});
  });

  it('finds days that would not exist in a shorter month', () => {
    const days = { '30': { posts: [], marker: null }, '31': { posts: [], marker: null }, '5': { posts: [], marker: null } };
    expect(daysBeyondMonth(days, 2026, 10)).toEqual([31]);
    expect(daysBeyondMonth(days, 2026, 9)).toEqual([]);
  });
});
