import { Outlet } from "react-router-dom";
import { AuthGate } from "@/components/AuthGate";
import { Layout } from "@/components/Layout";

export function ProtectedLayout() {
  return (
    <AuthGate>
      <Layout>
        <Outlet />
      </Layout>
    </AuthGate>
  );
}
