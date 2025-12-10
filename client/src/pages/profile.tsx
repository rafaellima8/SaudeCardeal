import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, Building2, Shield, Key, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const profileSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Senha atual deve ter no mínimo 6 caracteres"),
  newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação deve ter no mínimo 6 caracteres"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const roleLabels: Record<string, string> = {
  admin: "Administrador do Sistema",
  medico: "Médico",
  enfermeiro: "Enfermeiro",
  acs: "Agente Comunitário de Saúde",
  ace: "Agente de Combate às Endemias",
  farmaceutico: "Farmacêutico",
  recepcionista: "Recepcionista",
  gestor: "Gestor de Saúde",
};

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { data: user, isLoading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });

  const { data: unit } = useQuery<any>({
    queryKey: ["/api/health-units", user?.unitId],
    enabled: !!user?.unitId,
    queryFn: async () => {
      const response = await fetch(`/api/health-units/${user.unitId}`);
      if (!response.ok) return null;
      return response.json();
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar perfil");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Perfil atualizado", description: "Suas informações foram atualizadas com sucesso" });
      setIsEditingProfile(false);
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível atualizar o perfil", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao alterar senha");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Senha alterada", description: "Sua senha foi alterada com sucesso" });
      setIsChangingPassword(false);
      passwordForm.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const initials = user?.name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() || 'U';

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações pessoais e preferências</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src="" alt={user?.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{user?.name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{roleLabels[user?.role] || user?.role}</Badge>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{user?.phone}</span>
                </div>
              )}
              {unit && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{unit.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>Atualize suas informações de contato</CardDescription>
            </div>
            {!isEditingProfile && (
              <Button variant="outline" onClick={() => {
                profileForm.reset({
                  name: user?.name || "",
                  email: user?.email || "",
                  phone: user?.phone || "",
                });
                setIsEditingProfile(true);
              }} data-testid="button-edit-profile">
                Editar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-profile-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-profile-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(75) 90000-0000" data-testid="input-profile-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={updateProfileMutation.isPending} data-testid="button-save-profile">
                      <Save className="h-4 w-4 mr-2" />
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            ) : (
              <div className="grid gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Nome Completo</Label>
                  <p className="font-medium">{user?.name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="font-medium">{user?.email}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">Telefone</Label>
                  <p className="font-medium">{user?.phone || "Não informado"}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Segurança
              </CardTitle>
              <CardDescription>Altere sua senha de acesso</CardDescription>
            </div>
            {!isChangingPassword && (
              <Button variant="outline" onClick={() => setIsChangingPassword(true)} data-testid="button-change-password">
                Alterar Senha
              </Button>
            )}
          </CardHeader>
          {isChangingPassword && (
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Senha Atual</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-current-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nova Senha</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-new-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar Nova Senha</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" data-testid="input-confirm-password" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={changePasswordMutation.isPending} data-testid="button-save-password">
                      {changePasswordMutation.isPending ? "Alterando..." : "Alterar Senha"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsChangingPassword(false);
                      passwordForm.reset();
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permissões
            </CardTitle>
            <CardDescription>Suas permissões no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{roleLabels[user?.role] || user?.role}</Badge>
              {user?.role === 'admin' && (
                <>
                  <Badge variant="secondary">Acesso Total</Badge>
                  <Badge variant="secondary">Gestão de Usuários</Badge>
                  <Badge variant="secondary">Configurações</Badge>
                </>
              )}
              {user?.role === 'medico' && (
                <>
                  <Badge variant="secondary">Atendimentos</Badge>
                  <Badge variant="secondary">Prescrições</Badge>
                  <Badge variant="secondary">Encaminhamentos</Badge>
                </>
              )}
              {user?.role === 'enfermeiro' && (
                <>
                  <Badge variant="secondary">Triagem</Badge>
                  <Badge variant="secondary">Atendimentos</Badge>
                  <Badge variant="secondary">Vacinas</Badge>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
