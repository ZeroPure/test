import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAccountStore } from '../../store/accountStore';
import { encodeTokenPayload } from '../../utils/auth';
import axios from 'axios';

interface FormData {
  username: string;
  password: string;
  confirmPassword: string;
  name: string;
  email: string;
  role: 'admin' | 'teacher' | 'student';
}

export default function LoginForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore(state => state.login);
  const { addAccount } = useAccountStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin) {
      // 注册逻辑
      if (formData.password !== formData.confirmPassword) {
        setError('两次输入的密码不一致');
        return;
      }
      if (formData.password.length < 6) {
        setError('密码长度至少6位');
        return;
      }

      try {
        const response = await axios.post('http://localhost:3000/api/register', {
          username: formData.username,
          password: formData.password,
          email: formData.email,
          name: formData.name,
          role: formData.role
        });

        const { user } = response.data;
        
        // 添加到本地状态
        addAccount({
          ...user,
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
          lastLogin: user.last_login ? new Date(user.last_login) : null
        });

        // 自动登录
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodeTokenPayload({
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email
        })}`;
        login(mockToken);
        navigate('/');
      } catch (error: any) {
        console.error('注册错误:', error);
        setError(error.response?.data?.error || '注册失败，请稍后重试');
      }
    } else {
      // 登录逻辑
      try {
        // 普通用户登录
        const response = await axios.post('http://localhost:3000/api/login', {
          username: formData.username,
          password: formData.password
        });

        const { user } = response.data;
        
        // 生成 token 并登录
        const mockToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${encodeTokenPayload({
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        })}`;
        login(mockToken);
        navigate('/');
      } catch (error: any) {
        console.error('登录错误:', error);
        setError(error.response?.data?.error || '用户名或密码错误');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? '登录系统' : '注册账号'}
          </h2>
          {error && (
            <p className="mt-2 text-center text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="name" className="sr-only">姓名</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                      placeholder="姓名"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="email" className="sr-only">邮箱</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="邮箱"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </>
            )}
            <div>
              <label htmlFor="username" className="sr-only">用户名</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="用户名"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">密码</label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {!isLogin && (
              <>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">确认密码</label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="确认密码"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLogin ? '登录' : '注册'}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({
                  username: '',
                  password: '',
                  confirmPassword: '',
                  name: '',
                  email: '',
                  role: 'student'
                });
              }}
              className="text-indigo-600 hover:text-indigo-500"
            >
              {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}