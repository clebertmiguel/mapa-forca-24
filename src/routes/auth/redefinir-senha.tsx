import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { confirmPasswordReset } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth/redefinir-senha")({
  validateSearch: (s) => z.object({ token: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Redefinir senha · Mapa Força" },
      { name: "description", content: "Defina uma nova senha para acessar o Mapa Força." },
      { property: "og:title", content: "Redefinir senha · Mapa Força" },
      { property: "og:description", content: "Defina uma nova senha para acessar o Mapa Força." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const fn = useServerFn(confirmPasswordReset);
  const [senha, setSenha] = useState("");
  const [conf, setConf] = useState("");
  const m = useMutation({
    mutationFn: () => fn({ data: { token: token ?? "", senha } }),
    onSuccess: () => {
      toast.success("Senha alterada! Faça login com a nova senha.");
      navigate({ to: "/auth/login", replace: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 4) return toast.error("A senha deve ter ao menos 4 caracteres.");
    if (senha !== conf) return toast.error("As senhas não conferem.");
    m.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pm-navy px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-pm-navy">Redefinir senha</h1>
        {!token ? (
          <p className="text-center text-sm text-destructive">Link inválido. Solicite uma nova redefinição na tela de login.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova senha</Label>
              <Input id="senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conf">Confirmar nova senha</Label>
              <Input id="conf" type="password" autoComplete="new-password" value={conf} onChange={(e) => setConf(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-pm-navy hover:bg-pm-navy-strong" disabled={m.isPending}>
              {m.isPending ? "Salvando..." : "Alterar senha"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
