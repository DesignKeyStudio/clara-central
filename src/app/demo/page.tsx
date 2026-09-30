import type { Metadata } from "next";
import type { DemoRole } from "@/app/actions/demo";
import { DemoLauncher } from "./demo-launcher";

export const metadata: Metadata = {
  title: "Loading demo · Clara Central",
  robots: { index: false, follow: false },
};

/**
 * Public demo entry (`/demo?role=admin|partner`). Server component resolves the
 * role, then hands off to the client launcher which invokes `startDemoAction`
 * (spins up / reuses a demo org, plants a session) and redirects into the panel.
 * Missing/invalid role → admin (the fuller showcase).
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role } = await searchParams;
  const demoRole: DemoRole = role === "partner" ? "partner" : "admin";
  return <DemoLauncher role={demoRole} />;
}
