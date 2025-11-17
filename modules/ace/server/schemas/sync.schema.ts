import { z } from "zod";

// Schema para sincronização de imóveis
export const aceDwellingSyncSchema = z.object({
  external_id: z.string().min(1, "External ID é obrigatório"),
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

// Schema para sincronização de visitas
export const aceVisitSyncSchema = z.object({
  external_id: z.string().min(1, "External ID é obrigatório"),
  dwelling_external_id: z.string().min(1, "Dwelling external ID é obrigatório"),
  professional_id: z.string().uuid("Professional ID deve ser UUID válido"),
  unit_id: z.string().uuid("Unit ID deve ser UUID válido"),
  visit_date: z.string().datetime("Data da visita deve ser ISO datetime"),
  visit_type: z.string().optional(),
  visit_motive: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  temperature: z.number().optional(),
  blood_pressure_systolic: z.number().int().optional(),
  blood_pressure_diastolic: z.number().int().optional(),
  heart_rate: z.number().int().optional(),
  respiratory_rate: z.number().int().optional(),
  blood_glucose: z.number().int().optional(),
  weight: z.number().optional(),
  height: z.number().optional(),
  observations: z.string().optional(),
  findings: z.record(z.any()).default({}),
});

// Schema para fotos (base64 ou URL)
export const acePhotoSyncSchema = z.object({
  external_id: z.string().min(1, "External ID é obrigatório"),
  entity_type: z.enum(["dwelling", "visit", "foci"]),
  entity_external_id: z.string().min(1, "Entity external ID é obrigatório"),
  photo_data: z.string().min(1, "Photo data é obrigatório"),
  mime_type: z.string().default("image/jpeg"),
  description: z.string().optional(),
});

// Schema principal para request de sync
export const aceSyncRequestSchema = z.object({
  dwellings: z.array(aceDwellingSyncSchema).default([]),
  visits: z.array(aceVisitSyncSchema).default([]),
  photos: z.array(acePhotoSyncSchema).default([]),
});

// Tipos TypeScript
export type AceDwellingSync = z.infer<typeof aceDwellingSyncSchema>;
export type AceVisitSync = z.infer<typeof aceVisitSyncSchema>;
export type AcePhotoSync = z.infer<typeof acePhotoSyncSchema>;
export type AceSyncRequest = z.infer<typeof aceSyncRequestSchema>;

// Schema de resposta
export const aceSyncResponseSchema = z.object({
  success: z.boolean(),
  dwellings: z.record(z.string()), // external_id -> server_id
  visits: z.record(z.string()),     // external_id -> server_id
  photos: z.record(z.string()),     // external_id -> server_id
  errors: z.array(z.object({
    type: z.string(),
    external_id: z.string(),
    error: z.string(),
  })).default([]),
});

export type AceSyncResponse = z.infer<typeof aceSyncResponseSchema>;
