import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useActivityStore } from './activityStore';
import { useAuthStore } from './authStore';
import type { Project } from '../types';

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  fetchProjects: () => Promise<void>;
  addProject: (project: Omit<Project, 'id'>) => Promise<void>;
  updateProject: (id: string, data: Partial<Omit<Project, 'id'>>) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      loading: false,
      error: null,

      setError: (error) => set({ error }),

      fetchProjects: async () => {
        set({ loading: true, error: null });
        try {
          console.log('Fetching projects from server...');
          const response = await axios.get('/api/projects');
          console.log('Server response:', response.data);
          
          const projectsArray = Array.isArray(response.data) ? response.data : [];
          console.log('Processed projects:', projectsArray);
          
          set({ 
            projects: projectsArray,
            loading: false,
            error: null
          });
        } catch (error: any) {
          console.error('获取项目列表失败:', error);
          set({ 
            error: error.response?.data?.error || '获取项目列表失败',
            loading: false,
            projects: []
          });
        }
      },

      addProject: async (project) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.post('/api/projects', project);
          const newProject = response.data;
          
          set((state) => ({
            projects: [...state.projects, newProject],
            loading: false,
            error: null
          }));

          useActivityStore.getState().addActivity({
            type: 'project',
            action: 'create',
            targetId: newProject.id,
            targetName: newProject.name,
            path: '/projects'
          });
        } catch (error: any) {
          console.error('创建项目失败:', error);
          set({ 
            error: error.response?.data?.error || '创建项目失败',
            loading: false 
          });
          throw error;
        }
      },

      updateProject: async (id, data) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.put(`/api/projects/${id}`, data);
          const updatedProject = response.data.project;
          
          set((state) => ({
            projects: state.projects.map(project =>
              project.id === id ? { ...project, ...updatedProject } : project
            ),
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'project',
              action: 'update',
              targetId: id,
              targetName: updatedProject.name,
              path: '/projects'
            });
          }
        } catch (error) {
          console.error('更新项目失败:', error);
          const errorMessage = error instanceof Error ? error.message : '更新项目失败';
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        }
      },

      removeProject: async (id) => {
        set({ loading: true, error: null });
        try {
          const project = get().projects.find(p => p.id === id);
          await axios.delete(`/api/projects/${id}`);
          
          set((state) => ({
            projects: state.projects.filter(project => project.id !== id),
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (project && currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'project',
              action: 'delete',
              targetId: id,
              targetName: project.name,
              path: '/projects'
            });
          }
        } catch (error) {
          console.error('删除项目失败:', error);
          const errorMessage = error instanceof Error ? error.message : '删除项目失败';
          set({ error: errorMessage, loading: false });
          throw new Error(errorMessage);
        }
      },
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({ projects: state.projects }),
    }
  )
);