"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AppHeader, TabsGlow, type TabItem } from "lib-kit-components";
import { useNotifications } from "@/app/(app)/notifications-context";
import { BellIcon, MoonIcon, SunIcon } from "@/components/atoms/icons";

/**
 * El marco de las pantallas de DETALLE (las que tienen botón de volver), a
 * diferencia de las raíz del BottomNav que usan <RootScreen>.
 *
 * Usa `AppHeader` en vez de `AppHeaderTabs` porque los tabs los pone
 * `TabsGlow`, para que la animación sea la misma en toda la app.
 */
export function DetailScreen({
  title,
  subtitle,
  tabs,
  panels,
}: {
  title: string;
  subtitle?: string;
  tabs: TabItem[];
  panels: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const { unread, open } = useNotifications();
  const { resolvedTheme, setTheme } = useTheme();
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <>
      <AppHeader
        title={title}
        subtitle={subtitle}
        onBack={() => router.back()}
        variant="blur"
        actions={[
          {
            id: "notif",
            label: unread > 0 ? `Notificaciones (${unread} sin leer)` : "Notificaciones",
            icon: <BellIcon />,
            // `unread || false`: un 0 dibujaría un badge con "0" adentro.
            badge: unread || false,
            onClick: open,
          },
          {
            id: "theme",
            label: isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro",
            icon: isDark ? <SunIcon /> : <MoonIcon />,
            onClick: () => setTheme(isDark ? "light" : "dark"),
          },
        ]}
      />

      <div className="px-4 pt-3">
        <TabsGlow items={tabs} value={tab} onChange={setTab} size="sm" panels={panels} />
      </div>
    </>
  );
}
