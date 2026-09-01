"use client";

import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "lib-kit-components";

/**
 * Header simple del panel de admin: sin campanita ni toggle de tema (eso vive
 * en el shell de `(app)`, que este segmento no usa). El botón de volver sube
 * un nivel dentro de `/admin` y, desde la raíz, saca de vuelta a la app.
 */
export function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const atRoot = pathname === "/admin";

  return (
    <AppHeader
      title="Panel de admin"
      subtitle={atRoot ? undefined : "Rutina semanal"}
      onBack={() => (atRoot ? router.push("/") : router.back())}
      backLabel={atRoot ? "Salir" : "Volver"}
      variant="solid"
    />
  );
}
