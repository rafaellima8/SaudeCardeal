import { z } from "zod";

// Schema para criação de imóvel ACE
export const dwellingCreateSchema = z.object({
  external_id: z.string().min(1).optional(), // Opcional - se fornecido, faz upsert
  unit_id: z.string().uuid("Unit ID deve ser UUID válido"),
  microarea: z.string().optional(),
  street: z.string().min(1, "Rua é obrigatória"),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  zip_code: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  dwelling_type: z.string().optional(),
  sanitation: z.string().optional(),
  water_supply: z.string().optional(),
  has_electricity: z.boolean().default(true),
  has_animals: z.boolean().default(false),
  animal_types: z.array(z.string()).default([]),
  household_members: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export type DwellingCreate = z.infer<typeof dwellingCreateSchema>;

// Schema de resposta
export const dwellingResponseSchema = z.object({
  id: z.string().uuid(),
  external_id: z.string().nullable(),
  unit_id: z.string().uuid(),
  microarea: z.string().nullable(),
  street: z.string(),
  number: z.string().nullable(),
  complement: z.string().nullable(),
  neighborhood: z.string().nullable(),
  zip_code: z.string().nullable(),
  latitude: z.string().nullable(),
  longitude: z.string().nullable(),
  dwelling_type: z.string().nullable(),
  sanitation: z.string().nullable(),
  water_supply: z.string().nullable(),
  has_electricity: z.boolean(),
  has_animals: z.boolean(),
  animal_types: z.array(z.string()),
  household_members: z.number(),
  notes: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type DwellingResponse = z.infer<typeof dwellingResponseSchema>;
