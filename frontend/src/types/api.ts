/**
 * API response types — mirrors backend/models/schemas.py.
 *
 * Keep this file in sync with the backend Pydantic models.
 * Types are used by the typed `api` helpers in lib/api.ts.
 */

// ═══════════════════════════════════════ AUTH ═══════════════════════════════════

export interface User {
  id: string;
  email: string;
  username: string | null;
  created_at: string;
  current_league_id: string | null;
  xp: number;
  level: number;
  avatar_id: string | null;
  custom_avatar_url: string | null;
  is_admin?: boolean;
  email_verified?: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ═══════════════════════════════════════ LEAGUES ════════════════════════════════

export interface League {
  id: string;
  name: string;
  code: string;
  created_by: string;
  members: string[];
  created_at: string;
  description: string | null;
  owner_id?: string;
}

export interface LeaguePreview {
  id: string;
  name: string;
  code: string;
  members_count: number;
  description?: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_points: number;
  last_race_points: number;
  position: number;
  position_change: number;
  avatar_id?: string;
  custom_avatar_url?: string;
  level?: number;
}

export interface UnreadMessages {
  total_unread: number;
  by_league: Record<string, number>;
}

export interface ChatMessageResponse {
  id: string;
  league_id: string;
  user_id: string;
  username: string;
  avatar_id?: string;
  custom_avatar_url?: string;
  content: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  username: string;
  avatar_id?: string;
  custom_avatar_url?: string;
  level: number;
  xp: number;
  is_owner: boolean;
}

// ═══════════════════════════════════════ RACES ══════════════════════════════════

export interface Race {
  id: string;
  name: string;
  circuit: string;
  country: string;
  date: string;
  quali_date: string;
  sprint_quali_date: string | null;
  sprint_race_date: string | null;
  predictions_close_at: string;
  status: "upcoming" | "in_progress" | "finished" | "cancelled";
  is_sprint_weekend: boolean;
  results: RaceResults | null;
  race_time: string | null;
  quali_time: string | null;
  sprint_quali_time: string | null;
  sprint_race_time: string | null;
  timezone: string;
  race_start_at: string | null;
  race_end_at: string | null;
  race_duration_minutes: number | null;
  is_test_race?: boolean;
  thumbnail_url?: string | null;
  is_cancelled?: boolean;
  can_predict?: boolean;
  can_predict_sprint?: boolean;
}

export interface RaceDetails extends Race {
  sessions?: RaceSession[];
  circuit_info?: CircuitInfo;
  can_predict?: boolean;
  can_predict_sprint?: boolean;
}

export interface RaceSession {
  name: string;
  short_name: string;
  date: string;
  time: string;
}

export interface CircuitInfo {
  length_km: number;
  laps: number;
  turns: number;
  drs_zones: number;
  lap_record?: string;
  lap_record_holder?: string;
}

export interface RaceResults {
  quali_pole: string;
  quali_top10: string[];
  sprint_quali_top10?: string[];
  sprint_race_top10?: string[];
  race_winner: string;
  race_top10: string[];
  safety_car: boolean;
  dnf_drivers: string[];
  fastest_lap: string | null;
  first_corner_leader: string | null;
}

// ═══════════════════════════════════════ DRIVERS ════════════════════════════════

export interface Driver {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  team: string;
  number: number;
  country: string;
  code: string;
  photo_url: string;
}

export interface DriverDetails extends Driver {
  date_of_birth: string;
  place_of_birth: string;
  country_name: string;
  height_cm?: number;
  license_points?: number;
  palmares?: DriverPalmares;
  contract?: DriverContract;
  useful_facts: DriverFact[];
}

export interface DriverPalmares {
  f1: {
    world_championships: number;
    wins: number;
    podiums: number;
    poles: number;
    fastest_laps: number;
    points: number;
    entries: number;
    seasons: string;
    first_team: string;
  };
  junior: Array<{
    year: number;
    series: string;
    team: string;
    position: number;
  }>;
}

export interface DriverContract {
  end_year: number;
  salary_estimate?: string;
  notes?: string;
}

export interface DriverFact {
  type: string;
  title: string;
  text: string;
  icon: string;
}

export interface DriverComparison {
  driver1: DriverDetails;
  driver2: DriverDetails;
  stats_comparison: Record<string, { driver1: number; driver2: number; winner: string }>;
  win_rate: { driver1: number; driver2: number };
  podium_rate: { driver1: number; driver2: number };
  pole_rate: { driver1: number; driver2: number };
  points_per_race: { driver1: number; driver2: number };
}

// ═══════════════════════════════════════ PREDICTIONS ═══════════════════════════

export interface BonusBets {
  safety_car: boolean;
  dnf_drivers: string[];
  fastest_lap_driver: string | null;
  first_corner_leader: string | null;
}

export interface Prediction {
  id: string;
  user_id: string;
  race_id: string;
  quali_pole: string;
  quali_top10: string[];
  sprint_quali_top10: string[] | null;
  sprint_race_top10: string[] | null;
  race_winner: string;
  race_top10: string[];
  bonus_bets: BonusBets | null;
  sprint_bonus_bets: BonusBets | null;
  custom_predictions: Record<string, unknown> | null;
  locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface PredictionStats {
  predictions_made: number;
  predictions_correct: number;
  total_points: number;
  best_race_points: number;
  current_streak: number;
  total_predictions?: number;
  races_participated?: number;
  winners_correct?: number;
  poles_correct?: number;
}

export interface PointsHistoryEntry {
  race_id: string;
  race_name: string;
  points: number;
  breakdown: Record<string, number>;
  date: string;
}

export interface PointsHistoryRaceEntry {
  race_id: string;
  race_name: string;
  race_date: string;
  is_sprint_weekend: boolean;
  has_results: boolean;
  total_points: number;
  xp_earned: number;
  points_breakdown: Record<string, { points: number; label: string }> | null;
  sprint_breakdown: Record<string, { points: number; label: string }> | null;
  details: string[];
}

export interface PointsHistoryResponse {
  history: PointsHistoryRaceEntry[];
  summary: {
    total_points: number;
    total_xp: number;
    races_with_results: number;
    races_pending: number;
  };
}

// ═══════════════════════════════════════ CUSTOM PREDICTIONS ════════════════════

export interface CustomPredictionChoice {
  id: string;
  text: string;
  driver_id?: string;
  position?: number;
  points: number;
}

export interface CustomPrediction {
  id: string;
  race_id: string;
  league_id: string;
  created_by: string;
  question: string;
  answer_type: "yes_no" | "text" | "choice" | "drivers" | "positions" | "custom";
  multiple_choice: boolean;
  choices: CustomPredictionChoice[] | null;
  correct_answer: unknown;
  created_at: string;
}

export interface CreateCustomPredictionPayload {
  race_id: string;
  league_id: string;
  question: string;
  answer_type: string;
  multiple_choice: boolean;
  choices: { text: string; points: number }[] | null;
}

// ═══════════════════════════════════════ NOTIFICATIONS ═════════════════════════

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "update" | "important";
  is_read: boolean;
  created_at: string;
}

// ═══════════════════════════════════════ MINI-GAMES ════════════════════════════

export interface MinigameAttempts {
  attempts_used: number;
  attempts_remaining: number;
}

export interface MinigameLeaderboardEntry {
  user_id: string;
  username: string;
  avatar_id?: string;
  best_score: number;
  attempts: number;
}

// ═══════════════════════════════════════ AVATARS ═══════════════════════════════

export interface Avatar {
  id: string;
  name: string;
  category: string;
  icon?: string;
  colors?: [string, string];
  number?: number;
  team?: string;
}

export interface AvatarsResponse {
  default?: Avatar[];
  teams?: Avatar[];
  drivers?: Avatar[];
  all: Avatar[];
}

// ═══════════════════════════════════════ GLOBAL LEADERBOARD ════════════════════

export interface GlobalLeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  my_position: number | null;
  total_players: number;
}

// ═══════════════════════════════════════ MISSIONS ══════════════════════════════

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  xp_reward: number;
  progress: { current: number; target: number };
  completed: boolean;
  claimed: boolean;
}

export interface MissionsResponse {
  missions: Mission[];
  categories: Record<string, Mission[]>;
}

export interface MissionClaimResponse {
  xp_earned: number;
  new_xp: number;
  new_level: number;
  level_up: boolean;
}

// ═══════════════════════════════════════ ADMIN ═════════════════════════════════

export interface AdminMember {
  id: number;
  user_id: string;
  username: string;
  email: string;
  level: number;
  xp: number;
  created_at: string;
  last_login?: string;
  predictions_count: number;
}

export interface FeedbackItem {
  id: number;
  user_id: string;
  username: string;
  type: "bug" | "suggestion" | "other";
  message: string;
  created_at: string;
  is_read: boolean;
}

// ═══════════════════════════════════════ RESULTS ═══════════════════════════════

export interface ResultsResponse {
  race: Race;
  user_prediction: Prediction | null;
  results: RaceResults;
  points?: number;
  breakdown?: Record<string, number>;
}
