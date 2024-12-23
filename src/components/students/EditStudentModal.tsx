import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useGroupStore } from '../../store/groupStore';
import type { UserAccount } from '../../types';

interface EditStudentModalProps {
  student: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, data: Partial<UserAccount>) => void;
}

export default function EditStudentModal({ student, isOpen, onClose, onSubmit }: EditStudentModalProps) {
  const { groups } = useGroupStore();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    group: ''
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        email: student.email || '',
        group: student.group_id || ''
      });
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('提交表单数据:', formData);
    
    // 构造更新数据
    const updatedData: Partial<UserAccount> = {
      email: formData.email.trim(),
      name: formData.name.trim()
    };

    // 处理分组信息
    if (formData.group) {
      const selectedGroup = groups.find(g => g.id === formData.group);
      if (selectedGroup) {
        updatedData.group_id = selectedGroup.id;
        updatedData.group_name = selectedGroup.name;
      }
    } else {
      updatedData.group_id = null;
      updatedData.group_name = null;
    }

    console.log('发送更新数据:', updatedData);
    onSubmit(student.id, updatedData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">编辑学生信息</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                姓名
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邮箱
              </label>
              <input
                type="email"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                分组
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.group}
                onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              >
                <option value="">未分组</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
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