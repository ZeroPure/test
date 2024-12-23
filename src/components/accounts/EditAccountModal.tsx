import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import type { UserAccount } from '../../types';

interface EditAccountModalProps {
  account: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditAccountModal({ account, isOpen, onClose }: EditAccountModalProps) {
  const { updateAccount } = useAccountStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'student' as 'admin' | 'teacher' | 'student'
  });

  useEffect(() => {
    if (account) {
      setFormData({
        username: account.username,
        password: '',  // 不显示原密码
        role: account.role
      });
      setError(null);  // 重置错误消息
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);  // 清除之前的错误
    try {
      // 只发送已修改的字段
      const updates: Partial<UserAccount> = {};
      if (formData.username !== account.username) updates.username = formData.username;
      if (formData.password) updates.password = formData.password;
      if (formData.role !== account.role) updates.role = formData.role;

      if (Object.keys(updates).length === 0) {
        setError('没有任何修改');
        return;
      }

      await updateAccount(account.id, updates);
      onClose();
      // 不再需要手动调用 fetchAccounts，因为 updateAccount 中已经包含了
    } catch (error: any) {
      console.error('更新失败:', error);
      setError(
        error.response?.data?.error || 
        error.message || 
        '更新失败，请稍后重试'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">编辑账户</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                用户名
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="留空则保持原密码不变"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-10"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                出于安全考虑，不显示现有密码。如需修改密码，请输入新密码。
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                角色
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'teacher' | 'student' })}
                disabled={account.role === 'admin'}
              >
                <option value="student">学生</option>
                <option value="teacher">教师</option>
                <option value="admin">管理员</option>
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}