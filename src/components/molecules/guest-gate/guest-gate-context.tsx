"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Guest gate: la app es guest-first — todo lo de LECTURA funciona sin login.
 * Recién cuando el invitado intenta una acción que deja rastro (marcar
 * asistencia, puntuar, comentar, guardar un resultado del timer) se interpone
 * este modal con el CTA a /registro.
 *
 * Uso desde cualquier componente cliente por debajo del provider:
 *
 *   const { requireAuth } = useGuestGate();
 *   <Button onClick={() => requireAuth(() => marcarAsistencia())}>Marcar</Button>
 *
 * Si hay sesión ejecuta la acción; si no, abre el modal y no la ejecuta.
 */

type GuestGateValue = {
  /** `true` cuando no hay sesión: la lectura sigue abierta, la escritura no. */
  isGuest: boolean;
  /** Ejecuta `action` si hay sesión; si no, abre el modal con `reason`. */
  requireAuth: (action: () => void, reason?: string) => void;
  /** Abre el modal a mano (para un CTA que ya es explícitamente de registro). */
  open: (reason?: string) => void;
};

const GuestGateCtx = createContext<GuestGateValue | null>(null);

export function useGuestGate(): GuestGateValue {
  const ctx = useContext(GuestGateCtx);
  if (!ctx) throw new Error("useGuestGate fuera de <GuestGateProvider>");
  return ctx;
}

/** Estado del modal, para que `GuestGateModal` lo consuma sin exponerlo al resto. */
type ModalState = { open: boolean; reason?: string };

const ModalCtx = createContext<{
  state: ModalState;
  close: () => void;
} | null>(null);

export function useGuestGateModal() {
  const ctx = useContext(ModalCtx);
  if (!ctx) throw new Error("useGuestGateModal fuera de <GuestGateProvider>");
  return ctx;
}

export function GuestGateProvider({
  isGuest,
  children,
}: {
  isGuest: boolean;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<ModalState>({ open: false });

  const open = useCallback((reason?: string) => setState({ open: true, reason }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  const requireAuth = useCallback(
    (action: () => void, reason?: string) => {
      if (isGuest) open(reason);
      else action();
    },
    [isGuest, open],
  );

  const value = useMemo(
    () => ({ isGuest, requireAuth, open }),
    [isGuest, requireAuth, open],
  );
  const modalValue = useMemo(() => ({ state, close }), [state, close]);

  return (
    <GuestGateCtx.Provider value={value}>
      <ModalCtx.Provider value={modalValue}>{children}</ModalCtx.Provider>
    </GuestGateCtx.Provider>
  );
}
