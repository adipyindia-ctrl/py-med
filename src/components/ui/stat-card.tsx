import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from './card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  className?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-amber-50 text-amber-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
  className,
}: StatCardProps) {
  return (
    <Card className={cn('hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <p
                className={cn('mt-1 text-xs font-medium', {
                  'text-emerald-600': changeType === 'positive',
                  'text-red-600': changeType === 'negative',
                  'text-gray-500': changeType === 'neutral',
                })}
              >
                {change}
              </p>
            )}
          </div>
          <div className={cn('rounded-xl p-3', colorMap[color])}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
