"use client";

import { IconCheck, IconMail } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "Facturación pensada para Honduras (SAR).",
  "Inventario y ventas en un solo lugar.",
  "Acceso desde el navegador, sin instalar apps.",
];

export function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as
        | { success: true; data: unknown }
        | { success: false; error: string };

      if (!json.success) {
        setError(json.error);
        return;
      }
      router.push(nextUrl);
      router.refresh();
    } catch {
      setError("No se pudo conectar. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#f8fafd] md:flex-row md:overflow-hidden">
      <aside
        className={cn(
          "relative hidden flex-col justify-between overflow-hidden md:flex",
          "w-full max-w-[340px] shrink-0 rounded-r-[2rem] bg-[#e4f1ff] lg:max-w-[380px]",
          "px-8 py-10 lg:px-10 lg:py-12",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 top-16 size-32 rounded-full border-2 border-amber-200/60"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-24 -right-4 size-20 rounded-full border border-amber-300/40"
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-wakecito-mint shadow-sm ring-1 ring-black/5">
              <Image
                src="/wake-isotipo.svg"
                alt=""
                width={36}
                height={36}
                className="size-9 object-contain"
              />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-xl font-bold tracking-tight text-wakecito-charcoal">
                Wakecito
              </span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[0.65rem] font-medium text-neutral-500 ring-1 ring-amber-200/80">
                Beta
              </span>
            </div>
          </div>

          <h2 className="font-heading mt-10 text-sm font-semibold text-wakecito-charcoal/80">
            Al usar Wakecito podés:
          </h2>
          <ul className="mt-4 space-y-3">
            {BENEFITS.map((line) => (
              <li
                key={line}
                className="flex gap-3 text-sm leading-snug text-wakecito-charcoal/90"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-wakecito-mint text-wakecito-charcoal">
                  <IconCheck className="size-3.5" stroke={2.5} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-wakecito-charcoal/50">
          Hecho para pymes en Honduras.
        </p>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-center gap-2.5 py-5 md:hidden">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-wakecito-mint shadow-sm ring-1 ring-black/5">
            <Image
              src="/wake-isotipo.svg"
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
          </div>
          <span className="font-heading text-lg font-bold text-wakecito-charcoal">
            Wakecito
          </span>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[0.65rem] font-medium text-neutral-500">
            Beta
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 md:px-8 md:py-10">
          <div className="w-full max-w-md rounded-3xl border border-black/6 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-wakecito-mint text-wakecito-charcoal">
                <IconMail className="size-5" stroke={1.5} />
              </div>

              <h1 className="font-heading mt-3 text-center text-2xl font-bold tracking-tight text-wakecito-charcoal sm:text-[1.65rem]">
                Iniciá sesión
              </h1>
              <p className="mt-1 max-w-72 text-center text-xs text-neutral-500 sm:text-sm">
                Ingresá tu correo y contraseña.
              </p>
            </div>

            {error ? (
              <p
                className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-wakecito-charcoal">
                  Correo electrónico
                </Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="vos@tuempresa.com"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:bg-white md:h-12 md:text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-wakecito-charcoal">
                  Contraseña
                </Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus-visible:bg-white md:h-12 md:text-base"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-wakecito-charcoal text-sm font-semibold text-white shadow-md hover:bg-wakecito-charcoal/90 md:h-12 md:text-base"
              >
                {loading ? "Entrando…" : "Continuar"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-500">
              ¿No tenés cuenta?{" "}
              <Link
                href="/registro"
                className="font-semibold text-wakecito-serious underline-offset-2 hover:underline"
              >
                Creá una cuenta
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
