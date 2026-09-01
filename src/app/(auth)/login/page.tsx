import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/organisms/auth/login-form";

export const metadata = { title: "Ingresar" };

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <LoginForm />;
}
