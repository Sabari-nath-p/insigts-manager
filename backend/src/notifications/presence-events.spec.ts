import { presenceEvent } from './presence-events';

describe('presenceEvent', () => {
  it('announces the start of work from offline, leave or no previous status', () => {
    expect(presenceEvent('offline', 'working')).toBe('started');
    expect(presenceEvent('on_leave', 'working')).toBe('started');
    expect(presenceEvent(null, 'working')).toBe('started');
  });

  it('announces a pause and the return from it', () => {
    expect(presenceEvent('working', 'on_break')).toBe('paused');
    expect(presenceEvent('in_meeting', 'on_break')).toBe('paused');
    expect(presenceEvent('on_break', 'working')).toBe('resumed');
  });

  it('stays silent for everything else', () => {
    expect(presenceEvent('working', 'working')).toBeNull();
    expect(presenceEvent('on_break', 'on_break')).toBeNull();
    expect(presenceEvent('working', 'in_meeting')).toBeNull();
    expect(presenceEvent('in_meeting', 'working')).toBeNull();
    expect(presenceEvent('working', 'offline')).toBeNull();
    expect(presenceEvent('offline', 'on_break')).toBeNull();
    expect(presenceEvent('on_leave', 'on_break')).toBeNull();
  });
});
