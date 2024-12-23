import React, { useState, useEffect, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { useResourceStore } from '../../store/resourceStore';
import { useGroupStore } from '../../store/groupStore';
import type { Resource } from '../../types';

interface EditResourceModalProps {
  resource: Resource | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EditResourceModal({ resource, isOpen, onClose }: EditResourceModalProps) {
  const { updateResource } = useResourceStore();
  const { groups } = useGroupStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    groupId: '',
    url: '',
    fileData: '',
    type: 'link' as Resource['type']
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resource) {
      setFormData({
        title: resource.title,
        description: resource.description || '',
        groupId: resource.groupId || '',
        url: resource.url,
        fileData: resource.fileData || '',
        type: resource.type
      });
      setError(null);
    }
  }, [resource]);

  if (!isOpen || !resource) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    // 检查文件大小（10MB限制）
    if (file.size > 10 * 1024 * 1024) {
      setError('文件大小不能超过10MB');
      return;
    }

    setSelectedFile(file);
    // 自动更新标题为新文件名（不包含扩展名）
    const fileName = file.name.split('.').slice(0, -1).join('.');
    setFormData(prev => ({
      ...prev,
      title: fileName,
      url: file.name
    }));

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({
          ...prev,
          fileData: base64String
        }));
      };
      reader.onerror = () => {
        setError('文件读取失败，请重试');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('文件读取失败，请重试');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(true);

    try {
      if (!formData.title.trim()) {
        throw new Error('请输入资源标题');
      }

      const updateData: Partial<Resource> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        groupId: formData.groupId
      };

      if (resource.type === 'file') {
        if (formData.fileData && formData.fileData !== resource.fileData) {
          updateData.url = selectedFile?.name || resource.url;
          updateData.fileData = formData.fileData;
        }
      } else {
        if (!formData.url) {
          throw new Error('请输入资源链接');
        }
        updateData.url = formData.url;
      }

      await updateResource(resource.id, updateData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    if (resource) {
      setFormData({
        title: resource.title,
        description: resource.description || '',
        groupId: resource.groupId || '',
        url: resource.url,
        fileData: resource.fileData || '',
        type: resource.type
      });
    }
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black opacity-30"></div>
        
        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold">编辑资源</h3>
            <button
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="rounded p-1 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">标题</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="输入资源标题"
              />
            </div>

            {resource.type === 'link' ? (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">链接地址</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-indigo-500"
                  placeholder="输入链接地址"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">更新文件</label>
                <div
                  className={`relative rounded-lg border-2 border-dashed p-6 text-center ${
                    dragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                  {selectedFile ? (
                    <div>
                      <p className="text-sm text-gray-600">{selectedFile.name}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null);
                          setFormData(prev => ({
                            ...prev,
                            fileData: resource.fileData || '',
                            url: resource.url
                          }));
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        取消更新
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        拖放新文件到此处，或{' '}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-indigo-600 hover:text-indigo-700"
                        >
                          点击上传
                        </button>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        支持所有常见文件格式，最大10MB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                所属小组
              </label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData(prev => ({ ...prev, groupId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">未分组</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">描述</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-indigo-500"
                rows={3}
                placeholder="输入资源描述（可选）"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50"
                disabled={uploading}
              >
                取消
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:bg-indigo-400"
                disabled={uploading}
              >
                {uploading ? '保存中...' : '保存更改'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}