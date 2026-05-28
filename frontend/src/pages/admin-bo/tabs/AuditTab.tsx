import {
  Shield,
  GitBranch,
  Code2,
  Gauge,
  TestTube,
  Container,
  Paintbrush,
  Smartphone,
  Activity,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  FileCode,
  Layers,
  Database,
  Lock,
  ArrowRight,
} from "lucide-react";

/* ── Audit data ────────────────────────────────────── */

const SCORES = [
  { label: "Securite", v0: 5, v03: 8.5, icon: Shield, color: "red" },
  { label: "Architecture", v0: 4, v03: 8.5, icon: GitBranch, color: "violet" },
  { label: "Qualite code", v0: 5, v03: 9, icon: Code2, color: "cyan" },
  { label: "Performance", v0: 6, v03: 8, icon: Gauge, color: "orange" },
  { label: "Tests", v0: 3, v03: 7.5, icon: TestTube, color: "yellow" },
  { label: "DevOps", v0: 2, v03: 8, icon: Container, color: "green" },
  { label: "UX / UI", v0: 7, v03: 8.5, icon: Paintbrush, color: "pink" },
  { label: "Mobile", v0: 5, v03: 7.5, icon: Smartphone, color: "blue" },
  { label: "Monitoring", v0: 0, v03: 6, icon: Activity, color: "amber" },
  { label: "Conformite", v0: 3, v03: 6, icon: Scale, color: "teal" },
];

const METRICS = [
  { label: "LOC backend", before: "~3,500", after: "15,710", mult: "x4.5" },
  { label: "LOC frontend", before: "~12,000", after: "36,598", mult: "x3" },
  { label: "Endpoints API", before: "~25", after: "131", mult: "x5" },
  { label: "Composants", before: "~15", after: "83", mult: "x5.5" },
  { label: "Hooks personnalisés", before: "~2", after: "16", mult: "x8" },
  { label: "Modeles Pydantic", before: "~8", after: "40", mult: "x5" },
  { label: "Index MongoDB", before: "0", after: "47", mult: "new" },
  { label: "Fichiers de test", before: "~5", after: "35", mult: "x7" },
  { label: "LOC tests", before: "~400", after: "6,659", mult: "x16" },
  { label: "Erreurs lint", before: "1,137", after: "0", mult: "-100%" },
  { label: '"as any" TS', before: "49", after: "0", mult: "-100%" },
  { label: "Workflows CI/CD", before: "0", after: "2", mult: "new" },
];

const SECURITY = [
  {
    threat: "Vol de session (XSS)",
    before: "localStorage",
    after: "httpOnly cookies SameSite",
    resolved: true,
  },
  {
    threat: "Secret JWT faible",
    before: "Hardcoded",
    after: "Env var, min 32 chars",
    resolved: true,
  },
  {
    threat: "Brute force login",
    before: "Aucune protection",
    after: "Rate limit 5/min/IP",
    resolved: true,
  },
  {
    threat: "Comptes fantomes",
    before: "Aucune vérification",
    after: "Vérification par e-mail",
    resolved: true,
  },
  {
    threat: "Password faible",
    before: "Aucune validation",
    after: "Min 8, maj+min+chiffre",
    resolved: true,
  },
  {
    threat: "Recuperation compte",
    before: "Aucun mécanisme",
    after: "Token 30min + rate limit",
    resolved: true,
  },
  {
    threat: "Admin non protégé",
    before: "Token simple",
    after: "Magic link + TOTP 2FA",
    resolved: true,
  },
  {
    threat: "Data leak",
    before: "CORS permissif",
    after: "Origines strictes + en-têtes",
    resolved: true,
  },
];

const SPRINTS = [
  {
    id: "S0-S6",
    week: "Semaine 1",
    title: "Fondations",
    desc: "Securite, decomposition monolithe, migration Vite+TS, React Query, Docker, CI/CD, Sentry",
    score: "6.5",
  },
  {
    id: "S7-S12",
    week: "Semaine 2",
    title: "Securite & Qualite",
    desc: "httpOnly cookies, JWT refresh, reset password, 47 index, scoring tests, k6 load test",
    score: null,
  },
  {
    id: "S13-S16",
    week: "Semaine 3",
    title: "Branding & Features",
    desc: "Design System v2, magic link, TOTP 2FA, emails branded, splash screen, PWA icons",
    score: "8.0",
  },
];

const TODO = [
  { task: "Monitoring externe (UptimeRobot)", effort: "30min", done: false },
  { task: "Email provider reel (SendGrid/SES)", effort: "2h", done: false },
  { task: "Header CSP", effort: "1h", done: false },
  { task: "Decomposer SplashScreen (1,141L)", effort: "2h", done: false },
  { task: "Eliminer 20 fetch() bruts", effort: "2h", done: false },
  { task: "CI coverage", effort: "30min", done: false },
  { task: "Tests E2E magic link + 2FA", effort: "2h", done: false },
  { task: "Fixer 163 ESLint warnings", effort: "1h", done: false },
];

/* ── Helpers ────────────────────────────────────────── */

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = (value / max) * 100;
  const bg =
    color === "red"
      ? "bg-red-500"
      : color === "green"
        ? "bg-emerald-500"
        : color === "cyan"
          ? "bg-cyan-500"
          : color === "orange"
            ? "bg-orange-500"
            : color === "yellow"
              ? "bg-yellow-500"
              : color === "pink"
                ? "bg-pink-500"
                : color === "blue"
                  ? "bg-blue-500"
                  : color === "violet"
                    ? "bg-violet-500"
                    : color === "amber"
                      ? "bg-amber-500"
                      : color === "teal"
                        ? "bg-teal-500"
                        : "bg-gray-500";

  return (
    <div className="h-2 rounded-full bg-white/[0.06] flex-1">
      <div
        className={`h-full rounded-full ${bg} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ── Component ──────────────────────────────────────── */

export default function AuditTab() {
  const globalV0 = 4.4;
  const globalV03 = 8.0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-heading text-2xl text-white uppercase tracking-tight mb-1">
          Audit technique
        </h2>
        <p className="font-body text-sm text-gray-500">
          v0.3 — 27 mai 2026 — 16 sprints en 12 jours — 100+ commits
        </p>
      </div>

      {/* Big score */}
      <div className="card-arcade p-6">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="text-center">
            <p className="font-data text-5xl font-bold text-red-500">{globalV0}</p>
            <p className="font-body text-xs text-gray-500 mt-1 uppercase tracking-wider">
              Avril 2026
            </p>
          </div>
          <ArrowRight className="w-8 h-8 text-gray-600" />
          <div className="text-center">
            <p className="font-data text-5xl font-bold text-emerald-400">{globalV03}</p>
            <p className="font-body text-xs text-gray-500 mt-1 uppercase tracking-wider">
              Aujourd'hui
            </p>
          </div>
          <div className="ml-4 text-center">
            <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-data text-sm font-bold">
              +{(globalV03 - globalV0).toFixed(1)} pts
            </span>
            <p className="font-body text-xs text-gray-500 mt-2 uppercase tracking-wider">
              Production-ready
            </p>
          </div>
        </div>
      </div>

      {/* Category scores */}
      <div className="card-arcade p-5">
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-4">Scores par categorie</h3>
        <div className="space-y-3">
          {SCORES.map(({ label, v0, v03, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className={`w-4 h-4 text-${color}-400 flex-shrink-0`} />
              <span className="font-body text-sm text-gray-400 w-28 flex-shrink-0">{label}</span>
              <ScoreBar value={v03} color={color} />
              <span className="font-data text-sm text-white w-10 text-right">{v03}</span>
              <span className="font-data text-xs text-emerald-400 w-10 text-right">
                +{(v03 - v0).toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metrics grid */}
      <div>
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3">
          Metriques de l'application
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {METRICS.map(({ label, before, after, mult }) => {
            const isNew = mult === "new";
            const isClean = mult === "-100%";
            return (
              <div key={label} className="card-arcade p-3">
                <p className="font-body text-xs text-gray-500 mb-1">{label}</p>
                <div className="flex items-end gap-2">
                  <span className="font-data text-lg text-white font-bold">{after}</span>
                  <span className="font-data text-xs text-gray-600 line-through">{before}</span>
                </div>
                <span
                  className={`font-data text-[10px] font-bold uppercase tracking-wider ${
                    isNew ? "text-blue-400" : isClean ? "text-emerald-400" : "text-emerald-400"
                  }`}
                >
                  {mult}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Security findings */}
      <div className="card-arcade p-5">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-4 h-4 text-red-400" />
          <h3 className="font-heading text-sm text-gray-400 uppercase">
            Securite — Tous les P0-P1 resolus
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left font-data text-[10px] uppercase tracking-widest text-gray-600 pb-2 pr-4">
                  Menace
                </th>
                <th className="text-left font-data text-[10px] uppercase tracking-widest text-gray-600 pb-2 pr-4">
                  Avant
                </th>
                <th className="text-left font-data text-[10px] uppercase tracking-widest text-gray-600 pb-2 pr-4">
                  Maintenant
                </th>
                <th className="text-center font-data text-[10px] uppercase tracking-widest text-gray-600 pb-2">
                  Statut
                </th>
              </tr>
            </thead>
            <tbody>
              {SECURITY.map(({ threat, before, after, resolved }) => (
                <tr key={threat} className="border-b border-white/[0.04]">
                  <td className="py-2.5 pr-4 font-body text-gray-300">{threat}</td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1 text-xs font-data px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                      <XCircle className="w-3 h-3" />
                      {before}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-1 text-xs font-data px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                      <CheckCircle2 className="w-3 h-3" />
                      {after}
                    </span>
                  </td>
                  <td className="py-2.5 text-center">
                    {resolved ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-400 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <h3 className="font-heading text-sm text-gray-400 uppercase mb-3">
          Planning de la mission
        </h3>
        <div className="space-y-3">
          {SPRINTS.map(({ id, week, title, desc, score }) => (
            <div key={id} className="card-arcade p-4 border-l-4 border-pk-red/60">
              <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                <div>
                  <span className="font-data text-[10px] text-pk-red uppercase tracking-widest">
                    {week} — {id}
                  </span>
                  <h4 className="font-heading text-base text-white uppercase">{title}</h4>
                </div>
                {score && (
                  <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-400 font-data text-xs font-bold">
                    Score: {score}/10
                  </span>
                )}
              </div>
              <p className="font-body text-xs text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Effort stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Clock, label: "Jours", value: "12", color: "text-white" },
          { icon: Layers, label: "Sprints", value: "16", color: "text-pk-red" },
          { icon: FileCode, label: "Commits", value: "100+", color: "text-emerald-400" },
          { icon: Database, label: "Fichiers", value: "140+", color: "text-amber-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card-arcade p-4 text-center">
            <Icon className={`w-5 h-5 ${color} mx-auto mb-2`} />
            <p className={`font-data text-2xl font-bold ${color}`}>{value}</p>
            <p className="font-body text-xs text-gray-500 uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* TODO remaining */}
      <div className="card-arcade p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <h3 className="font-heading text-sm text-gray-400 uppercase">Reste a faire</h3>
          <span className="ml-auto font-data text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
            ~12h
          </span>
        </div>
        <div className="space-y-2">
          {TODO.map(({ task, effort, done }) => (
            <div
              key={task}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                done ? "bg-emerald-500/5" : "bg-white/[0.02]"
              }`}
            >
              {done ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600 flex-shrink-0" />
              )}
              <span
                className={`font-body text-sm flex-1 ${done ? "text-gray-500 line-through" : "text-gray-300"}`}
              >
                {task}
              </span>
              <span className="font-data text-[10px] text-gray-600 uppercase tracking-wider">
                {effort}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
