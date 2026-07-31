import { UserProvider } from "@/components/UserProvider";

/**
 * Wraps every product (/chats now, /checklists etc. later) - resolves the
 * logged-in user and lays out "sidebar + main panel". /login stays outside this
 * group, so it gets no panel. Each product renders its own sidebar (built on
 * SidebarShell) plus its main panel as the two children of this flex row.
 */
export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      <div className="fixed inset-0 flex overflow-hidden">{children}</div>
    </UserProvider>
  );
}
