import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useActivityStore } from './activityStore';
import { useAuthStore } from './authStore';
import type { Student } from '../types';

interface StudentState {
  students: Student[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, data: Partial<Omit<Student, 'id'>>) => void;
  removeStudent: (id: string) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      students: [
        { id: '1', name: '张三', email: 'zhangsan@example.com', group: '第一组' },
        { id: '2', name: '李四', email: 'lisi@example.com', group: '第二组' },
        { id: '3', name: '王五', email: 'wangwu@example.com', group: '第一组' },
      ],


      addStudent: (student) => {
        const newStudent = { ...student, id: Date.now().toString() };
        set((state) => ({
          students: [...state.students, newStudent]
        }));
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.role !== 'student') {
          useActivityStore.getState().addActivity({
            type: 'student',
            action: 'create',
            targetId: newStudent.id,
            targetName: newStudent.name,
            path: '/students'
          });
        }
      },
      updateStudent: (id, data) => {
        set((state) => ({
          students: state.students.map(student =>
            student.id === id ? { ...student, ...data } : student
          )
        }));
        const student = useStudentStore.getState().students.find(s => s.id === id);
        const currentUser = useAuthStore.getState().user;
        if (student && currentUser?.role !== 'student') {
          useActivityStore.getState().addActivity({
            type: 'student',
            action: 'update',
            targetId: id,
            targetName: student.name,
            path: '/students'
          });
        }
      },
      removeStudent: (id) => {
        const student = useStudentStore.getState().students.find(s => s.id === id);
        set((state) => ({
          students: state.students.filter(student => student.id !== id)
        }));
        const currentUser = useAuthStore.getState().user;
        if (student && currentUser?.role !== 'student') {
          useActivityStore.getState().addActivity({
            type: 'student',
            action: 'delete',
            targetId: id,
            targetName: student.name,
            path: '/students'
          });
        }
      },
    }),
    {
      name: 'student-storage',
    }
  )
);