import React, { useState, useEffect } from 'react';
import { Search, Filter, Edit2, Trash2, Link as LinkIcon, FileUp, FileImage, FileCode, FileArchive, FileAudio, FileVideo } from 'lucide-react';
import { useResourceStore } from '../../store/resourceStore';
import { useGroupStore } from '../../store/groupStore';
import AddResourceModal from './AddResourceModal';
import EditResourceModal from './EditResourceModal';
import type { Resource } from '../../types';

const FileIcon = ({ className = "h-8 w-8", type }: { className?: string, type: string }) => {
  const baseStyle = `${className} flex-shrink-0`;
  
  switch (type) {
    case 'DOCX':
    case 'DOC':
      return (
        <svg className={baseStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#2B579A"/>
          <path d="M14 2L20 8H14V2Z" fill="#4B8AD1"/>
          <text x="8" y="17" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">W</text>
        </svg>
      );
    case 'XLSX':
    case 'XLS':
    case 'CSV':
      return (
        <svg className={baseStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#217346"/>
          <path d="M14 2L20 8H14V2Z" fill="#33C481"/>
          <text x="9" y="17" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">X</text>
        </svg>
      );
    case 'PPTX':
    case 'PPT':
      return (
        <svg className={baseStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#C43E1C"/>
          <path d="M14 2L20 8H14V2Z" fill="#FF8F6B"/>
          <text x="9" y="17" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">P</text>
        </svg>
      );
    case 'PDF':
      return (
        <svg className={baseStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#E53935"/>
          <path d="M14 2L20 8H14V2Z" fill="#FFCDD2"/>
          <text x="9" y="16" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">P</text>
        </svg>
      );
    case 'TXT':
    case 'MD':
    case 'RTF':
      return (
        <svg className={baseStyle} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4C4 2.89543 4.89543 2 6 2H14L20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V4Z" fill="#607D8B"/>
          <path d="M14 2L20 8H14V2Z" fill="#B0BEC5"/>
          <path d="M8 12H16M8 15H16" stroke="white" strokeWidth="1.5"/>
        </svg>
      );
    default:
      return null;
  }
};

export default function ResourceList() {
  const { resources, removeResource, downloadResource, fetchResources } = useResourceStore();
  const { groups, fetchGroups } = useGroupStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState<string>('全部');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [deletingResource, setDeletingResource] = useState<Resource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      console.log('Fetching resources and groups...');
      await Promise.all([fetchResources(), fetchGroups()]);
    };
    loadData();
  }, [fetchResources, fetchGroups]);

  // 监听资源和组数据变化
  useEffect(() => {
    console.log('Resources updated:', resources);
    console.log('Groups updated:', groups);
  }, [resources, groups]);

  const getGroupName = (resource: Resource) => {
    // 优先使用后端返回的 group_name
    if (resource.group_name) return resource.group_name;
    
    // 如果没有 group_name，尝试通过 groupId 查找
    if (resource.group_id) {
      const group = groups.find(g => g.id === resource.group_id);
      return group?.name || null;
    }
    return null;
  };

  const getResourceTypeInfo = (type: Resource['type'], fileName?: string) => {
    if (type === 'link') {
      return {
        icon: <LinkIcon className="h-8 w-8 text-green-600" />,
        label: '链接',
        labelClass: 'bg-green-100 text-green-800'
      };
    }

    if (fileName) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      
      if (['doc', 'docx'].includes(extension || '')) {
        return {
          icon: <FileIcon type={extension?.toUpperCase() || 'DOCX'} />,
          label: extension?.toUpperCase() || 'WORD',
          labelClass: 'bg-blue-100 text-blue-800'
        };
      }
      
      if (extension === 'pdf') {
        return {
          icon: <FileIcon type="PDF" />,
          label: 'PDF',
          labelClass: 'bg-red-100 text-red-800'
        };
      }
      
      if (['ppt', 'pptx'].includes(extension || '')) {
        return {
          icon: <FileIcon type={extension?.toUpperCase() || 'PPT'} />,
          label: extension?.toUpperCase() || 'PPT',
          labelClass: 'bg-orange-100 text-orange-800'
        };
      }
      
      if (['xls', 'xlsx', 'csv'].includes(extension || '')) {
        return {
          icon: <FileIcon type={extension?.toUpperCase() || 'XLSX'} />,
          label: extension?.toUpperCase() || 'EXCEL',
          labelClass: 'bg-emerald-100 text-emerald-800'
        };
      }
      
      if (['txt', 'md', 'rtf'].includes(extension || '')) {
        return {
          icon: <FileIcon type={extension?.toUpperCase() || 'TXT'} />,
          label: extension?.toUpperCase() || 'TEXT',
          labelClass: 'bg-gray-100 text-gray-800'
        };
      }
      
      if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension || '')) {
        return {
          icon: <FileImage className="h-8 w-8 text-purple-600" />,
          label: extension?.toUpperCase() || 'IMAGE',
          labelClass: 'bg-purple-100 text-purple-800'
        };
      }
      
      if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp', 'c', 'php'].includes(extension || '')) {
        return {
          icon: <FileCode className="h-8 w-8 text-indigo-600" />,
          label: extension?.toUpperCase() || 'CODE',
          labelClass: 'bg-indigo-100 text-indigo-800'
        };
      }
      
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension || '')) {
        return {
          icon: <FileArchive className="h-8 w-8 text-yellow-600" />,
          label: extension?.toUpperCase() || 'ARCHIVE',
          labelClass: 'bg-yellow-100 text-yellow-800'
        };
      }
      
      if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension || '')) {
        return {
          icon: <FileAudio className="h-8 w-8 text-pink-600" />,
          label: extension?.toUpperCase() || 'AUDIO',
          labelClass: 'bg-pink-100 text-pink-800'
        };
      }
      
      if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(extension || '')) {
        return {
          icon: <FileVideo className="h-8 w-8 text-rose-600" />,
          label: extension?.toUpperCase() || 'VIDEO',
          labelClass: 'bg-rose-100 text-rose-800'
        };
      }
    }
    
    return {
      icon: <FileIcon type="TXT" />,
      label: 'FILE',
      labelClass: 'bg-gray-100 text-gray-800'
    };
  };

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = filterGroup === '全部' || resource.group_id === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const handleDeleteResource = async (resource: Resource) => {
    setDeletingResource(resource);
  };

  const confirmDelete = async () => {
    if (!deletingResource) return;
    
    try {
      setIsDeleting(true);
      await removeResource(deletingResource.id);
      // toast.success('资源删除成功');
    } catch (error) {
      console.error('删除资源失败:', error);
      // toast.error('删除资源失败');
    } finally {
      setIsDeleting(false);
      setDeletingResource(null);
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      await downloadResource(resource.id);
    } catch (error: any) {
      console.error('下载失败:', error);
      // toast.error(error.message || '下载失败');
    }
  };

  const filterOptions = ['全部', ...groups.map(group => ({
    id: group.id,
    name: group.name
  }))];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">资源管理</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
              >
                <Filter className="h-5 w-5" />
                {filterGroup === '全部' ? '全部' : groups.find(g => g.id === filterGroup)?.name || filterGroup}
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <button
                    key="all"
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setFilterGroup('全部');
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
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
            >
              <FileUp className="h-5 w-5" />
              上传资源
            </button>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="搜索资源..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResources.map((resource) => {
            const resourceTypeInfo = getResourceTypeInfo(resource.type, resource.url);
            const groupName = getGroupName(resource);
            
            return (
              <div key={resource.id} className="flex flex-col border rounded-lg hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {resourceTypeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {resource.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                      {resource.description || '暂无简介'}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>上传时间：{
                        resource.uploadedAt instanceof Date 
                          ? resource.uploadedAt.toLocaleDateString() 
                          : new Date(resource.uploadedAt).toLocaleDateString()
                      }</span>
                      <span className={`px-2 py-1 rounded-full ${resourceTypeInfo.labelClass}`}>
                        {resourceTypeInfo.label}
                      </span>
                      {groupName && (
                        <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">
                          {groupName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-auto border-t px-4 py-3 flex items-center justify-end gap-4">
                  <button
                    onClick={() => handleDownload(resource)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {resource.type === 'link' ? '访问' : '下载'}
                  </button>
                  <button 
                    onClick={() => setEditingResource(resource)}
                    className="text-indigo-600 hover:text-indigo-700"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => handleDeleteResource(resource)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredResources.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500">
              暂无{filterGroup === '全部' ? '' : `${groups.find(g => g.id === filterGroup)?.name}的`}资源
            </div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {deletingResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium mb-4">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除资源 "{deletingResource.title}" 吗？此操作无法撤销。
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setDeletingResource(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                disabled={isDeleting}
              >
                {isDeleting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AddResourceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditResourceModal
        resource={editingResource}
        isOpen={!!editingResource}
        onClose={() => setEditingResource(null)}
      />
    </div>
  );
}