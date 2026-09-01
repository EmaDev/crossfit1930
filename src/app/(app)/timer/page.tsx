import type { TabItem } from "lib-kit-components";
import { getSession } from "@/lib/auth/session";
import { AmrapTimer } from "@/components/organisms/timer/amrap-timer";
import { EmomTimer } from "@/components/organisms/timer/emom-timer";
import { TabataTimer } from "@/components/organisms/timer/tabata-timer";
import { ForTimeTimer } from "@/components/organisms/timer/fortime-timer";
import { BenchmarkCard } from "@/components/organisms/timer/benchmark-card";
import { RootScreen } from "@/components/organisms/root-screen";

export const metadata = { title: "Timer" };

const TABS: TabItem[] = [
  { id: "amrap", label: "AMRAP" },
  { id: "emom", label: "EMOM" },
  { id: "tabata", label: "TABATA" },
  { id: "fortime", label: "FOR TIME" },
];

export default async function TimerPage() {
  const session = await getSession();

  return (
    <RootScreen
      heroTitle="Timer"
      // La card no compite con el reloj: ofrece un benchmark clásico para
      // cronometrar (Cindy, Fran, Helen…), que rota al tocarla.
      card={<BenchmarkCard />}
      tabs={TABS}
      panels={{
        amrap: <AmrapTimer />,
        emom: <EmomTimer />,
        tabata: <TabataTimer />,
        fortime: <ForTimeTimer />,
      }}
    />
  );
}
