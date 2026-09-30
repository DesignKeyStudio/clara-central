import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatformServerUser } from "@/lib/supabase/server-user";
import { AdminShell } from "@/components/layout/admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const serverUser = await getPlatformServerUser();
  // Defense-in-depth — middleware already enforces this.
  if (!serverUser) redirect("/");
  if (serverUser.role !== "admin") redirect("/partner");

  // Render the sidebar at its persisted width on the server to avoid a flash.
  const collapsed = (await cookies()).get("admin_sidebar_collapsed")?.value === "true";

  return (
    <AdminShell serverUser={serverUser} defaultCollapsed={collapsed}>
      {children}
    </AdminShell>
  );
}
