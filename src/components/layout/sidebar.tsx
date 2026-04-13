"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Briefcase,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Candidatos", href: "/dashboard/candidates", icon: Users },
  { name: "Vagas", href: "/dashboard/jobs", icon: Briefcase },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-[260px] flex-col bg-[#0B0B0B] border-r border-[#1A1A1A]">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center px-6 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF3B3B]">
            <span className="text-xs font-bold text-white">M</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">Maverick 360</h1>
            <p className="text-[10px] text-gray-500 font-medium">HR Automation</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col overflow-y-auto py-4 px-3">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Menu</p>
        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                )}
              >
                <item.icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    isActive ? "text-[#FF3B3B]" : "text-gray-500 group-hover:text-gray-300"
                  )}
                  aria-hidden="true"
                />
                {item.name}
                {isActive && (
                  <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout */}
      <div className="shrink-0 p-3 border-t border-[#1A1A1A]">
        <form action={logout}>
          <button
            type="submit"
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all duration-200"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-gray-500 group-hover:text-gray-300" />
            Sair
          </button>
        </form>
      </div>
    </div>
  );
}
