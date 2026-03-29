"use client";

import { IconBuildingStore } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const ROTATING_TERMS = [
  "facturación",
  "punto de venta",
  "inventarios",
  "compras",
  "gestión",
  "reportes",
  "control de gastos",
  "control de deudas",
  "clientes",
  "proveedores",
  "cotizaciones",
  "pedidos",
] as const;

function RotatingHighlight() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ROTATING_TERMS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="inline-flex min-h-[1.15em] min-w-[min(100%,12ch)] items-center justify-center rounded-md bg-landing-teal/15 px-2 py-2 text-[clamp(0.6rem,1.8vw,0.85rem)] font-semibold uppercase tracking-wide text-landing-teal">
      <span
        key={ROTATING_TERMS[index]}
        className="animate-in fade-in duration-500 normal-case"
      >
        {ROTATING_TERMS[index]}
      </span>
    </span>
  );
}

/**
 * Landing estilo referencia (hero 2 col + bloque info + galería), contenido Wakecito.
 * Una pantalla (dvh), sin scroll.
 */
export function WakecitoHero() {
  return (
    <main className="relative box-border flex h-dvh max-h-dvh flex-col overflow-hidden bg-white font-sans text-[#3d5c5d]">
      {/* Logo */}
      <header className="relative z-20 flex shrink-0 justify-end px-3 pt-2 sm:px-6 sm:pt-4 md:px-10">
        <span className="font-heading text-[clamp(0.65rem,2vw,0.95rem)] font-semibold text-landing-teal flex gap-2 items-center">
          <img src="/wake-isotipo.svg" alt="Wakecito Logo" className="size-4" />
          Wake Solutions
        </span>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-1.5 px-3 pb-2 sm:gap-2 sm:px-6 sm:pb-3 md:mx-auto md:max-w-6xl md:gap-3 md:px-10 [@media(max-height:700px)]:gap-1 [@media(max-height:700px)]:pb-1.5">
        {/* —— Hero: texto | círculo imagen —— */}
        <div className="grid min-h-0 flex-[1.15] grid-cols-1 items-center gap-3 md:grid-cols-[1.05fr_0.95fr] md:gap-6 lg:gap-10 [@media(max-height:640px)]:flex-1">
          <div className="flex min-w-0 flex-col justify-center gap-1.5 text-left sm:gap-2 md:gap-2.5 [@media(max-height:640px)]:gap-1">
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-landing-teal sm:text-[0.65rem]">
              Ya disponible
            </p>

            <h1 className="font-heading leading-[0.92]">
              <span className="block text-[clamp(2.1rem,min(11vw,4.5rem),4.5rem)] font-black tracking-tight text-landing-teal drop-shadow-[0_3px_0_rgba(95,141,142,0.25)]">
                Wakecito
              </span>
              <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-[clamp(0.75rem,min(2.4vw,1.1rem),1.1rem)] font-bold text-[#3d5c5d] sm:mt-2">
                <span>Tu solución en</span>
                <RotatingHighlight />
                <span>para todos los negocios</span>
              </span>
            </h1>

            <p className="max-w-96 text-[clamp(0.58rem,1.35vw,0.8rem)] leading-snug text-[#3d5c5d]/90 [@media(max-height:640px)]:line-clamp-2">
              Estamos alineados al Servicio de Administracion de Rentas (SAR) de Honduras, lo que te permite emitir facturas de forma legal.
            </p>

            <div className="pt-0.5 sm:pt-1">
              <Button
                asChild
                size="lg"
                className="h-9 rounded-md border-0 bg-landing-coral px-5 text-[clamp(0.65rem,1.5vw,0.85rem)] font-semibold text-white shadow-md hover:bg-landing-coral/90 sm:h-10 sm:px-7"
              >
                <Link href="/login">Comenzar ahora</Link>
              </Button>
            </div>
          </div>

          {/* Círculo con “producto” (placeholder ilustrado) */}
          <div className="relative mx-auto flex w-full max-w-[min(72vw,260px)] shrink-0 items-center justify-center md:max-w-none md:justify-end [@media(max-height:640px)]:max-w-[min(65vw,220px)]">
            <div
              className="relative aspect-square w-full max-w-[260px] overflow-hidden rounded-full border-4 border-white shadow-[0_12px_40px_-8px_rgba(95,141,142,0.35)] md:max-w-[min(38vw,300px)]"
              style={{
                background:
                  "linear-gradient(145deg, var(--landing-sky) 0%, white 45%, var(--landing-teal) 180%)",
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <img
                  src="/wake-isotipo.svg"
                  alt="Wakecito Logo"
                  className="size-[70%] drop-shadow-md"
                  style={{ filter: "brightness(0.96)" }}
                />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-landing-teal/25 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
