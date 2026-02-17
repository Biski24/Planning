import Link from "next/link";
import { redirect } from "next/navigation";
import { AUTH_DISABLED } from "@/lib/flags";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  if (AUTH_DISABLED) {
    redirect("/plannings");
  }

  const user = await getSessionUser();
  if (user) {
    redirect("/plannings");
  }

  return (
    <main className="container-page flex min-h-screen items-center justify-center py-16">
      <section className="card w-full max-w-md p-8 shadow-glow">
        <h1 className="mb-1 text-2xl font-semibold text-maif-text">Connexion</h1>
        <p className="mb-5 text-sm text-maif-muted">Connexion temporairement désactivée en mode dev.</p>
        <Link href="/plannings" className="btn-primary w-full">
          Accéder aux plannings
        </Link>
      </section>
    </main>
  );
}
