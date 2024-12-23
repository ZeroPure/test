import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActivityStore } from './activityStore';
import { useAuthStore } from './authStore';
import type { Resource } from '../types';
import axios from 'axios';

interface ResourceState {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  fetchResources: () => Promise<void>;
  addResource: (resource: Omit<Resource, 'id' | 'uploadedAt'>) => Promise<void>;
  updateResource: (id: string, data: Partial<Resource>) => Promise<Resource>;
  removeResource: (id: string) => Promise<void>;
  downloadResource: (id: string) => Promise<void>;
  incrementDownloadCount: (id: string) => Promise<void>;
}

const API_URL = 'http://localhost:3000/api';

export const useResourceStore = create<ResourceState>()(
  persist(
    (set, get) => ({
      resources: [],
      loading: false,
      error: null,

      fetchResources: async () => {
        set({ loading: true, error: null });
        try {
          const response = await axios.get(`${API_URL}/resources`);
          const processedResources = response.data.map((resource: any) => ({
            ...resource,
            uploadedAt: resource.uploaded_at ? new Date(resource.uploaded_at) : new Date()
          }));
          set({ resources: processedResources, loading: false });
        } catch (error) {
          console.error('获取资源列表失败:', error);
          set({ error: '获取资源列表失败', loading: false });
        }
      },

      addResource: async (resource) => {
        set({ loading: true, error: null });
        try {
          const response = await axios.post(`${API_URL}/resources`, resource);
          const newResource = response.data.resource;
          
          set((state) => ({
            resources: [...state.resources, newResource],
            loading: false
          }));

          const currentUser = useAuthStore.getState().user;
          if (currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'resource',
              action: 'create',
              targetId: newResource.id,
              targetName: newResource.title,
              path: '/resources'
            });
          }
        } catch (error) {
          console.error('添加资源失败:', error);
          set({ error: '添加资源失败', loading: false });
          throw error;
        }
      },

      updateResource: async (id, updateData) => {
        try {
          set({ loading: true });
          console.log('正在更新资源:', { id, updateData });
          const response = await axios.put(`${API_URL}/resources/${id}`, updateData);
          const updatedResource = response.data.resource;
          
          set((state) => ({
            resources: state.resources.map(resource =>
              resource.id === id
                ? { ...resource, ...updatedResource }
                : resource
            ),
            loading: false
          }));

          const resource = get().resources.find(r => r.id === id);
          const currentUser = useAuthStore.getState().user;
          if (resource && currentUser?.role !== 'student') {
            useActivityStore.getState().addActivity({
              type: 'resource',
              action: 'update',
              targetId: id,
              targetName: resource.title,
              path: '/resources'
            });
          }

          return updatedResource;
        } catch (error) {
          console.error('更新资源失败:', error);
          throw error;
        } finally {
          set({ loading: false });
        }
      },

      removeResource: async (id: string) => {
        set({ loading: true, error: null });
        try {
          console.log('正在删除资源:', id);
          await axios.delete(`${API_URL}/resources/${id}`);
          
          set(state => ({
            resources: state.resources.filter(resource => resource.id !== id),
            loading: false
          }));

          const activityStore = useActivityStore.getState();
          activityStore.addActivity({
            type: 'resource',
            action: 'delete',
            targetId: id,
            targetName: '资源',
            path: '/resources'
          });

        } catch (error) {
          console.error('删除资源失败:', error);
          set({ 
            error: '删除资源失败',
            loading: false 
          });
          throw error;
        }
      },

      downloadResource: async (id: string) => {
        try {
          console.log('正在下载资源:', id);
          
          // 获取资源信息
          const resource = get().resources.find(r => r.id === id);
          if (!resource) {
            throw new Error('资源不存在');
          }

          console.log('找到资源:', resource);

          if (resource.type === 'link') {
            // 如果是链接类型，直接在新窗口打开
            window.open(resource.url, '_blank');
            return;
          }

          try {
            const downloadUrl = `${API_URL}/resources/${id}/download`;
            console.log('下载URL:', downloadUrl);

            // 发起下载请求
            const response = await axios({
              method: 'GET',
              url: downloadUrl,
              responseType: 'blob',
              headers: {
                'Accept': '*/*'
              }
            });

            console.log('下载响应:', {
              status: response.status,
              headers: response.headers,
              contentType: response.headers['content-type']
            });

            // 创建 Blob URL
            const blob = new Blob([response.data], { 
              type: response.headers['content-type'] || 'application/octet-stream'
            });
            const url = window.URL.createObjectURL(blob);

            // 获取文件名
            let fileName = resource.title;
            const contentDisposition = response.headers['content-disposition'];
            if (contentDisposition) {
              const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
              if (matches != null && matches[1]) {
                fileName = decodeURIComponent(matches[1].replace(/['"]/g, ''));
              }
            }

            console.log('准备下载文件:', { fileName, type: blob.type });

            // 创建一个隐藏的 a 标签来触发下载
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // 清理
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            // 记录活动
            const activityStore = useActivityStore.getState();
            activityStore.addActivity({
              type: 'resource',
              action: 'download',
              targetId: id,
              targetName: resource.title,
              path: '/resources'
            });

          } catch (error: any) {
            console.error('下载请求失败:', {
              error,
              response: error.response,
              data: error.response?.data,
              status: error.response?.status,
              headers: error.response?.headers
            });
            
            if (error.response?.status === 404) {
              throw new Error('文件不存在或已被删除');
            }
            
            throw new Error(
              error.response?.data?.error || 
              error.response?.data?.message || 
              error.message || 
              '下载失败'
            );
          }
        } catch (error) {
          console.error('下载资源失败:', error);
          throw error;
        }
      },

      incrementDownloadCount: async (id) => {
        try {
          await axios.post(`${API_URL}/resources/${id}/download`);
        } catch (error) {
          console.error('更新下载计数失败:', error);
        }
      }
    }),
    {
      name: 'resource-storage',
      partialize: (state) => ({
        resources: state.resources,
        loading: false,
        error: null
      })
    }
  )
);