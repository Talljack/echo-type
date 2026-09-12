'use client';
import { DailyTaskQueue } from '@/components/learning/daily-task-queue';
export function TodayWorkspace() {
  return (
    <section data-testid="today-workspace">
      <DailyTaskQueue />
    </section>
  );
}
