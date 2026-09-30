"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { startDemoAction, type DemoRole } from "@/app/actions/demo";

/**
 * Fires `startDemoAction` once on mount and shows a spinner while the demo org is
 * spun up (or reused) and the session is planted. On success the action redirects
 * into the panel (this component unmounts); on failure it renders the message.
 */
export function DemoLauncher({ role }: { role: DemoRole }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // guard React 18 StrictMode double-invoke
    started.current = true;
    startDemoAction(role).then((r) => {
      if (r?.error) setError(r.error);
    });
  }, [role]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      {error ? (
        <>
          <h1 className="text-lg font-semibold text-foreground">Couldn&apos;t start the demo</h1>
          <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
          <a href="/demo" className="text-sm font-medium text-primary underline underline-offset-4">
            Try again
          </a>
        </>
      ) : (
        <>
          <Loader2 className="size-8 animate-spin text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Spinning up your {role} demo…
          </p>
        </>
      )}
    </main>
  );
}
