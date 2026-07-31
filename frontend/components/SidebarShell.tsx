"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import SettingsModal from "@/components/SettingsModal";
import UserMenu from "@/components/UserMenu";
import { IconButton, PanelIcon } from "@/components/icons";
import { useUser } from "@/components/UserProvider";
import {
  getSidebarServerState,
  getSidebarState,
  setSidebarState,
  subscribeSidebar,
} from "@/lib/sidebar";

const noopSubscribe = () => () => {};

/**
 * The only part of the left panel shared by every product: the frame itself,
 * the collapse/expand control and the user menu. Products fill the slots:
 *   - `pinned`          a block right under the header that never scrolls
 *   - `children`        scrollable sections shown while expanded
 *   - `collapsedRail`   icon buttons shown while collapsed
 *   - `headerActions`   icon buttons next to the collapse control
 *   - `menuExtras`      product-specific rows inside the user menu
 */
export default function SidebarShell({
  title,
  children,
  pinned,
  collapsedRail,
  headerActions,
  menuExtras,
}: {
  title: string;
  children: React.ReactNode;
  pinned?: React.ReactNode;
  collapsedRail?: React.ReactNode;
  headerActions?: React.ReactNode;
  menuExtras?: React.ReactNode;
}) {
  const router = useRouter();
  const { username, role } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // localStorage is an external store: the prerendered markup can't know the
  // state, so it renders expanded and settles on mount. globals.css keeps the
  // width right before hydration via the data-sidebar attribute (and hides the
  // not-yet-swapped markup until data-hydrated lands), so nothing shifts.
  const collapsed =
    useSyncExternalStore(subscribeSidebar, getSidebarState, getSidebarServerState) === "collapsed";
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  const setPanel = (next: boolean) => setSidebarState(next ? "collapsed" : "expanded");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const userMenu = (
    <UserMenu
      username={username}
      onOpenSettings={() => setSettingsOpen(true)}
      onLogout={logout}
      collapsed={collapsed}
      extras={menuExtras}
    />
  );

  return (
    <>
      <div
        data-sidebar-frame
        data-hydrated={hydrated ? "" : undefined}
        className={`flex h-full flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-200 ease-in-out ${
          collapsed ? "w-12" : "w-64"
        }`}
      >
        {collapsed ? (
          <>
            <div className="flex flex-col items-center gap-1 py-3">
              <IconButton onClick={() => setPanel(false)} label="Expand sidebar">
                <PanelIcon />
              </IconButton>
              {collapsedRail}
            </div>
            <div className="mt-auto flex flex-col items-center p-2">{userMenu}</div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-border px-3 py-3">
              <span className="whitespace-nowrap text-sm font-semibold">{title}</span>
              <div className="flex items-center gap-1">
                {headerActions}
                <IconButton onClick={() => setPanel(true)} label="Collapse sidebar">
                  <PanelIcon />
                </IconButton>
              </div>
            </div>
            {pinned && <div className="border-b border-border p-2">{pinned}</div>}
            <div className="min-h-0 flex-1 overflow-y-auto py-1">{children}</div>
            <div className="border-t border-border p-2">{userMenu}</div>
          </>
        )}
      </div>
      {settingsOpen && (
        <SettingsModal username={username} role={role} onClose={() => setSettingsOpen(false)} />
      )}
    </>
  );
}
