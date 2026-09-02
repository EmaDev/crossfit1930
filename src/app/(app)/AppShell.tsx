"use client";

import { useMemo, useState, useTransition } from "react";
import {
  NativeShell,
  SafeArea,
  SplashScreen,
  OfflineBanner,
  PwaInstallPrompt,
  UpdatePrompt,
  BottomNav,
  SnackbarProvider,
  NotificationSidebar,
  useSplash,
  type BottomNavItem,
  type AppNotification,
} from "lib-kit-components";
import { HomeIcon, TimerIcon, TrophyIcon, UserIcon } from "@/components/atoms/icons";
import { GuestGateModal, GuestGateProvider } from "@/components/molecules/guest-gate";
import {
  dismissNotification,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import { NotificationsCtx } from "./notifications-context";

const APP_NAME = "Crossfit team";

/**
 * El logo de la marca para los overlays del kit (splash y prompt de
 * instalación). Va el PNG cuadrado con fondo blanco —el mismo que el ícono de
 * instalación— porque la barra y los discos son negros y se perderían sobre el
 * degradado rojo del splash. Los contenedores del kit ya recortan y redondean.
 */
const APP_ICON = (
  <img src="/icons/512.png" alt="" className="h-full w-full object-cover" />
);

/**
 * Las 4 pantallas raíz. `/historial` queda fuera a propósito: es una pantalla
 * anidada a la que se llega desde Inicio y desde Perfil, no un tab.
 */
const NAV: BottomNavItem[] = [
  { label: "Inicio", href: "/", icon: <HomeIcon /> },
  { label: "Ranking", href: "/ranking", icon: <TrophyIcon /> },
  { label: "Timer", href: "/timer", icon: <TimerIcon /> },
  { label: "Perfil", href: "/perfil", icon: <UserIcon /> },
];

export function AppShell({
  isGuest,
  initialNotifications,
  children,
}: {
  isGuest: boolean;
  initialNotifications: AppNotification[];
  children: React.ReactNode;
}) {
  const { visible, progress } = useSplash({ minDuration: 1500, oncePerSession: true });

  // Centro de notificaciones: el feed lo trae el servidor, acá vive el estado
  // optimista (lo que el usuario acaba de leer/descartar) y la apertura del drawer.
  const [notifOpen, setNotifOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>(initialNotifications);
  const [, startTransition] = useTransition();
  const unread = items.filter((n) => !n.read).length;

  const notifCtx = useMemo(
    () => ({ items, unread, open: () => setNotifOpen(true) }),
    [items, unread],
  );

  // Un invitado puede mirar el feed, no dejar marcas: nada que persistir.
  const persist = (fn: () => Promise<void>) => {
    if (isGuest) return;
    startTransition(() => void fn());
  };

  return (
    <SnackbarProvider position="bottom-center" gap={80}>
      {/* 80 = alto del BottomNav (64) + margen */}
      <GuestGateProvider isGuest={isGuest}>
        <NotificationsCtx.Provider value={notifCtx}>
          <NativeShell onlyWhenInstalled>
            <SplashScreen
              visible={visible}
              progress={progress}
              appName={APP_NAME}
              tagline="Tu box, siempre a mano"
              variant="bars"
              background="brand"
              icon={APP_ICON}
              version="1.0.0"
            />

            <OfflineBanner position="top" />
            <PwaInstallPrompt
              appName={APP_NAME}
              tagline="Instalá el box en tu teléfono"
              icon={APP_ICON}
            />
            <UpdatePrompt />

            <SafeArea
              edges={["left", "right"]}
              fillViewport
              className="flex flex-col bg-surface text-foreground"
            >
              <main className="min-w-0 flex-1 md:pb-8">{children}</main>
            </SafeArea>

            {/* `tour-bottom-nav`: ancla del tour (ver <AppTour>); BottomNav no
                expone `id`, sólo `className`. */}
            <BottomNav items={NAV} className="tour-bottom-nav" />

            <NotificationSidebar
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              side="right"
              title="Notificaciones"
              items={items}
              emptyTitle="No hay novedades"
              emptyHint="Acá van a aparecer los WODs nuevos y la actividad de la comunidad."
              onRead={(id) =>
                // Local: el modelo persistido es un watermark, no una marca por ítem.
                setItems((l) => l.map((n) => (n.id === id ? { ...n, read: true } : n)))
              }
              onReadAll={() => {
                setItems((l) => l.map((n) => ({ ...n, read: true })));
                persist(markAllNotificationsRead);
              }}
              onDismiss={(id) => {
                setItems((l) => l.filter((n) => n.id !== id));
                persist(() => dismissNotification(id));
              }}
            />

            <GuestGateModal />
          </NativeShell>
        </NotificationsCtx.Provider>
      </GuestGateProvider>
    </SnackbarProvider>
  );
}
