import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { useActivityStore } from './activityStore';
import type { UserAccount } from '../types';

// 配置 axios
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true;

interface AccountState {
  accounts: UserAccount[];
  isLoading: boolean;
  error: string | null;
  addAccount: (account: Partial<UserAccount>) => Promise<{ success: boolean, error?: string }>;
  updateAccount: (id: string, data: Partial<UserAccount>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  updateLastLogin: (id: string) => void;
  updatePassword: (id: string, newPassword: string) => Promise<void>;
  updateAvatar: (id: string, avatar: string | null) => Promise<void>;
  fetchAccounts: () => Promise<void>;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      isLoading: false,
      error: null,

      fetchAccounts: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.get('/api/users');
          const users = response.data.map((user: any) => ({
            ...user,
            createdAt: user.created_at ? new Date(user.created_at) : null,
            lastLogin: user.last_login ? new Date(user.last_login) : null,
          }));

          // 确保管理员账户存在
          const adminExists = users.some(user => user.role === 'admin');
          const accounts = adminExists ? users : [
            {
              id: '1',
              username: 'admin',
              role: 'admin',
              name: '管理员',
              email: 'admin@example.com',
              createdAt: new Date('2024-01-01'),
              lastLogin: new Date()
            },
            ...users
          ];

          set({ accounts, isLoading: false });
        } catch (error) {
          console.error('获取用户列表失败:', error);
          set({ error: '获取用户列表失败', isLoading: false });
        }
      },

      addAccount: async (account: Partial<UserAccount>) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.post('/api/users', account);
          const newAccount = {
            ...response.data.user,
            createdAt: new Date(response.data.user.createdAt),
            lastLogin: response.data.user.lastLogin ? new Date(response.data.user.lastLogin) : null
          };
          
          set(state => ({
            accounts: [...state.accounts, newAccount],
            isLoading: false
          }));
          
          return { success: true };
        } catch (error) {
          console.error('添加账户失败:', error);
          const errorMessage = error.response?.data?.error || '添加账户失败';
          set({ error: errorMessage, isLoading: false });
          return { success: false, error: errorMessage };
        }
      },

      updateAccount: async (id: string, data: Partial<UserAccount>) => {
        set({ isLoading: true, error: null });
        try {
          console.log('Updating account:', { id, data });
          const response = await axios.put(`/api/users/${id}`, data);
          
          if (!response.data || !response.data.user) {
            throw new Error('Invalid server response');
          }

          const updatedUser = response.data.user;
          const updatedAccount = {
            ...updatedUser,
            createdAt: updatedUser.created_at ? new Date(updatedUser.created_at) : null,
            lastLogin: updatedUser.last_login ? new Date(updatedUser.last_login) : null,
            group_id: updatedUser.group_id || null,
            group_name: updatedUser.group_name || null
          };

          console.log('Updated account:', updatedAccount);

          set(state => ({
            accounts: state.accounts.map(account =>
              account.id === id ? { ...account, ...updatedAccount } : account
            ),
            isLoading: false,
            error: null
          }));

        } catch (error: any) {
          console.error('更新账户失败:', error);
          const errorMessage = error.response?.data?.error || error.message || '更新账户失败';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      updateAvatar: async (id: string, avatar: string | null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await axios.put(`/api/users/${id}/avatar`, { avatar });
          const updatedAccount = {
            ...response.data.user,
            createdAt: new Date(response.data.user.createdAt),
            lastLogin: response.data.user.lastLogin ? new Date(response.data.user.lastLogin) : null
          };

          set(state => ({
            accounts: state.accounts.map(account =>
              account.id === id ? { ...account, ...updatedAccount } : account
            ),
            isLoading: false
          }));
        } catch (error) {
          console.error('更新头像失败:', error);
          set({ error: '更新头像失败', isLoading: false });
          throw error;
        }
      },

      updatePassword: async (id: string, newPassword: string) => {
        set({ isLoading: true, error: null });
        try {
          await axios.put(`/api/users/${id}/password`, { password: newPassword });
          set({ isLoading: false });
        } catch (error) {
          console.error('修改密码失败:', error);
          set({ error: '修改密码失败', isLoading: false });
          throw error;
        }
      },

      removeAccount: async (id: string) => {
        try {
          await axios.delete(`/api/users/${id}`);
          set(state => ({
            accounts: state.accounts.filter(account => account.id !== id)
          }));
        } catch (error: any) {
          console.error('删除用户失败:', error);
          throw new Error(error.response?.data?.error || '删除用户失败');
        }
      },

      updateLastLogin: (id) => {
        set((state) => ({
          accounts: state.accounts.map(account =>
            account.id === id ? { ...account, lastLogin: new Date() } : account
          )
        }));
      }
    }),
    {
      name: 'account-storage',
      partialize: (state) => ({
        // 只持久化必要的数据，不包括账户列表
        isLoading: state.isLoading,
        error: state.error
      })
    }
  )
);