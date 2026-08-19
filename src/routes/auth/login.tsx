import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { login } from "@/lib/auth.functions";
import pmLogo from "@/assets/pm-logo.png.asset.json";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Obrigatório"),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Login · Mapa Força" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loginFn = useServerFn(login);

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      console.log("Mutation start with data:", data);
      return loginFn({ data });
    },
    onSuccess: (session) => {
      console.log("Login success:", session);
      toast.success("Bem-vindo!");
      queryClient.setQueryData(["session"], session);
      navigate({ to: "/", replace: true });
    },
    onError: (e: Error) => {
      console.error("Login mutation error:", e);
      toast.error(e.message || "Erro ao realizar login");
    },
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: ""
    }
  });

  const onSubmit = (data: FormValues) => {
    console.log("onSubmit manual trigger calling mutation.mutate");
    mutation.mutate(data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-pm-navy px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <img src={pmLogo.url} alt="PM Logo" className="mx-auto h-20 w-20 mb-4" />
          <h1 className="text-2xl font-bold text-pm-navy">Mapa Força Diário</h1>
          <p className="text-sm text-muted-foreground mt-1">Entre com suas credenciais</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input 
              id="email" 
              type="text" 
              {...register("email")} 
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input 
              id="password" 
              type="password" 
              {...register("password")} 
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button 
            type="button"
            className="w-full bg-pm-navy hover:bg-pm-navy-strong" 
            disabled={mutation.isPending}
            onClick={(e) => {
              console.log("Button clicked!");
              e.preventDefault();
              e.stopPropagation();
              handleSubmit(onSubmit)(e);
            }}
          >
            {mutation.isPending ? "Entrando..." : "Entrar"}
          </Button>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <Button variant="link" onClick={() => navigate({ to: "/auth/register" })} className="text-pm-navy p-0">
            Cadastre-se
          </Button>
        </div>
      </Card>
    </div>
  );
}
