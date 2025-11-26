import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { FileText, Printer, Download, Check, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const certificateSchema = z.object({
  type: z.enum(['sick_leave', 'fitness', 'companion', 'medical_report', 'custom']),
  citizenId: z.string().min(1, "Paciente é obrigatório"),
  consultationId: z.string().optional(),
  daysOff: z.coerce.number().min(0).max(180).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  cid10Code: z.string().optional(),
  purpose: z.string().optional(),
  content: z.string().min(10, "Conteúdo mínimo de 10 caracteres"),
  restrictions: z.string().optional(),
});

type CertificateFormData = z.infer<typeof certificateSchema>;

const certificateTypes = [
  { value: 'sick_leave', label: 'Atestado de Afastamento', template: 'sick_leave' },
  { value: 'fitness', label: 'Atestado de Aptidão', template: 'fitness' },
  { value: 'companion', label: 'Atestado de Acompanhante', template: 'companion' },
  { value: 'medical_report', label: 'Relatório Médico', template: 'report' },
  { value: 'custom', label: 'Atestado Personalizado', template: 'custom' },
];

const templates: Record<string, string> = {
  sick_leave: `Atesto para os devidos fins que o(a) paciente acima identificado(a) esteve sob meus cuidados médicos nesta data, necessitando afastar-se de suas atividades por {days} dias, a partir de {startDate}.

CID-10: {cid10}

Este atestado é válido para fins trabalhistas conforme legislação vigente.`,
  
  fitness: `Atesto para os devidos fins que o(a) paciente acima identificado(a) encontra-se APTO(A) para exercer suas atividades laborais, não apresentando qualquer impedimento de ordem médica na presente data.

Observações: {observations}`,
  
  companion: `Atesto para os devidos fins que o(a) {patientName} necessitou de acompanhante durante atendimento médico realizado nesta data, das {startTime} às {endTime}.

O acompanhante {companionName} permaneceu junto ao paciente durante todo o período de atendimento.`,
  
  report: `RELATÓRIO MÉDICO

Paciente: {patientName}
Data do Atendimento: {date}

HISTÓRICO:
{history}

EXAME FÍSICO:
{exam}

DIAGNÓSTICO:
{diagnosis}

CONDUTA:
{conduct}

EVOLUÇÃO/PROGNÓSTICO:
{prognosis}`,
  
  custom: '',
};

interface MedicalCertificateFormProps {
  citizenId?: string;
  citizenName?: string;
  consultationId?: string;
  professionalId?: string;
  onSuccess?: (certificateId: string) => void;
}

export function MedicalCertificateForm({
  citizenId = '',
  citizenName = '',
  consultationId,
  professionalId,
  onSuccess,
}: MedicalCertificateFormProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>('sick_leave');

  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      type: 'sick_leave',
      citizenId,
      consultationId,
      daysOff: 1,
      startDate: new Date().toISOString().split('T')[0],
      content: templates.sick_leave,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CertificateFormData) => {
      const response = await fetch('/api/medical-certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          professionalId,
          status: 'draft',
        }),
      });
      if (!response.ok) throw new Error('Falha ao criar atestado');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Atestado criado",
        description: "O atestado foi gerado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-certificates'] });
      if (onSuccess) onSuccess(data.id);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar atestado",
        variant: "destructive",
      });
    },
  });

  const signMutation = useMutation({
    mutationFn: async (certificateId: string) => {
      const response = await fetch(`/api/medical-certificates/${certificateId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Falha ao assinar atestado');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Atestado assinado",
        description: "O atestado foi assinado digitalmente.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medical-certificates'] });
    },
  });

  const handleTypeChange = (type: string) => {
    setSelectedType(type);
    form.setValue('type', type as CertificateFormData['type']);
    
    if (templates[type]) {
      let content = templates[type];
      content = content.replace('{patientName}', citizenName);
      content = content.replace('{date}', new Date().toLocaleDateString('pt-BR'));
      form.setValue('content', content);
    }
  };

  const onSubmit = (data: CertificateFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Emitir Atestado Médico
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Atestado</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleTypeChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-certificate-type">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {certificateTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedType === 'sick_leave' && (
                <>
                  <FormField
                    control={form.control}
                    name="daysOff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dias de Afastamento</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={180}
                            {...field}
                            data-testid="input-days-off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Início</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cid10Code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CID-10 (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: J06.9"
                            {...field}
                            data-testid="input-cid10"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo do Atestado</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[200px] font-mono text-sm"
                      placeholder="Digite o conteúdo do atestado..."
                      {...field}
                      data-testid="textarea-certificate-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="restrictions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Restrições/Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Restrições de atividades, observações adicionais..."
                      {...field}
                      data-testid="textarea-restrictions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-3 pt-4">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="gap-2"
                data-testid="button-create-certificate"
              >
                <FileText className="h-4 w-4" />
                {createMutation.isPending ? 'Gerando...' : 'Gerar Atestado'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                data-testid="button-print-certificate"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </Button>

              <Button
                type="button"
                variant="outline"
                className="gap-2"
                data-testid="button-download-certificate"
              >
                <Download className="h-4 w-4" />
                Baixar PDF
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default MedicalCertificateForm;
