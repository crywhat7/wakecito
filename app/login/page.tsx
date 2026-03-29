import { Suspense } from "react";

import { LoginScreen } from "@/components/login/login-screen";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#f8fafd] text-sm text-neutral-500">
          Cargando…
        </div>
      }
    >
      <LoginScreen />
    </Suspense>
  );
}
