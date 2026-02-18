import { redirect } from "next/navigation";
import { AUTH_DISABLED } from "@/lib/flags";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  if (AUTH_DISABLED) {
    redirect("/plannings");
  }

  const user = await getSessionUser();
  if (user) {
    redirect("/plannings");
  }

  const { error, next } = await searchParams;

  return (
    <main className="container-page flex min-h-screen items-center justify-center py-16">
      <section className="card w-full max-w-md p-8 shadow-glow">
        <h1 className="mb-1 text-2xl font-semibold text-maif-text">Connexion</h1>
        <p className="mb-5 text-sm text-maif-muted">Identifiant + mot de passe</p>

        {error && (
          <p className="mb-4 rounded-lg border border-maif-primary/30 bg-red-50 px-3 py-2 text-sm text-maif-primary">
            Erreur: identifiant ou mot de passe invalide
          </p>
        )}

        <form action="/api/auth/callback" method="post" className="space-y-4">
          <input type="hidden" name="next" value={next ?? "/plannings"} />
          <div>
            <label className="label" htmlFor="identifier">
              Identifiant
            </label>
            <input className="input" id="identifier" name="identifier" type="text" required />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Mot de passe
            </label>
            <input className="input" id="password" name="password" type="password" required />
          </div>
          <button className="btn-primary w-full" type="submit">
            Se connecter
          </button>
        </form>
      </section>
    </main>
  );
}
