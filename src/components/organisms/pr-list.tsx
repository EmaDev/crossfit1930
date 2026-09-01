"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Modal, useToast } from "lib-kit-components";
import { deletePr, savePr } from "@/lib/actions/profile";
import type { PersonalRecord } from "@/lib/data/profile";
import { PlusIcon, TrashIcon } from "@/components/atoms/icons";

const REASON_MESSAGE: Record<string, string> = {
  guest: "Iniciá sesión para guardar tus PRs.",
  "not-configured": "Firebase no está configurado en este entorno.",
  invalid: "Completá el nombre y la marca.",
  error: "Algo falló guardando. Probá de nuevo.",
};

export function PrList({ prs }: { prs: PersonalRecord[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<PersonalRecord | "new" | null>(null);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const openNew = () => {
    setName("");
    setValue("");
    setEditing("new");
  };

  const openEdit = (pr: PersonalRecord) => {
    setName(pr.name);
    setValue(pr.value);
    setEditing(pr);
  };

  const save = () => {
    startTransition(async () => {
      const res = await savePr({
        id: editing !== "new" ? editing?.id : undefined,
        name,
        value,
      });
      if (!res.ok) {
        toast({ title: "No se pudo guardar", description: REASON_MESSAGE[res.reason], variant: "error" });
        return;
      }
      setEditing(null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const res = await deletePr(id);
      if (!res.ok) {
        toast({ title: "No se pudo borrar", description: REASON_MESSAGE[res.reason], variant: "error" });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-3">
      {prs.length === 0 && (
        <p className="px-1 text-sm text-muted">Todavía no cargaste ningún PR.</p>
      )}

      {prs.map((pr) => (
        <Card key={pr.id} variant="outline" padding="sm" className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => openEdit(pr)}
            className="min-w-0 flex-1 text-left"
          >
            <p className="truncate text-sm font-semibold text-foreground">{pr.name}</p>
            <p className="text-sm text-muted">{pr.value}</p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Borrar ${pr.name}`}
            onClick={() => remove(pr.id)}
          >
            <TrashIcon />
          </Button>
        </Card>
      ))}

      <Button type="button" variant="outline" leftIcon={<PlusIcon />} onClick={openNew}>
        Agregar PR
      </Button>

      <Modal
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo PR" : "Editar PR"}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button loading={pending} onClick={save}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Back Squat, Fran, Murph…"
          />
          <Input
            label="Marca"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ej. 100 kg, 18:32…"
          />
        </div>
      </Modal>
    </div>
  );
}
