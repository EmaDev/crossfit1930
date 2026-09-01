import Link from "next/link";
import { BackButton } from "@/components/atoms/back-button";
import { Logo } from "@/components/atoms/logo";

/**
 * Shell mínimo para las pantallas de autenticación: sin `BottomNav` ni
 * `AppShell`, sólo una columna angosta y centrada. Hereda `ThemeProvider` y
 * `ToastProvider` del layout raíz.
 *
 * Al estar fuera de los tabs no hay `AppHeader` que traiga la flecha, así que
 * el retroceso lo pone <BackButton> flotando sobre la columna.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-surface text-foreground">
      <BackButton />
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-10">
        <Link href="/" className="mb-8 self-center text-center">
          {/* Ya no lleva placa blanca: el trazo vectorial pinta la barra con
              `currentColor`, así que se da vuelta solo con el tema. */}
          <Logo className="mx-auto h-20 w-auto text-foreground" />
          <span className="mt-3 block text-xs text-muted">
            Tu box, siempre a mano
          </span>
        </Link>
        {children}
      </main>
    </div>
  );
}
