import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppNav } from "@/components/AppNav";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchAllUsers, UserRow } from "@/lib/auth.server";
import { createServerFn, useServerFn } from "@tanstack/react-start";
import { updateUserAction, deleteUserAction, resetPasswordAction } from "@/lib/auth.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, Trash2, KeyRound, Copy } from "lucide-react";
import { useForm } from "react-hook-form";

const getUsers = createServerFn({ method: "GET" }).handler(async () => {
  return await fetchAllUsers();
});

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Gerenciar Usuários · Mapa Força" },
    ],
  }),
  component: AdminUsersPage,
});

function EditUserForm({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const updateFn = useServerFn(updateUserAction);
  
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      id: user.id,
      nome: user.nome,
      nomeGuerra: user.nomeGuerra || "",
      re: user.re,
      email: user.email,
      telefone: user.telefone,
      cia: user.cia || "",
      grupo: user.grupo as "Administrador" | "Oficiais" | "Supervisor" | "Usuario",
      ativo: user.ativo as "SIM" | "NAO",
    }
  });

  const mutation = useMutation({
    mutationFn: (data: any) => updateFn({ data }),
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome Completo</Label>
          <Input {...register("nome", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Nome de Guerra</Label>
          <Input {...register("nomeGuerra", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>RE</Label>
          <Input {...register("re", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" {...register("email", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>Telefone</Label>
          <Input {...register("telefone", { required: true })} />
        </div>
        <div className="space-y-2">
          <Label>CIA</Label>
          <Select value={watch("cia")} onValueChange={(val) => setValue("cia", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1ª CIA PM">1ª CIA PM</SelectItem>
              <SelectItem value="2ª CIA PM">2ª CIA PM</SelectItem>
              <SelectItem value="3ª CIA PM">3ª CIA PM</SelectItem>
              <SelectItem value="4ª CIA PM">4ª CIA PM</SelectItem>
              <SelectItem value="CIA-FT">CIA-FT</SelectItem>
              <SelectItem value="EM">EM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Grupo</Label>
          <Select value={watch("grupo")} onValueChange={(val: any) => setValue("grupo", val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Administrador">Administrador</SelectItem>
              <SelectItem value="Oficiais">Oficiais</SelectItem>
              <SelectItem value="Supervisor">Supervisor</SelectItem>
              <SelectItem value="Usuario">Usuario</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Ativo</Label>
          <Select value={watch("ativo")} onValueChange={(val: any) => setValue("ativo", val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SIM">SIM</SelectItem>
              <SelectItem value="NAO">NAO</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteUserAction);
  const resetFn = useServerFn(resetPasswordAction);

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => getUsers(),
  });

  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [resetUser, setResetUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuário excluído.");
      setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetFn({ data: { id } }),
    onSuccess: (res) => {
      toast.success("Senha resetada.");
      setResetUser(null);
      setNewPassword(res.newPassword);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-pm-navy">Gerenciar Usuários</h1>
        
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>RE</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : (
                users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.re}</TableCell>
                    <TableCell>{u.grupo}</TableCell>
                    <TableCell>{u.ativo}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditUser(u)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setResetUser(u)}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Resetar Senha
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteUser(u)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </main>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && <EditUserForm user={editUser} onClose={() => setEditUser(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá o usuário <strong>{deleteUser?.nome}</strong> permanentemente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteUser) deleteMutation.mutate(deleteUser.id);
              }}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!resetUser} onOpenChange={(o) => !o && setResetUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá gerar uma nova senha aleatória para <strong>{resetUser?.nome}</strong>. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={resetMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (resetUser) resetMutation.mutate(resetUser.id);
              }}
            >
              {resetMutation.isPending ? "Resetando..." : "Resetar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!newPassword} onOpenChange={(o) => !o && setNewPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Senha Resetada</DialogTitle>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              A nova senha temporária foi gerada. Copie e envie para o usuário:
            </p>
            <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-md border">
              <span className="font-mono text-lg tracking-wider font-bold">{newPassword}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (newPassword) navigator.clipboard.writeText(newPassword);
                  toast.success("Senha copiada para a área de transferência!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setNewPassword(null)}>Concluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
