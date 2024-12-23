import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, Users, Filter } from 'lucide-react';
import { usePresentationStore } from '../../store/presentationStore';
import { useAccountStore } from '../../store/accountStore';
import { useGroupStore } from '../../store/groupStore';
import AddPresentationModal from './AddPresentationModal';
import EditPresentationModal from './EditPresentationModal';
import type { Presentation } from '../../types';

export default function PresentationList() {
  const { presentations, removePresentation, updatePresentationStatuses, fetchPresentations } = usePresentationStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { groups } = useGroupStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPresentation, setEditingPresentation] = useState<Presentation | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'all' | Presentation['status']>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    fetchPresentations();
    fetchAccounts();
  }, [fetchPresentations, fetchAccounts]);

  // 每分钟更新一次状态
  useEffect(() => {
    updatePresentationStatuses();
    const interval = setInterval(updatePresentationStatuses, 60000);
    return () => clearInterval(interval);
  }, [updatePresentationStatuses]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: Presentation['status']) => {
    switch (status) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Presentation['status']) => {
    switch (status) {
      case 'upcoming':
        return '未开始';
      case 'ongoing':
        return '进行中';
      case 'completed':
        return '已结束';
    }
  };

  const handleDeletePresentation = (id: string) => {
    if (window.confirm('确定要删除这个展示吗？')) {
      removePresentation(id);
    }
  };

  const toggleGroupExpand = (groupId: string) => {
    const newExpandedGroups = new Set(expandedGroups);
    if (expandedGroups.has(groupId)) {
      newExpandedGroups.delete(groupId);
    } else {
      newExpandedGroups.add(groupId);
    }
    setExpandedGroups(newExpandedGroups);
  };

  const getGroupMembers = (groupId: string) => {
    return accounts.filter(account => 
      account.role === 'student' && 
      account.group_id === groupId
    );
  };

  const getGroupName = (groupId: string) => {
    // 首先从小组列表中查找
    const group = groups.find(g => g.id === groupId);
    if (group) return group.name;
    
    // 如果找不到，从学生账户中查找
    const studentWithGroup = accounts.find(
      account => account.role === 'student' && account.group_id === groupId
    );
    if (studentWithGroup?.group_name) return studentWithGroup.group_name;
    
    return '未分组';
  };

  const filterOptions = [
    { value: 'all', label: '全部' },
    { value: 'upcoming', label: '未开始' },
    { value: 'ongoing', label: '进行中' },
    { value: 'completed', label: '已结束' }
  ];

  const filteredPresentations = presentations.filter(presentation => 
    filterStatus === 'all' || presentation.status === filterStatus
  );

  // 按时间排序：未开始和进行中的按开始时间升序，已结束的按结束时间降序
  const sortedPresentations = [...filteredPresentations].sort((a, b) => {
    if (a.status === 'completed' && b.status === 'completed') {
      return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
    }
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">项目展示</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <Filter className="h-5 w-5" />
                {filterOptions.find(option => option.value === filterStatus)?.label}
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                      onClick={() => {
                        setFilterStatus(option.value as 'all' | Presentation['status']);
                        setIsFilterOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
            >
              <Plus className="h-5 w-5" />
              安排展示
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedPresentations.map((presentation) => {
            const groupMembers = getGroupMembers(presentation.group_id);
            const groupName = getGroupName(presentation.group_id || presentation.groupId);
            return (
              <div
                key={presentation.id}
                className="border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {presentation.project_name || presentation.projectName}
                    </h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                      {presentation.description || '展示任务管理系统的用户界面和协作功能'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPresentation(presentation)}
                      className="text-indigo-600 hover:text-indigo-700"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeletePresentation(presentation.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  <div className="flex flex-col">
                    <span>开始：{formatDate(presentation.startTime)}</span>
                    <span>结束：{formatDate(presentation.endTime)}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div 
                    className="flex items-center cursor-pointer text-gray-700 hover:text-indigo-600"
                    onClick={() => toggleGroupExpand(presentation.groupId)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    <span className="text-sm">{groupName}</span>
                    <span className="ml-1 text-xs text-gray-500">
                      ({groupMembers.length} 名成员)
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(presentation.status)}`}>
                    {getStatusText(presentation.status)}
                  </span>
                </div>

                {expandedGroups.has(presentation.groupId) && (
                  <div className="mt-2 pl-4 space-y-1 border-t pt-2">
                    {groupMembers.length > 0 ? (
                      groupMembers.map(member => (
                        <div key={member.id} className="text-xs text-gray-600 flex items-center">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-1.5"></div>
                          {member.name || member.username} ({member.email || '未设置邮箱'})
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">暂无成员</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {sortedPresentations.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              暂无{filterStatus === 'all' ? '' : filterOptions.find(option => option.value === filterStatus)?.label}展示
            </div>
          )}
        </div>
      </div>

      <AddPresentationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditPresentationModal
        presentation={editingPresentation}
        isOpen={!!editingPresentation}
        onClose={() => setEditingPresentation(null)}
      />
    </div>
  );
}