import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cacheKeys } from '@/lib/cache';
import {
  createProject,
  createProjectMilestone,
  deleteProject,
  fetchProject,
  fetchProjectMilestones,
  fetchProjects,
  toggleProjectMilestone,
  updateProject,
} from '@/services/projects';
import { fetchTasksForProject } from '@/services/tasks';
import type { Project, ProjectMilestone } from '@/types/database';
import { track } from '@/services/analytics';
import { useCachedQuery } from './useCachedQuery';

export function useProjects(status?: Project['status'] | 'all') {
  return useCachedQuery(['projects', status ?? 'all'], cacheKeys.projects, () => fetchProjects(status));
}

export function useProject(id: string) {
  return useCachedQuery(['project', id], `project.${id}`, () => fetchProject(id));
}

export function useProjectMilestones(projectId: string) {
  return useCachedQuery(['project-milestones', projectId], `project-milestones.${projectId}`, () =>
    fetchProjectMilestones(projectId),
  );
}

export function useProjectTasks(projectId: string) {
  return useCachedQuery(['project-tasks', projectId], `project-tasks.${projectId}`, () =>
    fetchTasksForProject(projectId),
  );
}

export function useProjectActions() {
  const client = useQueryClient();
  const invalidate = () => {
    void client.invalidateQueries({ queryKey: ['projects'] });
    void client.invalidateQueries({ queryKey: ['project'] });
    void client.invalidateQueries({ queryKey: ['project-milestones'] });
  };

  return {
    create: useMutation({
      mutationFn: (input: Partial<Project>) => createProject(input),
      onSuccess: () => {
        track('project_created');
        invalidate();
      },
    }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Partial<Project> }) => updateProject(id, patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => deleteProject(id), onSuccess: invalidate }),
    addMilestone: useMutation({
      mutationFn: (input: Partial<ProjectMilestone>) => createProjectMilestone(input),
      onSuccess: invalidate,
    }),
    toggleMilestone: useMutation({
      mutationFn: ({ id, done }: { id: string; done: boolean }) => toggleProjectMilestone(id, done),
      onSuccess: invalidate,
    }),
  };
}
