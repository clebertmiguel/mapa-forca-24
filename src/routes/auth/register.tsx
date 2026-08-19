import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { registerUser } from "@/lib/auth.functions";
import InputMask from "react-input-mask-next";
import pmLogo from "@/assets/pm-logo.png.asset.json";

const schema = z.object({
  nome: z.string().min(2, "Nome muito curto"),
  re: z.string().min(1, "Obrigatório"),
  email: z.string().email("E-mail inválido"),
  telefone: z.string().min(8, "Telefone inválido"),
  senha: z.string().min(4, "Mínimo 4 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/auth/register")({
  head: () => ({
    meta: [
      { title: "Cadastro · Mapa Força" },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const registerFn = useServerFn(registerUser);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => registerFn({ data }),
    onSuccess: () => {
      toast.success("Conta criada! Aguarde a ativação (se necessário) e faça login.");
      navigate({ to: "/auth/login" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-pm-navy px-4 py-8">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <img src={pmLogo.url} alt="PM Logo" className="mx-auto h-16 w-16 mb-2" />
          <h1 className="text-2xl font-bold text-pm-navy">Novo Usuário</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie sua conta no sistema</p>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input id="nome" {...register("nome")} />
            {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="re">RE</Label>
            <Input id="re" {...register("re")} />
            {errors.re && <p className="text-xs text-destructive">{errors.re.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" {...register("telefone")} />
            {errors.telefone && <p className="text-xs text-destructive">{errors.telefone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input id="senha" type="password" {...register("senha")} />
            {errors.senha && <p className="text-xs text-destructive">{errors.senha.message}</p>}
          </div>

          <Button type="submit" className="w-full bg-pm-navy hover:bg-pm-navy-strong" disabled={mutation.isPending}>
            {mutation.isPending ? "Cadastrando..." : "Cadastrar"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Já tem uma conta? </span>
          <Button variant="link" onClick={() => navigate({ to: "/auth/login" })} className="text-pm-navy p-0">
            Faça login
          </Button>
        </div>
      </Card>
    </div>
  );
}
