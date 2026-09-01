import { getSession } from "@/lib/auth/session";
import { getNotifications } from "@/lib/data/notifications";
import { AppShell } from "./AppShell";

/**
 * Server Component: resuelve sesión y feed de notificaciones, y se los pasa
 * ya listos a <AppShell>. El único límite "use client" de arriba vive en
 * AppShell, así cada page.tsx sigue siendo Server Component.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const notifications = await getNotifications(session?.uid ?? null);

  return (
    <AppShell isGuest={!session} initialNotifications={notifications}>
      {children}
    </AppShell>
  );
}
