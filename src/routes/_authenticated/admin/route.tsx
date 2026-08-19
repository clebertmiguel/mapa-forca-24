import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const session = (context as any).session;
    if (!session || session.group !== "Administrador") {
      throw redirect({ to: "/" });
    }
  },
});
