import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Trash2, Settings } from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import { useGroupStore } from '../../store/groupStore';
import EditStudentModal from './EditStudentModal';
import GroupManageModal from './GroupManageModal';
import axios from 'axios'; // Add this line
import type { UserAccount } from '../../types';

export default function StudentList() {
  const { accounts, updateAccount, removeAccount, fetchAccounts } = useAccountStore();
  const { groups } = useGroupStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<UserAccount | null>(null);
  const [filterGroup, setFilterGroup] = useState<string>('全部');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isGroupManageOpen, setIsGroupManageOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // 只获取学生账户
  const studentAccounts = accounts.filter(account => account.role === 'student');

  // 获取组名的辅助函数
  const getGroupName = (student: UserAccount) => {
    if (!student.group_id) return '未分组';
    // 优先使用从后端获取的组名
    if (student.group_name) return student.group_name;
    // 如果没有后端组名，则从本地组列表查找
    const group = groups.find(g => g.id === student.group_id);
    return group ? group.name : '未分组';
  };

  const filteredStudents = studentAccounts.filter(student => {
    const matchesSearch = 
      (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (student.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      student.username.toLowerCase().includes(searchTerm.toLowerCase());
    const groupName = getGroupName(student);
    const matchesGroup = filterGroup === '全部' || groupName === filterGroup;
    return matchesSearch && matchesGroup;
  });

  // 获取所有组名，包括从后端获取的组名
  const allGroups = ['全部', ...new Set([
    ...groups.map(g => g.name),
    ...studentAccounts
      .map(s => getGroupName(s))
      .filter(name => name !== '未分组')
  ])];

  const handleUpdateStudent = async (id: string, data: Partial<UserAccount>) => {
    try {
      console.log('StudentList - 更新学生信息:', { id, data });
      // 确保保留原始数据中的其他字段
      const currentStudent = studentAccounts.find(s => s.id === id);
      if (!currentStudent) {
        throw new Error('找不到要更新的学生');
      }

      const updateData = {
        ...data,
        username: currentStudent.username,  // 保留原始用户名
        role: currentStudent.role,         // 保留原始角色
      };

      await updateAccount(id, updateData);
      setEditingStudent(null);
      await fetchAccounts();  // 刷新列表
      // alert('更新成功！');
    } catch (error: any) {
      // console.error('更新失败:', error);
      // alert(error.response?.data?.error || '更新失败，请稍后重试');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (window.confirm('确定要删除这个学生吗？')) {
      try {
        await removeAccount(id);
      } catch (error: any) {
        alert(error.message || '删除失败');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">学生管理</h2>
          <button
            onClick={() => setIsGroupManageOpen(true)}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
          >
            <Settings className="h-5 w-5" />
            管理小组
          </button>
        </div>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="搜索学生..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
            >
              <Filter className="h-5 w-5" />
              {filterGroup}
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                {allGroups.map((group) => (
                  <button
                    key={group}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setFilterGroup(group);
                      setIsFilterOpen(false);
                    }}
                  >
                    {group}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">分组</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {student.username[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{student.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{student.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getGroupName(student)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.createdAt ? new Date(student.createdAt).toLocaleString('zh-CN') : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastLogin ? new Date(student.lastLogin).toLocaleString('zh-CN') : '从未登录'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setEditingStudent(student)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteStudent(student.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <EditStudentModal
        student={editingStudent}
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSubmit={handleUpdateStudent}
      />

      <GroupManageModal
        isOpen={isGroupManageOpen}
        onClose={() => setIsGroupManageOpen(false)}
      />
    </div>
  );
}