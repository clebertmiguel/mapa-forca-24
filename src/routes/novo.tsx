import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { getSession } from "@/lib/auth.functions";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { RecordForm } from "@/components/RecordForm";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { getLookups } from "@/lib/sheets.functions";

const lookupsQuery = {
  queryKey: ["lookups"],
  queryFn: () => getLookups(),
  staleTime: 0,
  refetchOnMount: "always" as const,
};

export const Route = createFileRoute("/novo")({
  head: () => ({
    meta: [
      { title: "Novo Registro · Mapa Força" },
      { name: "description", content: "Cadastrar novo registro no Mapa Força." },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.ensureQueryData({
      queryKey: ["session"],
      queryFn: () => getSession(),
    });
    if (!session) throw redirect({ to: "/auth/login" });
    return { session };
  },
  loader: ({ context }) => context.queryClient.ensureQueryData(lookupsQuery),
  component: NovoPage,
});

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function NovoPage() {
  useSuspenseQuery(lookupsQuery);
  const nav = useNavigate();
  const qc = useQueryClient();
  // Garante que a lista de cidades/CIAs reflita a planilha atualizada
  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["lookups"] });
  }, [qc]);
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold text-pm-navy">Novo Registro</h1>
        <Card className="p-5">
          <RecordForm
            defaultDate={todayISO()}
            onSuccess={(vtr) => {
              toast.success(`Mapa Força da VTR ${vtr} inserido com sucesso!`);
              qc.invalidateQueries({ queryKey: ["records"] });
              nav({ to: "/" });
            }}
          />
        </Card>
      </main>
    </div>
  );
}
