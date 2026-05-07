import { redirect } from "next/navigation";
import AdminTelemetryClient from "./AdminTelemetryClient";
import { requireAdmin } from "@/lib/auth/roles";

export default async function AdminPage() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      redirect("/login?redirectTo=/dashboard/admin");
    }

    redirect("/dashboard");
  }

  return <AdminTelemetryClient />;
}
