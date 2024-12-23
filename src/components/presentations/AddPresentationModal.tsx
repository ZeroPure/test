import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useGroupStore } from '../../store/groupStore';
import { usePresentationStore } from '../../store/presentationStore';

interface AddPresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddPresentationModal({ isOpen, onClose }: AddPresentationModalProps) {
  const { projects } = useProjectStore();
  const { groups } = useGroupStore();
  const { addPresentation } = usePresentationStore();
  const [formData, setFormData] = useState({
    projectId: '',
    projectName: '',
    description: '',
    startTime: '',
    endTime: '',
    groupId: groups[0]?.id || ''
  });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const selectedProject = projects.find(p => p.id === formData.projectId);
    if (selectedProject) {
      try {
        await addPresentation({
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          description: formData.description || '展示任务管理系统的用户界面和协作功能',
          startTime: new Date(formData.startTime),
          endTime: new Date(formData.endTime),
          groupId: formData.groupId
        });
        onClose();
      } catch (error: any) {
        console.error('创建展示失败:', error);
        if (error.response?.data?.error === 'time_conflict') {
          const details = error.response?.data?.details;
          const conflictMessage = details?.length > 0
            ? `该小组在所选时间段内已有其他展示安排：\n${
                details.map((d: any) => 
                  `- ${d.projectName}: ${d.startTime} 至 ${d.endTime}`
                ).join('\n')
              }`
            : error.response?.data?.message || '该小组在所选时间段内已有其他展示安排';
          setError(conflictMessage);
        } else {
          setError('创建展示失败，请重试');
        }
      }
    }
  };

  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject) {
      setFormData({
        ...formData,
        projectId,
        projectName: selectedProject.name,
        description: '',
        groupId: selectedProject.groupId
      });
    } else {
      setFormData({
        ...formData,
        projectId: '',
        projectName: '',
        description: '',
        groupId: ''
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">安排项目展示</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                选择项目
              </label>
              <select
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                <option value="">请选择项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                展示小组
              </label>
              <select
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                value={formData.groupId}
              >
                {formData.projectId ? (
                  groups
                    .filter(group => group.id === formData.groupId)
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))
                ) : (
                  <option value="">请先选择项目</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                展示说明
              </label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.description}
                placeholder="请输入展示说明，例如：展示任务管理系统的用户界面和协作功能"
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                开始时间
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间
              </label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={formData.endTime}
                min={formData.startTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
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
              disabled={!formData.startTime || !formData.endTime || new Date(formData.endTime) <= new Date(formData.startTime)}
            >
              确定
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}