import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ["session"],
      queryFn: () => getSession(),
    });

    if (!session) {
      throw redirect({
        to: "/auth/login",
      });
    }

    return { session };
  },
  component: () => <Outlet />,
});
