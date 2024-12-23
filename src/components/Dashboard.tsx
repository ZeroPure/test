import React, { useEffect } from 'react';
import { Users, FolderGit2, FileText, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccountStore } from '../store/accountStore';
import { useProjectStore } from '../store/projectStore';
import { useResourceStore } from '../store/resourceStore';
import { useActivityStore } from '../store/activityStore';
import { usePresentationStore } from '../store/presentationStore';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { accounts, fetchAccounts } = useAccountStore();
  const { projects, fetchProjects } = useProjectStore();
  const { resources, fetchResources } = useResourceStore();
  const { presentations, fetchPresentations } = usePresentationStore();
  const { getRecentActivities } = useActivityStore();

  useEffect(() => {
    fetchAccounts();
    fetchProjects();
    fetchResources();
    fetchPresentations();
  }, [fetchAccounts, fetchProjects, fetchResources, fetchPresentations]);

  const studentCount = accounts.filter(account => account.role === 'student').length;

  const upcomingPresentations = presentations
    .filter(p => p.status === 'upcoming')
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 4);

  const canAccessStudents = user?.role === 'admin' || user?.role === 'teacher';

  const cards = [
    ...(canAccessStudents ? [{
      icon: Users,
      title: '学生',
      count: `${studentCount} 名`,
      subtitle: '学生',
      path: '/students'
    }] : []),
    {
      icon: FolderGit2,
      title: '项目',
      count: `${projects.length} 个`,
      subtitle: '项目',
      path: '/projects'
    },
    {
      icon: FileText,
      title: '资源',
      count: `${resources.length} 个`,
      subtitle: '资源',
      path: '/resources'
    },
    {
      icon: Calendar,
      title: '展示',
      count: `${presentations.length} 场`,
      subtitle: '展示',
      path: '/presentations'
    }
  ];

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
    
    if (diffInSeconds < 60) return '刚刚';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分钟前`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}小时前`;
    return `${Math.floor(diffInSeconds / 86400)}天前`;
  };

  const formatPresentationTime = (date: Date) => {
    const now = new Date();
    const presentationDate = new Date(date);
    const diffInDays = Math.floor((presentationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      const hours = presentationDate.getHours().toString().padStart(2, '0');
      const minutes = presentationDate.getMinutes().toString().padStart(2, '0');
      return `今天 ${hours}:${minutes}`;
    } else if (diffInDays === 1) {
      return '明天';
    } else if (diffInDays === 2) {
      return '后天';
    } else if (diffInDays < 7) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[presentationDate.getDay()];
    } else {
      return presentationDate.toLocaleDateString();
    }
  };

  const getActivityText = (activity: any) => {
    const actionText = {
      create: '创建了',
      update: '更新了',
      delete: '删除了'
    }[activity.action];

    const typeText = {
      student: '学生',
      project: '项目',
      resource: '资源'
    }[activity.type];

    return `${actionText}${typeText}: ${activity.targetName}`;
  };

  const recentActivities = getRecentActivities(3).slice(0, 4);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate(card.path)}
          >
            <div className="flex items-center">
              <card.icon className="h-8 w-8 text-indigo-600" />
              <div className="ml-4">
                <h2 className="text-lg font-semibold">{card.title}</h2>
                <p className="text-gray-600">{card.count} {card.subtitle}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">最近活动</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity) => (
                  <div
                    key={activity.id}
                    onClick={() => navigate(activity.path)}
                    className="flex items-center p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    <div className="ml-4 flex-1">
                      <p className="text-sm font-medium">{getActivityText(activity)}</p>
                      <p className="text-xs text-gray-500">{formatTimeAgo(activity.timestamp)}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">最近3天没有活动记录</p>
              )}
            </div>
          </div>
        )}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">即将进行的展示</h2>
            <button
              onClick={() => navigate('/presentations')}
              className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
            >
              查看全部
            </button>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {upcomingPresentations.length > 0 ? (
              upcomingPresentations.map((presentation) => (
                <div
                  key={presentation.id}
                  onClick={() => navigate('/presentations')}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium">{presentation.projectName}</p>
                      <p className="text-xs text-gray-500">{presentation.description}</p>
                    </div>
                  </div>
                  <span className="text-sm text-indigo-600 font-medium">
                    {formatPresentationTime(presentation.startTime)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">暂无即将进行的展示</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}