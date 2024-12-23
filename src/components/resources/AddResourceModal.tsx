import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { useResourceStore } from '../../store/resourceStore';
import { useGroupStore } from '../../store/groupStore';
import type { Resource } from '../../types';

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddResourceModal({ isOpen, onClose }: AddResourceModalProps) {
  const { addResource } = useResourceStore();
  const { groups } = useGroupStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'link' as Resource['type'],
    url: '',
    fileData: '',
    description: '',
    groupId: ''
  });
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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
    setFormData({
      ...formData,
      title: file.name.split('.')[0],
      type: 'file',
      url: file.name
    });

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
      if (formData.type === 'file') {
        if (!formData.fileData) {
          throw new Error('请先选择文件');
        }
      } else if (!formData.url) {
        throw new Error('请输入链接地址');
      }

      if (!formData.title.trim()) {
        throw new Error('请输入资源标题');
      }

      await addResource({
        title: formData.title.trim(),
        type: formData.type,
        url: formData.type === 'file' ? selectedFile?.name || '' : formData.url,
        fileData: formData.type === 'file' ? formData.fileData : undefined,
        description: formData.description.trim(),
        groupId: formData.groupId || null
      });

      onClose();
      // 重置表单
      setFormData({
        title: '',
        type: 'link',
        url: '',
        fileData: '',
        description: '',
        groupId: ''
      });
      setSelectedFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'link',
      url: '',
      fileData: '',
      description: '',
      groupId: ''
    });
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
            <h3 className="text-xl font-semibold">上传资源</h3>
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
              <label className="mb-1 block text-sm font-medium">资源类型</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'link' })}
                  className={`flex-1 rounded-lg border p-3 text-center ${
                    formData.type === 'link'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <LinkIcon className="mx-auto h-6 w-6 mb-1" />
                  <span className="text-sm">链接</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, type: 'file' })}
                  className={`flex-1 rounded-lg border p-3 text-center ${
                    formData.type === 'file'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="mx-auto h-6 w-6 mb-1" />
                  <span className="text-sm">文件</span>
                </button>
              </div>
            </div>

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

            {formData.type === 'link' ? (
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
                <label className="mb-1 block text-sm font-medium">上传文件</label>
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
                          setFormData({ ...formData, fileData: '', url: '' });
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }}
                        className="mt-2 text-sm text-red-600 hover:text-red-700"
                      >
                        移除文件
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        拖放文件到此处，或{' '}
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

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">所属小组</label>
              <select
                value={formData.groupId}
                onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                className="w-full rounded-lg border border-gray-300 p-2 focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">不分配小组</option>
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
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}