"use client";

import Link from "next/link";
import { Button, Modal } from "lib-kit-components";
import { useGuestGateModal } from "./guest-gate-context";

/**
 * El modal del guest gate. Se monta UNA sola vez en el shell; quien lo abre es
 * `requireAuth()` desde cualquier pantalla. `reason` permite decirle al
 * invitado qué acción concreta le estamos pidiendo; si no viene, el copy
 * genérico alcanza.
 */
export function GuestGateModal() {
  const { state, close } = useGuestGateModal();

  return (
    <Modal
      open={state.open}
      onClose={close}
      size="sm"
      title="¡Registrate gratis!"
      description={
        state.reason ??
        "Registrate gratis para marcar tu asistencia y guardar tus progresos."
      }
      footer={
        <div className="flex w-full flex-col gap-2">
          <Link href="/registro" onClick={close} className="w-full">
            <Button fullWidth>Crear mi cuenta</Button>
          </Link>
          <Link href="/login" onClick={close} className="w-full">
            <Button variant="ghost" fullWidth>
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
      }
    >
      <ul className="flex flex-col gap-2 text-sm text-muted">
        <li>· Marcá tu asistencia al WOD del día</li>
        <li>· Sumá días a tu racha y entrá al ranking</li>
        <li>· Guardá tus PRs y los resultados del timer</li>
      </ul>
    </Modal>
  );
}
