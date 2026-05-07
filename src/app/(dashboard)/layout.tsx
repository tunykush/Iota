"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { chatApi, documentsApi } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/lib/api/types";

type DashboardUser = {
  email: string;
  name: string;
  role: "admin" | "user";
};

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    badge: null,
  },
  {
    href: "/dashboard/chat",
    label: "Chat",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    badge: null,
  },
  {
    href: "/dashboard/documents",
    label: "Documents",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    badge: null,
  },
  {
    href: "/dashboard/upload",
    label: "Upload",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
    badge: null,
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [recentChats, setRecentChats] = useState<Conversation[]>([]);

  const isSettingsActive = pathname === "/dashboard/settings";
  const userInitial = useMemo(() => {
    const source = user?.name || user?.email || "U";
    return source.trim().charAt(0).toUpperCase();
  }, [user]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data }) => {
      const currentUser = data.user;

      if (!currentUser?.email) {
        setUser(null);
        return;
      }

      const fullName = currentUser.user_metadata?.full_name as string | undefined;
      const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", currentUser.id).maybeSingle();
      setUser({
        email: currentUser.email,
        name: profile?.full_name?.trim() || fullName?.trim() || currentUser.email.split("@")[0],
        role: profile?.role === "admin" ? "admin" : "user",
      });
    });
  }, []);

  useEffect(() => {
    Promise.allSettled([documentsApi.list(), chatApi.listConversations()]).then(([docsResult, chatsResult]) => {
      if (docsResult.status === "fulfilled") {
        setDocumentCount(docsResult.value.total);
      }

      if (chatsResult.status === "fulfilled") {
        setRecentChats(chatsResult.value.conversations.slice(0, 3));
      }
    });
  }, [pathname]);

  const navItems = NAV_ITEMS.map((item) =>
    item.href === "/dashboard/documents"
      ? { ...item, badge: documentCount > 0 ? documentCount.toString() : null }
      : item,
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-0 z-50 h-dvh w-screen
          bg-background border-r border-black/10
          flex flex-col overflow-hidden
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:inset-auto lg:top-0 lg:h-screen lg:w-[220px] lg:translate-x-0 lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-black/10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full border border-black/20 flex items-center justify-center">
              <span className="font-serif italic text-xs">i</span>
            </div>
            <span className="font-display font-medium">iota</span>
          </Link>
          <button
            type="button"
            className="lg:hidden p-1 text-muted hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Workspace badge */}
        <div className="flex-none px-5 py-3 border-b border-black/10">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-sm bg-accent/15 flex items-center justify-center flex-shrink-0">
              <span className="font-serif italic text-accent text-xs">i</span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">
                {user?.name ? `${user.name}'s workspace` : "Your workspace"}
              </div>
              <div className="text-[10px] text-muted font-mono tracking-wider">FREE PLAN</div>
            </div>
            <svg className="w-3 h-3 text-muted ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Scrollable nav area */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-0.5">
          <div className="text-[9px] font-mono text-muted tracking-widest uppercase px-2 mb-2">Navigation</div>
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm transition-colors
                  ${active
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:bg-black/5 hover:text-foreground"
                  }
                `}
              >
                <span className={active ? "opacity-100" : "opacity-60"}>{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${active ? "bg-white/20" : "bg-black/8 text-muted"}`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="h-px bg-black/10 my-3" />

          <div className="text-[9px] font-mono text-muted tracking-widest uppercase px-2 mb-2">Recent chats</div>
          {recentChats.length > 0 ? (
            recentChats.map((chat) => (
              <Link
                key={chat.id}
                href="/dashboard/chat"
                onClick={() => setSidebarOpen(false)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-foreground/60 hover:bg-black/5 hover:text-foreground transition-colors text-left"
              >
                <span className="font-serif italic text-accent text-sm leading-none">.</span>
                <span className="truncate">{chat.title ?? "Untitled conversation"}</span>
              </Link>
            ))
          ) : (
            <div className="px-2 py-1.5 text-[10px] text-muted">No chats yet.</div>
          )}
        </nav>

        {/* ── Fixed bottom: Settings + User ── */}
        <div className="flex-none border-t border-black/10">
          {/* Settings link */}
          <div className="px-3 py-2 border-b border-black/10">
            {user?.role === "admin" && (
              <Link
                href="/dashboard/admin"
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm transition-colors mb-1
                  ${pathname === "/dashboard/admin"
                    ? "bg-foreground text-background"
                    : "text-foreground/70 hover:bg-black/5 hover:text-foreground"
                  }
                `}
              >
                <span className={pathname === "/dashboard/admin" ? "opacity-100" : "opacity-60"}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </span>
                <span className="flex-1">Admin</span>
              </Link>
            )}
            <Link
              href="/dashboard/settings"
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-2.5 px-2 py-2 rounded-sm text-sm transition-colors
                ${isSettingsActive
                  ? "bg-foreground text-background"
                  : "text-foreground/70 hover:bg-black/5 hover:text-foreground"
                }
              `}
            >
              <span className={isSettingsActive ? "opacity-100" : "opacity-60"}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span className="flex-1">Settings</span>
            </Link>
          </div>

          {/* User card */}
          <div className="flex items-center gap-2.5 px-5 py-3">
            <div className="w-7 h-7 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
              <span className="text-background text-[10px] font-medium">{userInitial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium truncate">{user?.name ?? "Loading..."}</div>
              <div className="text-[10px] text-muted truncate">{user?.email ?? "Checking session"}</div>
            </div>
            <form action={signOut}>
              <button type="submit" className="text-muted hover:text-accent transition-colors flex-shrink-0" title="Sign out">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-black/10 px-4 lg:px-6 py-3 flex items-center gap-4">
          <button
            type="button"
            className="lg:hidden p-1.5 -ml-1.5 text-muted hover:text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 text-sm min-w-0">
            <span className="text-muted hidden sm:inline">iota</span>
            <span className="text-muted hidden sm:inline">/</span>
            <span className="font-medium truncate capitalize">
              {pathname.split("/").filter(Boolean).pop() ?? "dashboard"}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono text-muted tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              LIVE DATA
            </div>
            <Link href="/dashboard/chat" className="dash-btn-primary h-8 px-3 text-xs">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New chat
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
