import Link from "next/link";
import { Card, StreakTracker, type TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { getAttendedDates } from "@/lib/data/attendance";
import { getProfile } from "@/lib/data/profile";
import { getUserStats } from "@/lib/data/user-stats";
import { HistorialLink } from "@/components/molecules/historial-link";
import { StreakCard } from "@/components/molecules/streak-card";
import { ProfileForm } from "@/components/organisms/profile-form";
import { PrList } from "@/components/organisms/pr-list";
import { RootScreen } from "@/components/organisms/root-screen";
import { InstallSetting } from "@/components/organisms/install-setting";
import { SessionSetting } from "@/components/organisms/session-setting";
import { ThemeSetting } from "@/components/organisms/theme-setting";
import { DumbbellIcon, UserIcon } from "@/components/atoms/icons";

export const metadata = { title: "Perfil" };

/** Racha, PRs y marcas cambian seguido: nada de esto puede quedar cacheado. */
export const dynamic = "force-dynamic";

const TABS: TabItem[] = [
  { id: "datos", label: "Datos", icon: <UserIcon /> },
  { id: "prs", label: "PRs", icon: <DumbbellIcon /> },
  { id: "ajustes", label: "Ajustes" },
];

export default async function PerfilPage() {
  const session = await getSession();
  const uid = session?.uid ?? null;
  const [stats, profile, attendedDates] = await Promise.all([
    getUserStats(uid),
    getProfile(uid),
    getAttendedDates(uid),
  ]);

  return (
    <RootScreen
      heroTitle={session?.name ?? "Invitado"}
      card={<StreakCard stats={stats} />}
      tabs={TABS}
      panels={{
        datos: (
          <div className="flex flex-col gap-4 pt-1">
            {!session || !profile ? (
              <GuestCard />
            ) : (
              <>
                <ProfileForm
                  initial={{
                    avatar: profile.photo ?? session.picture ?? null,
                    name: profile.name || session.name || "",
                    email: profile.email || session.email || "",
                    phone: profile.phone,
                    bio: profile.bio,
                  }}
                />
                <div>
                  <p className="mb-2 px-1 text-sm font-semibold text-foreground">Constancia</p>
                  <StreakTracker studiedDates={attendedDates} weeks={14} />
                </div>
              </>
            )}
            <HistorialLink label="Ver mi historial" />
          </div>
        ),
        prs: (
          <div className="pt-1">
            {!session || !profile ? <GuestCard /> : <PrList prs={profile.prs} />}
          </div>
        ),
        ajustes: (
          <div className="-mx-1 flex flex-col divide-y divide-border">
            {session && <SessionSetting email={session.email} />}
            <ThemeSetting />
            <InstallSetting />
            <div className="px-4 py-5">
              <p className="text-sm font-semibold text-foreground">Notificaciones</p>
              <p className="mt-1 text-xs text-muted">
                Hoy sólo campanita. El push llega en la fase 8.
              </p>
            </div>
          </div>
        ),
      }}
    />
  );
}

function GuestCard() {
  return (
    <div className="px-1 pt-1">
      <Card variant="outline" padding="md">
        <p className="font-semibold text-foreground">Todavía no tenés cuenta</p>
        <p className="mt-1 text-sm text-muted">
          Registrate gratis para marcar asistencia, sumar racha y guardar tus PRs.
        </p>
        <div className="mt-4 flex gap-2">
          <Link
            href="/registro"
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className="flex-1 rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-foreground transition-colors hover:bg-surface-alt"
          >
            Ingresar
          </Link>
        </div>
      </Card>
    </div>
  );
}
