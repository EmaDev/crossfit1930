import { Skeleton, SkeletonCard, SkeletonList, SkeletonTable } from "lib-kit-components";

/**
 * Skeletons de pantalla, para el `loading.tsx` de cada ruta.
 *
 * Reproducen la forma real: hero con degradado y esquinas inferiores muy
 * redondeadas, card flotante a caballo del borde, y la tira de tabs pastilla
 * debajo. Así el salto al contenido real no mueve el layout.
 */

/** Cabecera hero + card flotante, igual que <AppHeaderCardSlot>. */
function HeroSkeleton({ card = true }: { card?: boolean }) {
  return (
    <div className="relative">
      <div className="rounded-b-[36px] bg-[linear-gradient(135deg,var(--color-hero-from),var(--color-hero-to))] px-4 pb-5 pt-4">
        <div className="flex h-14 items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-white/15" />
          <div className="h-4 flex-1 max-w-[140px] rounded bg-white/15" />
          <div className="h-9 w-9 rounded-xl bg-white/15" />
          <div className="h-9 w-9 rounded-xl bg-white/15" />
        </div>
        <div className="mt-1 h-7 w-2/3 rounded bg-white/20" />
      </div>

      {card && (
        <div className="-mt-10 px-4">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="flex-1" height={44} />
              <Skeleton className="flex-1" height={44} />
              <Skeleton className="flex-1" height={44} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Tira de tabs pastilla, igual que <TabsGlow size="sm">. */
function TabsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="px-4 pt-4">
      <div className="flex gap-1 rounded-xl border border-border bg-surface-alt p-1">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="rounded" className="flex-1" height={32} />
        ))}
      </div>
    </div>
  );
}

/** Inicio: bloques del WOD del día. */
export function HomeSkeleton() {
  return (
    <div className="flex flex-col">
      <HeroSkeleton />
      <TabsSkeleton count={2} />
      <div className="flex flex-col gap-3 px-4 py-5">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}

/** Ranking: podio + tabla del leaderboard. */
export function RankingSkeleton() {
  return (
    <div className="flex flex-col">
      <HeroSkeleton />
      <TabsSkeleton count={3} />
      <div className="flex items-end justify-center gap-3 px-4 py-6">
        <Skeleton variant="rounded" width={88} height={104} />
        <Skeleton variant="rounded" width={88} height={132} />
        <Skeleton variant="rounded" width={88} height={88} />
      </div>
      <div className="px-4 pb-6">
        <SkeletonTable rows={8} columns={5} header />
      </div>
    </div>
  );
}

/** Timer: display grande + controles. Sin card flotante. */
export function TimerSkeleton() {
  return (
    <div className="flex flex-col">
      <HeroSkeleton card={false} />
      <TabsSkeleton count={4} />
      <div className="flex flex-col items-center gap-6 px-4 py-10">
        <Skeleton variant="rounded" width="80%" height={120} />
        <div className="flex gap-3">
          <Skeleton variant="circle" width={56} height={56} />
          <Skeleton variant="circle" width={72} height={72} />
          <Skeleton variant="circle" width={56} height={56} />
        </div>
      </div>
    </div>
  );
}

/** Perfil: fichas de datos. */
export function ProfileSkeleton() {
  return (
    <div className="flex flex-col">
      <HeroSkeleton />
      <TabsSkeleton count={3} />
      <div className="px-4 py-5">
        <SkeletonList rows={5} lines={2} />
      </div>
    </div>
  );
}

/** Historial: header compacto con volver + grilla mensual. */
export function HistorySkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-4">
        <Skeleton variant="circle" width={36} height={36} />
        <div className="flex flex-1 flex-col gap-1.5">
          <Skeleton width="45%" height={16} />
          <Skeleton width="65%" height={12} />
        </div>
        <Skeleton variant="circle" width={36} height={36} />
      </div>
      <TabsSkeleton count={2} />
      <div className="grid grid-cols-7 gap-2 px-4 py-6">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={44} />
        ))}
      </div>
    </div>
  );
}
