import { buildAssignmentEmail } from './assignment-email';

const APP = 'https://insights.example.com';
const task = (n: number, title = `Poster ${n}`) => ({ ref: `AB-${n}`, title, projectKey: 'AB', projectName: 'Arena Bangalore' });

describe('assignment email', () => {
  it('one task: names the task and links straight to it', () => {
    const e = buildAssignmentEmail({ recipientName: 'Rohan Das', actorNames: ['Asha Nair'], tasks: [task(12)], appUrl: APP });
    expect(e.subject).toBe('Asha Nair assigned you AB-12: Poster 12');
    expect(e.text).toContain('Hi Rohan,');
    expect(e.text).toContain('https://insights.example.com/projects/AB?task=AB-12');
    expect(e.html).toContain('href="https://insights.example.com/projects/AB?task=AB-12"');
  });

  it('several tasks: a list and a link to My Work', () => {
    const e = buildAssignmentEmail({ recipientName: 'Rohan Das', actorNames: ['Asha Nair'], tasks: [task(1), task(2), task(3)], appUrl: APP });
    expect(e.subject).toBe('Asha Nair assigned you 3 tasks');
    expect(e.text).toContain('- AB-1  Poster 1  (Arena Bangalore)');
    expect(e.text).toContain('https://insights.example.com/projects/my-work');
  });

  it('does not name one person when several assigned', () => {
    const e = buildAssignmentEmail({ recipientName: 'Rohan', actorNames: ['Asha Nair', 'Meera Pillai'], tasks: [task(1), task(2)], appUrl: APP });
    expect(e.subject).toBe('You were assigned 2 tasks');
  });

  it('lists at most 20 and sums up the rest', () => {
    const tasks = Array.from({ length: 25 }, (_, i) => task(i + 1));
    const e = buildAssignmentEmail({ recipientName: 'Rohan', actorNames: ['Asha'], tasks, appUrl: APP });
    expect(e.text).toContain('AB-20');
    expect(e.text).not.toContain('AB-21');
    expect(e.text).toContain('...and 5 more');
  });

  it('cannot be used to inject markup: titles and names are escaped in the HTML part', () => {
    const e = buildAssignmentEmail({ recipientName: '<b>Rohan</b>', actorNames: ['A<script>'], tasks: [task(1, '<img src=x onerror=alert(1)>')], appUrl: APP });
    expect(e.html).not.toContain('<img');
    expect(e.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(e.html).not.toContain('<script>');
    expect(e.html).not.toContain('<b>Rohan');
  });

  it('cannot be used to inject mail headers: the subject is always one line', () => {
    const e = buildAssignmentEmail({ recipientName: 'Rohan', actorNames: ['Asha'], tasks: [task(1, 'Hello\r\nBcc: someone@evil.test')], appUrl: APP });
    expect(e.subject).not.toMatch(/[\r\n]/);
  });

  it('has no links at all when the website address is not set', () => {
    const e = buildAssignmentEmail({ recipientName: 'Rohan', actorNames: ['Asha'], tasks: [task(1)], appUrl: null });
    expect(e.text).not.toContain('http');
    expect(e.html).not.toContain('href');
  });
});
