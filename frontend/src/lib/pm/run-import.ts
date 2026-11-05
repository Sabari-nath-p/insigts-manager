import { pm } from './client';
import { colorsInUse, nextColor } from './colors';
import { uniqueKey } from './project-key';
import type { PmProject } from './types';

export interface ImportTask {
  title: string;
  description: string;
}

export interface ImportResult {
  /** The project the tasks went into (null only if a new project could not be created). */
  project: PmProject | null;
  created: number;
  error?: string;
}

/**
 * Makes the tasks in `target`, or in a brand new project named `newProjectName` when there is no target.
 * A new project gets a key nobody has used (archived projects keep theirs) and a colour no active project has.
 * Tasks go in one after another so their numbers come out in order, into the project's first column.
 * Stops at the first refusal and says how many were made.
 */
export async function importTasks(args: {
  target: PmProject | null;
  newProjectName: string;
  allProjects: PmProject[];
  tasks: ImportTask[];
  onProgress: (created: number) => void;
}): Promise<ImportResult> {
  let project = args.target;
  if (!project) {
    try {
      project = await pm<PmProject>('/projects', {
        method: 'POST',
        body: {
          name: args.newProjectName,
          key: uniqueKey(args.newProjectName, args.allProjects.map((p) => p.key)),
          color: nextColor([...colorsInUse(args.allProjects).keys()]),
        },
      });
    } catch (e) {
      return { project: null, created: 0, error: (e as Error).message };
    }
  }

  let created = 0;
  for (const task of args.tasks) {
    try {
      await pm(`/projects/${project.key}/tasks`, { method: 'POST', body: { title: task.title, description: task.description || undefined } });
      created += 1;
      args.onProgress(created);
    } catch (e) {
      return { project, created, error: (e as Error).message };
    }
  }
  return { project, created };
}
