import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LoginForm from './components/auth/LoginForm';
import StudentList from './components/students/StudentList';
import ProjectList from './components/projects/ProjectList';
import ResourceList from './components/resources/ResourceList';
import PresentationList from './components/presentations/PresentationList';
import ProfilePage from './components/profile/ProfilePage';
import AccountList from './components/accounts/AccountList';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        {isAuthenticated && <Navbar />}
        <main className="max-w-7xl mx-auto p-4">
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/" element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            } />
            <Route path="/students" element={
              <PrivateRoute>
                <StudentList />
              </PrivateRoute>
            } />
            <Route path="/projects" element={
              <PrivateRoute>
                <ProjectList />
              </PrivateRoute>
            } />
            <Route path="/resources" element={
              <PrivateRoute>
                <ResourceList />
              </PrivateRoute>
            } />
            <Route path="/presentations" element={
              <PrivateRoute>
                <PresentationList />
              </PrivateRoute>
            } />
            <Route path="/accounts" element={
              <PrivateRoute>
                <AccountList />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            } />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;