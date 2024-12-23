import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { Presentation } from '../types';
import { useActivityStore } from './activityStore';
import { useAuthStore } from './authStore';

const API_URL = 'http://localhost:3000/api';

interface PresentationState {
  presentations: Presentation[];
  loading: boolean;
  error: string | null;
  fetchPresentations: () => Promise<void>;
  addPresentation: (presentation: Omit<Presentation, 'id' | 'status'>) => Promise<void>;
  updatePresentation: (id: string, data: Partial<Presentation>) => Promise<void>;
  removePresentation: (id: string) => Promise<void>;
  updatePresentationStatuses: () => void;
}

export const usePresentationStore = create<PresentationState>()(
  persist(
    (set, get) => ({
      presentations: [],
      loading: false,
      error: null,

      fetchPresentations: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(`${API_URL}/presentations`);
          const presentations = response.data.map((p: any) => ({
            ...p,
            startTime: new Date(p.start_time || p.startTime),
            endTime: new Date(p.end_time || p.endTime),
            createdAt: new Date(p.created_at || p.createdAt)
          }));
          
          set({ presentations, loading: false });
          
          // Immediately update statuses after fetching
          const now = new Date();
          set((state) => ({
            presentations: state.presentations.map(presentation => {
              const startTime = new Date(presentation.startTime);
              const endTime = new Date(presentation.endTime);
              
              let status: 'upcoming' | 'ongoing' | 'completed';
              if (now < startTime) {
                status = 'upcoming';
              } else if (now > endTime) {
                status = 'completed';
              } else {
                status = 'ongoing';
              }
              
              return {
                ...presentation,
                status,
                startTime,
                endTime
              };
            })
          }));
        } catch (error) {
          console.error('获取展示列表失败:', error);
          set({ error: '获取展示列表失败', loading: false });
        }
      },

      addPresentation: async (presentation) => {
        set({ loading: true, error: null });
        try {
          // 确保日期格式正确
          const formattedPresentation = {
            ...presentation,
            startTime: presentation.startTime.toISOString(),
            endTime: presentation.endTime.toISOString()
          };

          const response = await axios.post(`${API_URL}/presentations`, formattedPresentation);
          const newPresentation = {
            ...response.data,
            startTime: new Date(response.data.start_time),
            endTime: new Date(response.data.end_time),
            createdAt: new Date(response.data.created_at)
          };
          
          set((state) => ({
            presentations: [...state.presentations, newPresentation],
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'project',
              action: 'create',
              targetId: newPresentation.id,
              targetName: newPresentation.projectName,
              path: '/presentations'
            });
          }
        } catch (error: any) {
          console.error('创建展示失败:', error);
          set({ 
            error: error.response?.data?.error || '创建展示失败',
            loading: false 
          });
          throw error;
        }
      },

      updatePresentation: async (id, data) => {
        set({ loading: true, error: null });
        try {
          console.log('正在更新展示，ID:', id);
          console.log('更新数据:', {
            ...data,
            startTime: data.startTime?.toISOString(),
            endTime: data.endTime?.toISOString()
          });
          
          // 确保日期格式正确
          const formattedData = {
            ...data,
            startTime: data.startTime?.toISOString(),
            endTime: data.endTime?.toISOString()
          };
          
          const response = await axios.put(`${API_URL}/presentations/${id}`, formattedData);
          console.log('后端响应:', response.data);
          
          if (!response.data.presentation) {
            throw new Error('后端返回的数据格式不正确');
          }
          
          const updatedPresentation = {
            ...response.data.presentation,
            startTime: new Date(response.data.presentation.start_time),
            endTime: new Date(response.data.presentation.end_time),
            createdAt: new Date(response.data.presentation.created_at)
          };

          console.log('格式化后的展示数据:', updatedPresentation);

          set((state) => ({
            presentations: state.presentations.map(presentation =>
              presentation.id === id ? updatedPresentation : presentation
            ),
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'project',
              action: 'update',
              targetId: id,
              targetName: updatedPresentation.projectName,
              path: '/presentations'
            });
          }
        } catch (error: any) {
          console.error('更新展示失败:', error);
          console.error('错误详情:', {
            response: error.response?.data,
            status: error.response?.status,
            message: error.message
          });
          
          let errorMessage = '更新展示失败';
          if (error.response?.data?.error === 'time_conflict') {
            errorMessage = error.response.data.message || '该时间段已有其他展示安排';
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({ 
            error: errorMessage,
            loading: false 
          });
          throw error;
        }
      },

      removePresentation: async (id) => {
        set({ loading: true, error: null });
        try {
          const presentation = get().presentations.find(p => p.id === id);
          await axios.delete(`${API_URL}/presentations/${id}`);
          
          set((state) => ({
            presentations: state.presentations.filter(p => p.id !== id),
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (presentation && currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'project',
              action: 'delete',
              targetId: id,
              targetName: presentation.projectName,
              path: '/presentations'
            });
          }
        } catch (error: any) {
          console.error('删除展示失败:', error);
          set({ 
            error: error.response?.data?.error || '删除展示失败',
            loading: false 
          });
          throw error;
        }
      },

      updatePresentationStatuses: () => {
        const now = new Date();
        console.log('Updating statuses at:', now.toISOString());
        
        set((state) => {
          const updatedPresentations = state.presentations.map(presentation => {
            const startTime = new Date(presentation.startTime);
            const endTime = new Date(presentation.endTime);
            
            console.log('Presentation:', presentation.projectName);
            console.log('Start time:', startTime.toISOString());
            console.log('End time:', endTime.toISOString());
            
            let status: 'upcoming' | 'ongoing' | 'completed';
            if (now < startTime) {
              status = 'upcoming';
            } else if (now > endTime) {
              status = 'completed';
            } else {
              status = 'ongoing';
            }
            
            console.log('Calculated status:', status);
            
            return {
              ...presentation,
              status,
              startTime,
              endTime
            };
          });
          
          return { presentations: updatedPresentations };
        });
      }
    }),
    {
      name: 'presentation-storage',
      storage: {
        getItem: (name: string) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          if (data?.state?.presentations) {
            data.state.presentations = data.state.presentations.map((p: any) => ({
              ...p,
              startTime: new Date(p.startTime),
              endTime: new Date(p.endTime),
              createdAt: p.createdAt ? new Date(p.createdAt) : undefined
            }));
          }
          return data;
        },
        setItem: (name: string, value: any) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string) => localStorage.removeItem(name)
      }
    }
  )
);