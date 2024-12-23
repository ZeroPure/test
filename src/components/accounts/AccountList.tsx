import React, { useState, useEffect, useMemo } from 'react';
import { Search, UserPlus, Edit2, Trash2, Clock, Filter } from 'lucide-react';
import { useAccountStore } from '../../store/accountStore';
import AddAccountModal from './AddAccountModal';
import EditAccountModal from './EditAccountModal';
import type { UserAccount } from '../../types';

export default function AccountList() {
  const { accounts, removeAccount, fetchAccounts } = useAccountStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | UserAccount['role']>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const filteredAndSortedAccounts = useMemo(() => {
    // 首先过滤账户
    const filtered = accounts.filter(account => {
      const matchesSearch = 
        (account.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         account.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         account.email?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterRole === 'all' || account.role === filterRole;
      return matchesSearch && matchesRole;
    });

    // 然后按角色排序，管理员置顶
    return filtered.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1;
      if (a.role !== 'admin' && b.role === 'admin') return 1;
      // 如果角色相同，按创建时间排序
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [accounts, searchTerm, filterRole]);

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm('确定要删除这个账户吗？')) {
      try {
        await removeAccount(id);
      } catch (error: any) {
        alert(error.message);
      }
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin':
        return '管理员';
      case 'teacher':
        return '教师';
      case 'student':
        return '学生';
      default:
        return '未知';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'teacher':
        return 'bg-green-100 text-green-800';
      case 'student':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filterOptions = [
    { value: 'all', label: '全部角色' },
    { value: 'admin', label: '管理员' },
    { value: 'teacher', label: '教师' },
    { value: 'student', label: '学生' }
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">账户管理</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
          >
            <UserPlus className="h-5 w-5" />
            添加账户
          </button>
        </div>

        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="搜索账户..."
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
              {filterOptions.find(option => option.value === filterRole)?.label}
            </button>
            
            {isFilterOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setFilterRole(option.value as 'all' | UserAccount['role']);
                      setIsFilterOpen(false);
                    }}
                  >
                    {option.label}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-indigo-600 font-medium">
                            {account.username[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{account.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(account.role)}`}>
                      {getRoleText(account.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(account.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-gray-400" />
                      {account.lastLogin ? formatDate(account.lastLogin) : '从未登录'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingAccount(account)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={account.role === 'admin'}
                      >
                        <Trash2 className={`h-5 w-5 ${account.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedAccounts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无{filterRole === 'all' ? '' : getRoleText(filterRole)}账户
            </div>
          )}
        </div>
      </div>

      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditAccountModal
        account={editingAccount}
        isOpen={!!editingAccount}
        onClose={() => setEditingAccount(null)}
      />
    </div>
  );
}