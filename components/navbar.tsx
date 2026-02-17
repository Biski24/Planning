"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Role } from "@/lib/types";

function NavItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || (href !== "/plannings" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-[10px] px-3 py-2 text-sm font-medium transition",
        active ? "bg-red-50 text-maif-primary" : "text-maif-muted hover:bg-maif-surfaceAlt hover:text-maif-text"
      )}
    >
      {label}
    </Link>
  );
}

export function Navbar({ role }: { role: Role }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-maif-border bg-white/95 backdrop-blur">
      <div className="container-page flex items-center justify-between py-3">
        <Link href="/plannings" className="text-base font-bold tracking-tight text-maif-primary">
          MAIF Planning
        </Link>

        <div className="flex flex-wrap items-center gap-1">
          <NavItem href="/plannings" label="Plannings" />
          <NavItem href="/me" label="Mon profil" />
          {(role === "admin" || role === "manager") && <NavItem href="/plannings" label="Vue manager" />}
          {role === "admin" && <NavItem href="/admin/planning" label="Admin" />}
          <form action="/api/auth/logout" method="post" className="ml-1">
            <button className="btn-secondary px-3 py-2 text-xs" type="submit">
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
