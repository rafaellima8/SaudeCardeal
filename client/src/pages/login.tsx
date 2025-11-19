import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/Logo";

const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      return await apiRequest("POST", "/api/auth/login", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao sistema!",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Email ou senha inválidos",
      });
    },
  });

  function onSubmit(data: LoginFormData) {
    loginMutation.mutate(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-4 text-center">
          <Logo size="lg" variant="full" className="justify-center" />
          <div className="space-y-1">
            <p className="text-muted-foreground">
              Secretaria Municipal de Saúde
            </p>
            <p className="text-sm text-muted-foreground">
              Cardeal da Silva - Bahia
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar no sistema</CardTitle>
            <CardDescription>
              Digite seu email e senha para acessar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="seu.email@saude.gov.br"
                          autoComplete="email"
                          data-testid="input-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          data-testid="input-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                  data-testid="button-submit"
                >
                  {loginMutation.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
              <p className="font-semibold mb-2">Credenciais de teste:</p>
              <div className="space-y-2">
                <div>
                  <p className="font-medium">Administrador:</p>
                  <p className="text-muted-foreground">admin@saude.gov.br / Admin@2025</p>
                </div>
                <div>
                  <p className="font-medium">Agente Comunitário:</p>
                  <p className="text-muted-foreground">acs@saude.gov.br / Acs@2025</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Sistema desenvolvido para gestão de saúde pública municipal
        </p>
      </div>
    </div>
  );
}
