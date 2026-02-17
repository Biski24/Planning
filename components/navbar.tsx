import Link from "next/link";
import { Role } from "@/lib/types";

export function Navbar({ role }: { role: Role }) {
  return (
    <nav className="border-b border-slate-800 bg-slate-950/70 backdrop-blur">
      <div className="container-page flex items-center justify-between py-3">
        <Link href="/plannings" className="text-sm font-semibold text-white">
          Planning Agence
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link className="btn-secondary" href="/plannings">
            Plannings
          </Link>
          <Link className="btn-secondary" href="/me">
            Mon profil
          </Link>
          {(role === "admin" || role === "manager") && (
            <Link className="btn-secondary" href="/plannings">
              Vue manager
            </Link>
          )}
          {role === "admin" && (
            <Link className="btn-primary" href="/admin">
              Admin
            </Link>
          )}
          <form action="/api/auth/logout" method="post">
            <button className="btn-secondary" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
