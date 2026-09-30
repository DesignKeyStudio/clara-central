import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformServerUser } from "@/lib/supabase/server-user";
import { PartnerShell } from "@/components/layout/partner-shell";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const serverUser = await getPlatformServerUser();
  // Defense-in-depth — middleware already enforces this.
  if (!serverUser) redirect("/");
  if (serverUser.role !== "partner") redirect("/admin");

  // Render the sidebar at its persisted width on the server to avoid a flash.
  const collapsed = (await cookies()).get("partner_sidebar_collapsed")?.value === "true";

  return (
    <PartnerShell serverUser={serverUser} defaultCollapsed={collapsed}>
      {children}
    </PartnerShell>
  );
}
