import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'emergency';
}

const variantClasses: Record<string, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  emergency: 'bg-red-600 text-white animate-pulse',
};

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export function getStatusBadgeVariant(status: string): BadgeProps['variant'] {
  const map: Record<string, BadgeProps['variant']> = {
    PENDING: 'warning',
    PAID: 'info',
    IN_REVIEW: 'info',
    PRESCRIPTION_READY: 'success',
    COMPLETED: 'default',
    CANCELLED: 'danger',
    EMERGENCY: 'emergency',
    SUCCESS: 'success',
    FAILED: 'danger',
    LOW: 'success',
    MEDIUM: 'warning',
    HIGH: 'danger',
  };
  return map[status] ?? 'default';
}
