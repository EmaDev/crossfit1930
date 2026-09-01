/**
 * Marco visual compartido por las tres pantallas de auth: título, subtítulo,
 * cuerpo y una fila de links al pie. Sin estado — lo componen los forms cliente.
 */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
      {footer && (
        <div className="mt-5 text-center text-sm text-muted">{footer}</div>
      )}
    </div>
  );
}

/** Separador "o" entre el form de email y el botón de Google. */
export function AuthDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs text-muted">
      <span className="h-px flex-1 bg-border" />
      o
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

/** Banner de error del formulario. */
export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
