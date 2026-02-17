import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const user = await getSessionUser();
  if (user) {
    redirect("/plannings");
  }

  const { error, next } = await searchParams;

  return (
    <main className="container-page flex min-h-screen items-center justify-center">
      <section className="card w-full max-w-md p-6 shadow-glow">
        <h1 className="mb-1 text-xl font-semibold">Connexion</h1>
        <p className="mb-5 text-sm text-slate-400">Identifiant (prénom/login) + mot de passe.</p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-700 bg-red-900/30 px-3 py-2 text-sm text-red-200">
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
