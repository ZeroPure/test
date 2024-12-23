import React, { useState, useEffect, useMemo } from 'react';
import { Search, FolderGit2, Filter, Edit2, Trash2, Loader2, GitBranch } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useGroupStore } from '../../store/groupStore';
import AddProjectModal from './AddProjectModal';
import EditProjectModal from './EditProjectModal';
import type { Project } from '../../types';

export default function ProjectList() {
  const { 
    projects, 
    addProject, 
    removeProject, 
    updateProject, 
    fetchProjects,
    loading,
    error,
  } = useProjectStore();
  
  const { groups, fetchGroups } = useGroupStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success'; isVisible: boolean } | null>(null);

  // 初始化加载
  useEffect(() => {
    console.log('Fetching projects...');
    fetchProjects();
    fetchGroups();
  }, [fetchProjects, fetchGroups]);

  useEffect(() => {
    if (error) {
      setToast({ message: error.message, type: 'error', isVisible: true });
    }
  }, [error]);

  useEffect(() => {
    if (toast?.isVisible) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, isVisible: false } : null);
        setTimeout(() => setToast(null), 300); // 等待渐出动画完成后清除toast
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast?.isVisible]);

  useEffect(() => {
    console.log('Projects updated:', projects);
  }, [projects]);

  const showToast = (message: string, type: 'error' | 'success') => {
    setToast({ message, type, isVisible: true });
  };

  // 获取组别名称的函数
  const getGroupName = (groupId: string) => {
    if (groupId === 'all') return '全部';
    const group = groups.find(g => g.id === groupId);
    return group ? group.name : '未知小组';
  };

  // 小组标签颜色映射
  const groupColors = [
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
  ];

  // 根据组ID获取颜色类名
  const getGroupColorClass = (groupId: string) => {
    const index = groups.findIndex(g => g.id === groupId) % groupColors.length;
    return groupColors[index];
  };

  const filteredProjects = useMemo(() => {
    if (!Array.isArray(projects)) {
      console.log('Projects is not an array:', projects);
      return [];
    }

    return projects.filter(project => {
      if (!project) return false;
      
      const searchLower = searchTerm.toLowerCase();
      const nameMatch = project.name?.toLowerCase().includes(searchLower) || false;
      const descMatch = project.description?.toLowerCase().includes(searchLower) || false;
      const groupMatch = filterGroup === 'all' || project.groupId === filterGroup;
      
      return (nameMatch || descMatch) && groupMatch;
    });
  }, [projects, searchTerm, filterGroup]);

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('确定要删除这个项目吗？')) {
      try {
        setIsSubmitting(true);
        await removeProject(id);
        showToast('项目删除成功', 'success');
      } catch (error: any) {
        showToast(error.message || '删除项目失败', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAddProject = async (project: Omit<Project, 'id'>) => {
    try {
      setIsSubmitting(true);
      await addProject(project);
      setIsAddModalOpen(false);
      showToast('项目创建成功', 'success');
    } catch (error: any) {
      showToast(error.message || '添加项目失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProject = async (id: string, data: Partial<Omit<Project, 'id'>>) => {
    try {
      setIsSubmitting(true);
      await updateProject(id, data);
      setEditingProject(null);
      showToast('项目更新成功', 'success');
    } catch (error: any) {
      showToast(error.message || '更新项目失败', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-lg font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="relative flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">项目管理</h2>
          <div className="absolute left-1/2 -translate-x-1/2">
            {toast && (
              <div
                className={`px-4 py-2 rounded-lg shadow-lg border ${
                  toast.type === 'error' 
                    ? 'bg-red-100 text-red-800 border-red-300' 
                    : 'bg-green-100 text-green-800 border-green-300'
                } ${toast.isVisible ? 'animate-fade-in' : 'animate-fade-out'}`}
              >
                {toast.message}
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <FolderGit2 className="h-5 w-5" />
              )}
              新建项目
            </button>
          </div>
        </div>
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="搜索项目..."
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
              {getGroupName(filterGroup)}
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <button
                  key="all"
                  className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                  onClick={() => {
                    setFilterGroup('all');
                    setIsFilterOpen(false);
                  }}
                >
                  全部
                </button>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setFilterGroup(group.id);
                      setIsFilterOpen(false);
                    }}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <h3 className="text-lg font-semibold break-all">{project.name}</h3>
                    <p className="text-gray-600 text-sm">{project.description}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => setEditingProject(project)}
                      className="p-1 text-indigo-600 hover:text-indigo-700"
                      title="编辑项目"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(project.id)}
                      className="p-1 text-red-600 hover:text-red-700"
                      title="删除项目"
                      disabled={isSubmitting}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="mt-auto flex justify-between items-center">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 mr-2">小组编号：</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm border ${getGroupColorClass(project.groupId)}`}>
                      {getGroupName(project.groupId)}
                    </div>
                  </div>
                  {project.gitRepo && (
                    <a
                      href={project.gitRepo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-base font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      <FolderGit2 className="h-5 w-5 stroke-10" />
                      Git仓库
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAddModalOpen && (
        <AddProjectModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={handleAddProject}
        />
      )}

      {editingProject && (
        <EditProjectModal
          isOpen={true}
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSubmit={(updatedProject) => handleUpdateProject(editingProject.id, updatedProject)}
        />
      )}
    </div>
  );
}