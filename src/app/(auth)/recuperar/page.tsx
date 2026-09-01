import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RecoverForm } from "@/components/organisms/auth/recover-form";

export const metadata = { title: "Recuperar contraseña" };

export default async function RecuperarPage() {
  if (await getSession()) redirect("/");
  return <RecoverForm />;
}
