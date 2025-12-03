import { Router, Request, Response } from "express";
import { z } from "zod";
import { formEngine, SINAN_TEMPLATES, BPA_TEMPLATE, APAC_TEMPLATE, SINAN_AGRAVOS, CATEGORIAS_SINAN } from "./form-engine";
import { requireAuth, getEffectiveUnitId } from "../../server/auth";

const router = Router();

const validatePayloadSchema = z.object({
  templateSlug: z.string(),
  payload: z.record(z.any()),
});

router.get("/agravos", requireAuth, async (req: Request, res: Response) => {
  try {
    const { categoria, prazo } = req.query;
    
    let agravos = [...SINAN_AGRAVOS];
    
    if (categoria) {
      agravos = agravos.filter(a => a.categoria === categoria);
    }
    
    if (prazo) {
      agravos = agravos.filter(a => a.prazoNotificacao === prazo);
    }
    
    res.json(agravos.map(a => ({
      codigo: a.codigo,
      nome: a.nome,
      cid10: a.cid10,
      categoria: a.categoria,
      prazoNotificacao: a.prazoNotificacao,
      fichaInvestigacao: a.fichaInvestigacao,
      totalCampos: a.campos.length,
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/agravos/:codigo", requireAuth, async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;
    const agravo = SINAN_AGRAVOS.find(a => a.codigo === codigo);
    
    if (!agravo) {
      return res.status(404).json({ error: "Agravo não encontrado" });
    }
    
    res.json(agravo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/categorias", requireAuth, async (req: Request, res: Response) => {
  try {
    const categoriasComContagem = CATEGORIAS_SINAN.map(cat => ({
      ...cat,
      totalAgravos: SINAN_AGRAVOS.filter(a => a.categoria === cat.id).length,
    }));
    res.json(categoriasComContagem);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const sinanTemplates = SINAN_AGRAVOS.map(agravo => {
      const slug = agravo.nome.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      return {
        id: `builtin-sinan-${slug}`,
        slug,
        codigo: agravo.codigo,
        name: `${agravo.nome} (${agravo.cid10})`,
        category: "sinan" as const,
        subcategory: agravo.categoria,
        isBuiltIn: true,
        description: `Ficha de notificação/investigação - ${agravo.nome}. Prazo: ${agravo.prazoNotificacao === 'imediata' ? 'Notificação imediata (24h)' : 'Notificação semanal'}`,
        prazoNotificacao: agravo.prazoNotificacao,
        fichaInvestigacao: agravo.fichaInvestigacao,
        totalCampos: agravo.campos.length,
        fields: agravo.campos,
        pageSize: { width: 2100, height: 2970 },
      };
    });

    const builtInTemplates = [
      ...sinanTemplates,
      { 
        id: "builtin-bpa-i",
        slug: "bpa-i", 
        name: "BPA-I - Boletim de Produção Ambulatorial Individual", 
        category: "bpa" as const,
        subcategory: "producao",
        isBuiltIn: true,
        description: "Boletim de Produção Ambulatorial Individual para registro de atendimentos SUS",
        prazoNotificacao: "mensal",
        fichaInvestigacao: false,
        totalCampos: BPA_TEMPLATE.fields?.length || 0,
        fields: BPA_TEMPLATE.fields,
        pageSize: BPA_TEMPLATE.pageSize,
      },
      { 
        id: "builtin-apac",
        slug: "apac", 
        name: "APAC - Autorização de Procedimento Ambulatorial", 
        category: "apac" as const,
        subcategory: "alta-complexidade",
        isBuiltIn: true,
        description: "Autorização de Procedimento de Alta Complexidade para TFD e procedimentos especiais",
        prazoNotificacao: "sob-demanda",
        fichaInvestigacao: false,
        totalCampos: APAC_TEMPLATE.fields?.length || 0,
        fields: APAC_TEMPLATE.fields,
        pageSize: APAC_TEMPLATE.pageSize,
      },
    ];

    if (category) {
      res.json(builtInTemplates.filter(t => t.category === category));
    } else {
      res.json(builtInTemplates);
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/templates/:slug", requireAuth, async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    if (SINAN_TEMPLATES[slug]) {
      return res.json({
        id: `builtin-sinan-${slug}`,
        slug,
        name: `Ficha SINAN - ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
        category: "sinan",
        isBuiltIn: true,
        ...SINAN_TEMPLATES[slug],
      });
    } 
    
    if (slug === "bpa-i") {
      return res.json({ 
        id: "builtin-bpa-i",
        slug: "bpa-i", 
        name: "BPA-I", 
        category: "bpa", 
        isBuiltIn: true,
        ...BPA_TEMPLATE 
      });
    }
    
    if (slug === "apac") {
      return res.json({ 
        id: "builtin-apac",
        slug: "apac", 
        name: "APAC", 
        category: "apac", 
        isBuiltIn: true,
        ...APAC_TEMPLATE 
      });
    }

    res.status(404).json({ error: "Template não encontrado" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/validate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { templateSlug, payload } = validatePayloadSchema.parse(req.body);

    let templateFields;
    
    if (SINAN_TEMPLATES[templateSlug]) {
      templateFields = SINAN_TEMPLATES[templateSlug];
    } else if (templateSlug === "bpa-i") {
      templateFields = BPA_TEMPLATE;
    } else if (templateSlug === "apac") {
      templateFields = APAC_TEMPLATE;
    }

    if (!templateFields || !templateFields.fields) {
      return res.status(404).json({ error: "Template não encontrado" });
    }

    const result = formEngine.validatePayload(
      { pageSize: templateFields.pageSize!, fields: templateFields.fields as any },
      payload
    );

    res.json(result);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Dados inválidos", details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get("/categories", requireAuth, async (_req: Request, res: Response) => {
  res.json([
    { value: "sinan", label: "SINAN - Notificações", count: Object.keys(SINAN_TEMPLATES).length },
    { value: "bpa", label: "BPA - Produção Ambulatorial", count: 1 },
    { value: "apac", label: "APAC - Autorização Procedimentos", count: 1 },
    { value: "vigilancia", label: "Vigilância Ambiental", count: 0 },
    { value: "tfd", label: "TFD - Tratamento Fora Domicílio", count: 0 },
    { value: "aih", label: "AIH - Internação Hospitalar", count: 0 },
    { value: "mortalidade", label: "Mortalidade", count: 0 },
  ]);
});

export default router;
