"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type AccountData = {
  company: {
    id: string
    name: string
    tax_id: string | null
    auth_code: string | null
    range_start: string | null
    range_end: string | null
    expiration_date: string
    invoice_next_number: number
  }
  user: { id: string; email: string; name: string }
  canEditCompany: boolean
}

function str(v: string | null | undefined) {
  return v ?? ""
}

export function ConfiguracionClient() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<AccountData | null>(null)

  const [companySaving, setCompanySaving] = React.useState(false)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [companyMsg, setCompanyMsg] = React.useState<{
    type: "ok" | "err"
    text: string
  } | null>(null)
  const [profileMsg, setProfileMsg] = React.useState<{
    type: "ok" | "err"
    text: string
  } | null>(null)

  const [coName, setCoName] = React.useState("")
  const [coTax, setCoTax] = React.useState("")
  const [coAuth, setCoAuth] = React.useState("")
  const [coRangeStart, setCoRangeStart] = React.useState("")
  const [coRangeEnd, setCoRangeEnd] = React.useState("")
  const [coExp, setCoExp] = React.useState("")
  const [coInvoiceNext, setCoInvoiceNext] = React.useState(1)

  const [userName, setUserName] = React.useState("")
  const [userEmail, setUserEmail] = React.useState("")

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoadError(null)
      try {
        const res = await fetch("/api/settings/account", {
          credentials: "include",
        })
        const json = (await res.json()) as
          | { success: true; data: AccountData }
          | { success: false; error: string }
        if (cancelled) return
        if (!json.success) {
          setLoadError(json.error)
          setLoading(false)
          return
        }
        const d = json.data
        setData(d)
        setCoName(d.company.name)
        setCoTax(str(d.company.tax_id))
        setCoAuth(str(d.company.auth_code))
        setCoRangeStart(str(d.company.range_start))
        setCoRangeEnd(str(d.company.range_end))
        setCoExp(str(d.company.expiration_date))
        setCoInvoiceNext(d.company.invoice_next_number ?? 1)
        setUserName(d.user.name)
        setUserEmail(d.user.email)
      } catch {
        if (!cancelled) setLoadError("No se pudo cargar la configuración")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSaveCompany(e: React.FormEvent) {
    e.preventDefault()
    if (!data?.canEditCompany) return
    setCompanyMsg(null)
    setCompanySaving(true)
    try {
      const res = await fetch("/api/settings/company", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: coName,
          tax_id: coTax,
          auth_code: coAuth,
          range_start: coRangeStart,
          range_end: coRangeEnd,
          expiration_date: coExp,
          invoice_next_number: coInvoiceNext,
        }),
      })
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: string }
      if (!json.success) {
        setCompanyMsg({ type: "err", text: json.error })
        return
      }
      setCompanyMsg({ type: "ok", text: "Datos de empresa guardados." })
      router.refresh()
    } catch {
      setCompanyMsg({ type: "err", text: "Error de red" })
    } finally {
      setCompanySaving(false)
    }
  }

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileSaving(true)
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: userName }),
      })
      const json = (await res.json()) as
        | { success: true }
        | { success: false; error: string }
      if (!json.success) {
        setProfileMsg({ type: "err", text: json.error })
        return
      }
      setProfileMsg({ type: "ok", text: "Nombre actualizado." })
      router.refresh()
    } catch {
      setProfileMsg({ type: "err", text: "Error de red" })
    } finally {
      setProfileSaving(false)
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">Cargando configuración…</p>
    )
  }
  if (loadError || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError ?? "Sin datos"}
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader className="border-b border-border/80">
          <CardTitle>Empresa</CardTitle>
          <CardDescription>
            Datos fiscales y de facturación SAR (RTN, CAI, rango y vigencia).
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSaveCompany}>
          <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
            {!data.canEditCompany ? (
              <p className="sm:col-span-2 text-sm text-muted-foreground">
                Solo los administradores pueden editar la empresa. Podés ver
                los datos; pedí a un admin que haga los cambios.
              </p>
            ) : null}
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-name">Nombre de la empresa</Label>
              <Input
                id="co-name"
                value={coName}
                onChange={(e) => setCoName(e.target.value)}
                disabled={!data.canEditCompany}
                required
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-tax">RTN (Tax ID)</Label>
              <Input
                id="co-tax"
                value={coTax}
                onChange={(e) => setCoTax(e.target.value)}
                disabled={!data.canEditCompany}
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-auth">CAI (código de autorización)</Label>
              <Input
                id="co-auth"
                value={coAuth}
                onChange={(e) => setCoAuth(e.target.value)}
                disabled={!data.canEditCompany}
                placeholder="Opcional"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-range-start">Rango autorizado — desde</Label>
              <Input
                id="co-range-start"
                value={coRangeStart}
                onChange={(e) => setCoRangeStart(e.target.value)}
                disabled={!data.canEditCompany}
                placeholder="Primeros 10 caracteres usados en el número de factura"
              />
              <p className="text-xs text-muted-foreground">
                Los primeros 10 caracteres de este valor forman el prefijo del
                número legal (ej. 000-001-01).
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-invoice-next">
                Siguiente número de factura (correlativo)
              </Label>
              <Input
                id="co-invoice-next"
                type="number"
                min={1}
                max={99999999}
                value={coInvoiceNext}
                onChange={(e) => {
                  const n = Number.parseInt(e.target.value, 10)
                  setCoInvoiceNext(Number.isFinite(n) ? Math.min(99_999_999, Math.max(1, n)) : 1)
                }}
                disabled={!data.canEditCompany}
              />
              <p className="text-xs text-muted-foreground">
                Es el correlativo que se concatenará con 8 dígitos al prefijo del
                rango. Después de cada venta se incrementa automáticamente.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="co-range-end">Rango autorizado — hasta</Label>
              <Input
                id="co-range-end"
                value={coRangeEnd}
                onChange={(e) => setCoRangeEnd(e.target.value)}
                disabled={!data.canEditCompany}
                placeholder="Ej. correlativo final"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="co-exp">Fecha límite de emisión</Label>
              <Input
                id="co-exp"
                type="date"
                value={coExp}
                onChange={(e) => setCoExp(e.target.value)}
                disabled={!data.canEditCompany}
              />
              <p className="text-xs text-muted-foreground">
                Formato AAAA-MM-DD. Dejá vacío si aún no aplica.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border/80 sm:flex-row sm:items-center sm:justify-between">
            {companyMsg ? (
              <p
                className={cn(
                  "text-xs",
                  companyMsg.type === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
                role="status"
              >
                {companyMsg.text}
              </p>
            ) : (
              <span />
            )}
            <Button
              type="submit"
              disabled={!data.canEditCompany || companySaving}
            >
              {companySaving ? "Guardando…" : "Guardar empresa"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader className="border-b border-border/80">
          <CardTitle>Tu perfil</CardTitle>
          <CardDescription>
            Podés cambiar tu nombre. El correo no se modifica desde aquí.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSaveProfile}>
          <CardContent className="grid gap-4 pt-4 sm:max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="u-name">Nombre</Label>
              <Input
                id="u-name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="u-email">Correo</Label>
              <Input
                id="u-email"
                type="email"
                value={userEmail}
                readOnly
                disabled
                className="opacity-80"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border/80 sm:flex-row sm:items-center sm:justify-between">
            {profileMsg ? (
              <p
                className={cn(
                  "text-xs",
                  profileMsg.type === "ok"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive",
                )}
                role="status"
              >
                {profileMsg.text}
              </p>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={profileSaving}>
              {profileSaving ? "Guardando…" : "Guardar nombre"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
