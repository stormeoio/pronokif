/**
 * Zod schemas for critical Pronokif API responses.
 *
 * Used in api.ts to validate responses at the boundary between the network
 * and the rest of the app. Only the shapes we actually rely on are described —
 * extra fields pass through (z.object() strips unknown keys by default, but
 * we use .passthrough() so future additions don't break existing pages).
 *
 * Validation is intentionally lenient: invalid/missing optional fields are
 * coerced to safe defaults rather than hard-failing, so a backend shape change
 * degrades gracefully instead of crashing the UI.
 *
 * Critical endpoints validated here:
 *   GET /drivers          → DriverSchema[]
 *   GET /races            → RaceSchema[]
 *   GET /races/upcoming   → RaceSchema[]
 *   GET /leagues/my       → LeagueSchema[]
 *   GET /auth/session     → SessionSchema
 *   GET /predictions/history → PredictionHistoryEntrySchema[]
 */

import { z } from "zod";

// ── Primitives ────────────────────────────────────────────────────────────────

const safeString = z.string().catch("");
const safeNumber = z.number().catch(0);
const safeBoolean = z.boolean().catch(false);
const safeNullableString = z.string().nullable().catch(null);

// ── Driver ────────────────────────────────────────────────────────────────────

export const DriverSchema = z
  .object({
    id: safeString,
    name: safeString,
    team: safeString,
    number: safeNumber,
    country: safeString.default(""),
    code: safeNullableString,
    first_name: safeString.default(""),
    last_name: safeString.default(""),
    full_name: safeNullableString,
    team_id: safeNullableString,
    photo_url: safeNullableString,
    team_logo_url: safeNullableString,
  })
  .passthrough();

export type DriverSchema = z.infer<typeof DriverSchema>;

export const DriversSchema = z.array(DriverSchema).catch([]);

// ── Race ──────────────────────────────────────────────────────────────────────

export const RaceSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    name: safeString,
    circuit: safeString.default(""),
    country: safeString.default(""),
    date: safeString,
    status: z.enum(["upcoming", "in_progress", "finished", "cancelled"]).catch("upcoming"),
    season: safeNumber.default(2026),
    round: safeNumber.default(0),
    race_start_at: safeNullableString,
    race_end_at: safeNullableString,
    is_cancelled: safeBoolean.default(false),
    is_sprint_weekend: safeBoolean.default(false),
    thumbnail_url: safeNullableString,
  })
  .passthrough();

export type RaceSchema = z.infer<typeof RaceSchema>;

export const RacesSchema = z.array(RaceSchema).catch([]);

// ── League ────────────────────────────────────────────────────────────────────

export const LeagueSchema = z
  .object({
    id: safeString,
    name: safeString,
    code: safeString.default(""),
    owner_id: safeNullableString,
    members: z.array(z.unknown()).catch([]),
  })
  .passthrough();

export type LeagueSchema = z.infer<typeof LeagueSchema>;

export const LeaguesSchema = z.array(LeagueSchema).catch([]);

// ── Auth session ──────────────────────────────────────────────────────────────

export const UserSchema = z
  .object({
    id: safeString,
    email: safeString,
    username: safeNullableString,
    avatar_id: safeNullableString,
    custom_avatar_url: safeNullableString,
    xp: safeNumber.default(0),
    level: safeNumber.default(1),
    current_league_id: safeNullableString,
    email_verified: safeBoolean.default(false),
  })
  .passthrough();

export const SessionSchema = z
  .object({
    user: UserSchema.nullable().catch(null),
  })
  .passthrough();

// ── Prediction history ────────────────────────────────────────────────────────

export const PredictionHistoryEntrySchema = z
  .object({
    race_id: z.union([z.string(), z.number()]).transform(String).catch(""),
  })
  .passthrough();

export const PredictionHistorySchema = z.array(PredictionHistoryEntrySchema).catch([]);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate a Zod schema and return the parsed value.
 * On failure, logs in development and returns the fallback.
 * Never throws in production — validation is a safety net, not a hard gate.
 */
export function safeParse<T>(schema: z.ZodType<T>, data: unknown, fallback: T): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    if (import.meta.env.DEV) {
      console.warn("[schema] Validation failed:", result.error.flatten());
    }
    return fallback;
  }
  return result.data;
}
