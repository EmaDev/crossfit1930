import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { AdminHeader } from "@/components/organisms/admin/admin-header";

/**
 * Segmento `admin/` (fuera del shell de `(app)`: sin `BottomNav`, sin
 * `TabsGlow`). Guardado por el custom claim `admin` — ver plan §7.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  if (!session) redirect("/");

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-3xl flex-col">
      <AdminHeader />
      <main className="flex-1 px-4 pb-10 pt-3">{children}</main>
    </div>
  );
}
