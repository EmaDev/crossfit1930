"use client";

import { createContext, useContext } from "react";
import type { AppNotification } from "lib-kit-components";

/**
 * Contexto mínimo del centro de notificaciones. El estado real vive en
 * <AppShell>; cada header (Server Component) sólo consume `unread` y `open`.
 */
export const NotificationsCtx = createContext<{
  items: AppNotification[];
  unread: number;
  open: () => void;
} | null>(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationsCtx);
  if (!ctx) throw new Error("useNotifications fuera del shell");
  return ctx;
};
