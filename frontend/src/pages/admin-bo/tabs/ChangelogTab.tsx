import { CheckCircle2, GitCommit, Rocket, ScrollText } from "lucide-react";
import { APP_RELEASE_DATE, APP_VERSION_LABEL } from "@/lib/appVersion";

type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  summary: string;
  items: string[];
  commit?: string;
  current?: boolean;
};

const CHANGELOG: ChangelogEntry[] = [
  {
    version: APP_VERSION_LABEL,
    date: APP_RELEASE_DATE,
    title: "Release finale, documentation et deep links admin",
    summary:
      "La production est synchronisée sur main, le smoke test final est vert et les deep links admin retombent proprement sur l'authentification hors session.",
    items: [
      "Correction des routes /admin/:tab, /bo-admin/:tab et /admin-bo/:tab sans page 404.",
      "Smoke prod validé : health, branding endpoint, bundle, admin auth et mentions légales.",
      "Documentation projet, roadmap, audit, runbook et fiche back-office actualisés.",
      "Main, origin/main et stormeo/main synchronisés sur le commit de release.",
    ],
    commit: "301451b",
    current: true,
  },
  {
    version: "v0.4.1",
    date: "31 mai 2026",
    title: "Périmètre i18n UI front et traçabilité release",
    summary:
      "La traduction est cadrée sur l'interface utilisateur front uniquement, le back-office reste en français et la version devient accessible depuis toutes les interfaces admin.",
    items: [
      "Registre de traduction recentré sur les contenus système et l'UI front.",
      "Ligues, pronostics, chats, pseudos, scores et feedbacks exclus des métriques i18n.",
      "Footer admin avec numéro de version cliquable vers ce changelog.",
      "CI/CD vert et production pronokif.eu vérifiée sur le nouveau bundle admin.",
    ],
    commit: "f5789fc",
  },
  {
    version: "v0.4.0",
    date: "31 mai 2026",
    title: "Audit technique réel et DevOps dashboard",
    summary:
      "Mise à jour de l'audit v0.4, alignement des statuts DevOps avec la prod et consolidation des checklists de release.",
    items: [
      "Interface DevOps alignée sur les statuts réels CI/CD/prod.",
      "Roadmap et audit technique mis à jour au réel du 31 mai 2026.",
      "Canary prod enrichi avec vérification des assets admin.",
    ],
    commit: "192b120",
  },
  {
    version: "v0.3.0",
    date: "30-31 mai 2026",
    title: "Back-office métier, médias et circuits interactifs",
    summary:
      "Extension forte du pilotage admin avec fiches métier, médiathèque, circuits exploitables et parcours pronostics plus compact.",
    items: [
      "Dashboard admin enrichi avec derniers inscrits et derniers pronostics.",
      "Médiathèque admin avec dossiers et dépôt d'images pour les fiches.",
      "Cartes circuits interactives, hotspots et premiers virages identifiés.",
      "UX multi-steps pronostics compactée en pipe plus lisible.",
    ],
  },
];

export default function ChangelogTab() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-pk-red" />
            <p className="font-data text-[10px] uppercase tracking-[0.18em] text-pk-red">
              Notes de version
            </p>
          </div>
          <h2 className="font-heading text-2xl uppercase tracking-tight text-white">Changelog</h2>
          <p className="mt-1 max-w-2xl font-body text-sm text-gray-500">
            Historique court des livraisons applicatives utiles aux admins, avec les changements à
            vérifier après chaque release.
          </p>
        </div>
        <div className="rounded-md border border-pk-red/25 bg-pk-red-subtle px-4 py-3 text-right">
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-pk-titane">
            Version courante
          </p>
          <p className="mt-1 font-heading text-2xl uppercase leading-none text-white">
            {APP_VERSION_LABEL}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CHANGELOG.map((entry) => (
          <article
            key={entry.version}
            className={`rounded-md border p-4 ${
              entry.current
                ? "border-pk-red/35 bg-pk-red-subtle"
                : "border-white/[0.08] bg-pk-surface/80"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-sm border border-white/10 bg-black/20 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-white">
                    {entry.version}
                  </span>
                  <span className="font-data text-[10px] uppercase tracking-[0.14em] text-pk-titane">
                    {entry.date}
                  </span>
                  {entry.current && (
                    <span className="rounded-sm border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-emerald-300">
                      En prod
                    </span>
                  )}
                </div>
                <h3 className="font-heading text-lg uppercase tracking-wide text-white">
                  {entry.title}
                </h3>
                <p className="mt-1 font-body text-sm leading-relaxed text-gray-400">
                  {entry.summary}
                </p>
              </div>
              {entry.commit && (
                <div className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/20 px-2 py-1 font-data text-[10px] uppercase tracking-[0.14em] text-pk-titane">
                  <GitCommit className="h-3.5 w-3.5" />
                  {entry.commit}
                </div>
              )}
            </div>

            <div className="mt-4 grid gap-2 md:grid-cols-2">
              {entry.items.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-2 rounded-sm border border-white/[0.06] bg-black/15 p-3"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-300" />
                  <p className="font-body text-sm leading-snug text-gray-300">{item}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <section className="rounded-md border border-cyan-400/20 bg-cyan-400/[0.06] p-4">
        <div className="flex items-start gap-3">
          <Rocket className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
          <p className="font-body text-sm leading-relaxed text-gray-400">
            À chaque release, cette page doit refléter ce qui est réellement en production et ce que
            les admins doivent tester côté back-office et côté app utilisateur.
          </p>
        </div>
      </section>
    </div>
  );
}
