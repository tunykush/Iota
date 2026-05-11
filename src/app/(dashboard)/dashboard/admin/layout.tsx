import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/roles";
import { AdminLayoutClient } from "./AdminLayoutClient";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login?redirectTo=/dashboard/admin");
    }
    redirect("/dashboard");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
