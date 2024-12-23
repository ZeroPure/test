import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface Group {
  id: string;
  name: string;
  created_at: string;
}

interface GroupState {
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  fetchGroups: () => Promise<void>;
  addGroup: (name: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  updateGroup: (id: string, newName: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      groups: [],
      isLoading: false,
      error: null,

      fetchGroups: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.get('http://localhost:3000/api/groups');
          set({ groups: response.data, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || '获取小组列表失败', 
            isLoading: false 
          });
        }
      },

      addGroup: async (name: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('http://localhost:3000/api/groups', { name });
          const newGroup = response.data.group;
          set(state => ({
            groups: [...state.groups, newGroup],
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || '添加小组失败', 
            isLoading: false 
          });
          throw error;
        }
      },

      removeGroup: async (id: string) => {
        set({ isLoading: true, error: null });
        try {
          await axios.delete(`http://localhost:3000/api/groups/${id}`);
          set(state => ({
            groups: state.groups.filter(g => g.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || '删除小组失败', 
            isLoading: false 
          });
          throw error;
        }
      },

      updateGroup: async (id: string, newName: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.put(`http://localhost:3000/api/groups/${id}`, { name: newName });
          const updatedGroup = response.data.group;
          set(state => ({
            groups: state.groups.map(g => g.id === id ? updatedGroup : g),
            isLoading: false
          }));
        } catch (error: any) {
          set({ 
            error: error.response?.data?.error || '更新小组失败', 
            isLoading: false 
          });
          throw error;
        }
      }
    }),
    {
      name: 'group-storage',
      partialize: (state) => ({
        groups: state.groups,
        isLoading: false,
        error: null
      })
    }
  )
);