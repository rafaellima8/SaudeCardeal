import { Router, Request, Response } from "express";
import { z } from "zod";
import { formEngine, SINAN_TEMPLATES, BPA_TEMPLATE, APAC_TEMPLATE } from "./form-engine";
import { requireAuth, getEffectiveUnitId } from "../../server/auth";

const router = Router();

const validatePayloadSchema = z.object({
  templateSlug: z.string(),
  payload: z.record(z.any()),
});

router.get("/templates", requireAuth, async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    
    const builtInTemplates = [
      ...Object.entries(SINAN_TEMPLATES).map(([slug, template]) => ({
        id: `builtin-sinan-${slug}`,
        slug,
        name: `Ficha SINAN - ${slug.charAt(0).toUpperCase() + slug.slice(1)}`,
        category: "sinan" as const,
        isBuiltIn: true,
        description: template.description || `Ficha de notificação ${slug}`,
        fields: template.fields,
        pageSize: template.pageSize,
      })),
      { 
        id: "builtin-bpa-i",
        slug: "bpa-i", 
        name: "BPA-I - Boletim de Produção Ambulatorial Individual", 
        category: "bpa" as const, 
        isBuiltIn: true,
        description: "Boletim de Produção Ambulatorial Individual para registro de atendimentos",
        fields: BPA_TEMPLATE.fields,
        pageSize: BPA_TEMPLATE.pageSize,
      },
      { 
        id: "builtin-apac",
        slug: "apac", 
        name: "APAC - Autorização de Procedimento Ambulatorial", 
        category: "apac" as const, 
        isBuiltIn: true,
        description: "Autorização de Procedimento de Alta Complexidade",
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
