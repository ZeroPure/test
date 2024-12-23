import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Activity } from '../types';

interface ActivityState {
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  getRecentActivities: (days: number) => Activity[];
}

export const useActivityStore = create<ActivityState>()(
  persist(
    (set, get) => ({
      activities: [],
      addActivity: (activity) => {
        const newActivity = {
          ...activity,
          id: Date.now().toString(),
          timestamp: new Date(),
        };
        set((state) => ({
          activities: [newActivity, ...state.activities]
        }));
      },
      getRecentActivities: (days) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        return get().activities.filter(
          activity => new Date(activity.timestamp) > cutoffDate
        );
      },
    }),
    {
      name: 'activity-storage',
    }
  )
);