import { z } from 'zod';
export const listingSchema=z.object({
  title:z.string().trim().min(1,'Το πεδίο τίτλου είναι υποχρεωτικό.').max(140),
  price_eur:z.number().int().nonnegative().nullable(),
  registration_year:z.number().int().min(1900).max(new Date().getFullYear()+1),
  kilometers:z.number().int().nonnegative(),
  engine_cc:z.number().int().positive(),
  fuel:z.string().trim().max(40).nullable().optional(),
  description:z.string().max(10000),
  status:z.enum(['active','sold','hidden'])
});
export const accessorySchema=z.object({title:z.string().trim().min(1).max(140),price_eur:z.number().int().nonnegative().nullable(),description:z.string().max(10000),status:z.enum(['active','sold','hidden'])});
