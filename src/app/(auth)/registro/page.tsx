import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { RegisterForm } from "@/components/organisms/auth/register-form";

export const metadata = { title: "Crear cuenta" };

export default async function RegistroPage() {
  if (await getSession()) redirect("/");
  return <RegisterForm />;
}
