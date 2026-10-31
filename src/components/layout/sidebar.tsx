'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Stethoscope,
  Users,
  FileText,
  BarChart3,
  LogOut,
  Heart,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROUTES, APP_NAME } from '@/lib/constants';
import { signOut } from 'next-auth/react';

const navItems = [
  { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard' },
  { href: ROUTES.CONSULTATIONS, icon: Stethoscope, label: 'Consultations' },
  { href: ROUTES.PATIENTS, icon: Users, label: 'Patients' },
  { href: ROUTES.PRESCRIPTIONS, icon: FileText, label: 'Prescriptions' },
  { href: ROUTES.ANALYTICS, icon: BarChart3, label: 'Analytics' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{APP_NAME}</p>
          <p className="text-xs text-gray-500">Doctor Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive =
              href === ROUTES.DASHBOARD
                ? pathname === href
                : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon
                      className={cn(
                        'h-4.5 w-4.5',
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600',
                      )}
                      size={18}
                    />
                    {label}
                  </span>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-blue-500" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/login' })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700 transition-all duration-150"
        >
          <LogOut size={18} className="text-gray-400" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
