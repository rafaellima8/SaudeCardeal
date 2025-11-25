import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Schema de validação para prescrição
const prescriptionSchema = z.object({
  medication: z.string().min(1, "Nome do medicamento é obrigatório"),
  dosage: z.string().min(1, "Posologia é obrigatória"),
  frequency: z.string().min(1, "Frequência é obrigatória"),
  duration: z.string().min(1, "Duração do tratamento é obrigatória"),
  quantity: z.coerce.number().min(1, "Quantidade deve ser maior que 0"),
  instructions: z.string().optional(),
});

export type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

interface PrescriptionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prescription?: PrescriptionFormData | null;
  onSave: (data: PrescriptionFormData) => void;
  isLoading?: boolean;
}

export function PrescriptionForm({
  open,
  onOpenChange,
  prescription,
  onSave,
  isLoading = false,
}: PrescriptionFormProps) {
  const form = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      quantity: 1,
      instructions: "",
    },
  });

  // Atualizar valores do form quando a prescrição ou dialog mudar
  useEffect(() => {
    if (open) {
      form.reset({
        medication: prescription?.medication || "",
        dosage: prescription?.dosage || "",
        frequency: prescription?.frequency || "",
        duration: prescription?.duration || "",
        quantity: prescription?.quantity || 1,
        instructions: prescription?.instructions || "",
      });
    }
  }, [prescription, open, form]);

  const onSubmit = (data: PrescriptionFormData) => {
    onSave(data);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {prescription ? "Editar Prescrição" : "Nova Prescrição"}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da prescrição médica
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="medication"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medicamento</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Losartana Potássica 50mg"
                      {...field}
                      data-testid="input-medication"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dosage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posologia</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 1 comprimido"
                        {...field}
                        data-testid="input-dosage"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 1x ao dia, 8/8h, 2x ao dia"
                        {...field}
                        data-testid="input-frequency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração do Tratamento</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 30 dias, Uso contínuo"
                        {...field}
                        data-testid="input-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Ex: 30"
                        {...field}
                        data-testid="input-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções Adicionais (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Tomar em jejum, Evitar exposição ao sol, etc."
                      className="min-h-[80px]"
                      {...field}
                      data-testid="textarea-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                data-testid="button-cancel-prescription"
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                data-testid="button-save-prescription"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : prescription ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
