"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AppHeaderCardSlot,
  TabsGlow,
  type HeaderAction,
  type TabItem,
} from "lib-kit-components";
import { useNotifications } from "@/app/(app)/notifications-context";
import { BellIcon, MoonIcon, SunIcon, UserIcon } from "@/components/atoms/icons";
import { Logo } from "@/components/atoms/logo";

/**
 * La marca, centrada en el cuerpo del hero, con el título de la pantalla
 * debajo si lo hay. Inicio va sin texto: ahí el hero es sólo el logo.
 *
 * Va en monocromo y hereda el blanco del header: el logo original tiene el
 * texto en rojo y los discos en negro, y sobre el degradado rojo del hero se
 * perdería. Antes eso se resolvía con una placa blanca detrás; con el trazo
 * vectorial ya no hace falta.
 *
 * Ocupa el slot `heroLogo` del kit, que REEMPLAZA a `heroTitle`: por eso el
 * título lo dibuja este nodo y no la prop del componente.
 */
function HeroBrand({ text }: { text?: string }) {
  return (
    // `-mb-5` cancela el `pb-5` interno del bloque hero del kit. Es la única
    // vía: `heroClassName` concatena, y Tailwind emite `.pb-5` después de los
    // valores menores, así que un `pb-0` de ahí nunca gana.
    <span className="-mb-5 flex flex-col items-center gap-2">
      <Logo tone="mono" className="h-20 w-auto" />
      {/* El kit envuelve el `heroLogo` en un <span>, que no puede contener un
          <h1>: el encabezado se declara por ARIA para no romper el markup. */}
      {text && (
        <span
          role="heading"
          aria-level={1}
          className="text-[17px] font-bold leading-tight tracking-tight"
        >
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * El marco de las 4 pantallas raíz del BottomNav: header hero con la marca,
 * una card flotante (la racha) y tabs animados debajo.
 *
 * Es cliente porque los tabs son controlados y el header lleva handlers; el
 * `page.tsx` que lo usa sigue siendo Server Component y le pasa los `panels`
 * ya renderizados.
 */
export function RootScreen({
  heroTitle,
  card,
  tabs,
  panels,
}: {
  /** Texto chico bajo el logo del hero. Inicio no lleva: ahí manda la marca. */
  heroTitle?: string;
  card?: React.ReactNode;
  tabs: TabItem[];
  panels: Record<string, React.ReactNode>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState(tabs[0]?.id ?? "");
  const actions = useHeaderActions();

  return (
    <>
      <AppHeaderCardSlot
        heroLogo={<HeroBrand text={heroTitle} />}
        heroAlign="center"
        // El kit mete el `heroLogo` en un <span> inline-flex, que al ser
        // inline arrastra el hueco del descendente de la línea. Con la altura
        // de línea en 0 el logo apoya contra el borde de arriba.
        heroClassName="leading-[0]"
        // El kit recorta el `heroLogo` a 56px de alto por defecto; acá el slot
        // puede llevar logo + título apilados, así que el alto lo maneja el
        // contenido y la altura real la fija <Logo> con su clase.
        heroLogoMaxHeight="none"
        leading={<UserIcon className="h-[18px] w-[18px]" />}
        onLeadingClick={() => router.push("/perfil")}
        actions={actions}
        card={card}
        cardMinHeight={88}
        // El hueco entre el logo y la card es el `pb-5` interno del bloque hero
        // MÁS este overlap. `heroClassName` no sirve para bajar ese padding
        // (Tailwind emite `.pb-5` después de los valores menores, así que gana
        // siempre), y acortar el overlap no tiene contra: la card queda
        // alineada con el borde inferior del header en cualquier valor.
        cardOverlap={12}
        // El degradado por defecto del kit es violeta: lo pisamos con los tokens del tema.
        gradientClassName="bg-[linear-gradient(135deg,var(--color-hero-from),var(--color-hero-to))]"
      />

      <div className="px-4 pt-2">
        <TabsGlow items={tabs} value={tab} onChange={setTab} size="sm" panels={panels} />
      </div>
    </>
  );
}

/** Campana con badge + alternar tema, como acciones de la barra del header. */
function useHeaderActions(): HeaderAction[] {
  const { unread, open } = useNotifications();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return [
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
  ];
}
