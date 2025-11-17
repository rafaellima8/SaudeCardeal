import { z } from "zod";

export const aceStatsResponseSchema = z.object({
  total_visits: z.number().int().min(0),
  total_foci: z.number().int().min(0),
  dwellings_by_status: z.array(z.object({
    status: z.string(),
    count: z.number().int().min(0)
  })),
  visits_by_type: z.array(z.object({
    type: z.string(),
    count: z.number().int().min(0)
  })).optional(),
  recent_activity: z.object({
    last_7_days: z.number().int().min(0),
    last_30_days: z.number().int().min(0)
  }).optional()
});

export type AceStatsResponse = z.infer<typeof aceStatsResponseSchema>;
