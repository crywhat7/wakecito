"use client";

import { IconCheck, IconBuildingStore } from "@tabler/icons-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const BENEFITS = [
  "Tu empresa nueva con plan gratuito.",
  "Un solo usuario administrador para empezar.",
  "Datos aislados por empresa (multi-tenant).",
];

export function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!terms) {
      setError("Tenés que aceptar los términos y la privacidad.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name,
          companyName,
          email,
          password,
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: unknown }
        | { success: false; error: string };

      if (!json.success) {
        setError(json.error);
        return;
      }
      router.push("/dashboard");
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
          className="pointer-events-none absolute -right-8 top-20 size-28 rounded-full border-2 border-amber-200/50"
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
            Al registrarte obtenés:
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
          Un negocio, un espacio de trabajo.
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
        </div>

        <div className="flex flex-1 items-center justify-center px-4 pb-8 pt-2 md:px-8 md:py-10">
          <div className="w-full max-w-md rounded-3xl border border-black/6 bg-white p-6 shadow-xl sm:p-8">
            <div className="flex flex-col items-center gap-1">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-wakecito-mint text-wakecito-charcoal">
                <IconBuildingStore className="size-5" stroke={1.5} />
              </div>
              <h1 className="font-heading mt-3 text-center text-2xl font-bold tracking-tight text-wakecito-charcoal sm:text-[1.65rem]">
                Creá tu cuenta
              </h1>
              <p className="mt-1 max-w-72 text-center text-xs text-neutral-500 sm:text-sm">
                Tu usuario, tu negocio y plan gratuito en un solo paso.
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

            <form className="mt-6 space-y-3.5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label
                  htmlFor="reg-name"
                  className="text-wakecito-charcoal dark:text-wakecito-charcoal"
                >
                  Tu nombre
                </Label>
                <Input
                  id="reg-name"
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(ev) => setName(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reg-company"
                  className="text-wakecito-charcoal dark:text-wakecito-charcoal"
                >
                  Nombre del negocio
                </Label>
                <Input
                  id="reg-company"
                  name="companyName"
                  autoComplete="organization"
                  required
                  minLength={2}
                  value={companyName}
                  onChange={(ev) => setCompanyName(ev.target.value)}
                  placeholder="Mi tienda / Mi empresa"
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reg-email"
                  className="text-wakecito-charcoal dark:text-wakecito-charcoal"
                >
                  Correo electrónico
                </Label>
                <Input
                  id="reg-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reg-password"
                  className="text-wakecito-charcoal dark:text-wakecito-charcoal"
                >
                  Contraseña
                </Label>
                <Input
                  id="reg-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(ev) => setPassword(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 md:h-11"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="reg-confirm"
                  className="text-wakecito-charcoal dark:text-wakecito-charcoal"
                >
                  Confirmar contraseña
                </Label>
                <Input
                  id="reg-confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirm}
                  onChange={(ev) => setConfirm(ev.target.value)}
                  className="h-11 rounded-xl border-neutral-200 bg-neutral-50/80 px-3.5 text-sm text-wakecito-charcoal dark:text-wakecito-charcoal placeholder:text-neutral-400 dark:placeholder:text-neutral-500 md:h-11"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-1">
                <Checkbox
                  id="reg-terms"
                  checked={terms}
                  onCheckedChange={(v) => setTerms(v === true)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="reg-terms"
                  className="cursor-pointer text-[0.65rem] leading-relaxed text-wakecito-charcoal dark:text-wakecito-charcoal sm:text-xs"
                >
                  Acepto los{" "}
                  <Link
                    href="/terminos"
                    className="font-medium text-wakecito-serious underline-offset-2 hover:underline"
                  >
                    términos
                  </Link>{" "}
                  y la{" "}
                  <Link
                    href="/privacidad"
                    className="font-medium text-wakecito-serious underline-offset-2 hover:underline"
                  >
                    privacidad
                  </Link>
                  .
                </label>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-xl bg-wakecito-charcoal text-sm font-semibold text-white shadow-md hover:bg-wakecito-charcoal/90 md:h-12"
              >
                {loading ? "Creando cuenta…" : "Registrarme"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-neutral-500">
              ¿Ya tenés cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-wakecito-serious underline-offset-2 hover:underline"
              >
                Iniciá sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
