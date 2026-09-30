import type { Metadata } from "next";
import { AuthShell } from "@/components/layout/auth-shell";
import { ApplyFlow } from "./apply-flow";

export const metadata: Metadata = {
  title: "Apply to join — Clara Central",
};

export default function ApplyPage() {
  return (
    <AuthShell className="max-w-2xl">
      <ApplyFlow />
    </AuthShell>
  );
}
