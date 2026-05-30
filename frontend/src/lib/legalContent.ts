export type LegalPageContent = {
  slug: string;
  title: string;
  summary: string;
  content: string;
  version: string;
  status?: string;
  updated_at?: string;
};

export const LEGAL_PAGE_LINKS = [
  { slug: "mentions-legales", label: "Mentions légales", path: "/mentions-legales" },
  { slug: "cgu", label: "CGU", path: "/cgu" },
  { slug: "confidentialite", label: "Confidentialité", path: "/confidentialite" },
] as const;

export const FALLBACK_LEGAL_PAGES: Record<string, LegalPageContent> = {
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Mentions légales",
    summary: "Identification de l'éditeur, hébergement, propriété intellectuelle et contact.",
    version: "2026.05",
    content:
      "Éditeur\nPronoKif est une application indépendante de pronostics autour de la Formule 1, éditée par l'équipe PronoKif. Les informations administratives complètes de l'éditeur doivent être finalisées avant l'ouverture publique.\n\nContact\nPour toute demande relative au service, vous pouvez écrire à contact@pronokif.eu.\n\nHébergement\nLe service est hébergé par l'infrastructure technique configurée pour PronoKif. Les coordonnées complètes de l'hébergeur doivent être précisées avant publication.\n\nPropriété intellectuelle\nLes marques, logos, interfaces, textes, visuels et éléments logiciels de PronoKif sont protégés. Toute reproduction non autorisée est interdite.\n\nIndépendance\nPronoKif n'est pas affilié, sponsorisé ou approuvé par Formula 1, la FIA, les écuries ou les détenteurs officiels des droits de la Formule 1.",
  },
  cgu: {
    slug: "cgu",
    title: "Conditions générales d'utilisation",
    summary: "Règles d'accès, d'utilisation, de pronostics, de ligues et de modération.",
    version: "2026.05",
    content:
      "Objet\nLes présentes conditions encadrent l'accès et l'utilisation de PronoKif, un service de pronostics F1 entre amis, ligues privées et classements ludiques.\n\nCompte utilisateur\nL'utilisateur s'engage à fournir des informations exactes, à garder ses accès confidentiels et à ne pas créer de compte dans le but de contourner les règles du jeu.\n\nPronostics et classements\nLes pronostics doivent être saisis avant les délais affichés dans l'application. Les scores, mini-jeux et classements peuvent être recalculés en cas d'erreur de données, de calendrier ou de résultat officiel.\n\nComportement\nLes échanges dans les ligues doivent rester respectueux. PronoKif peut modérer, suspendre ou supprimer un contenu ou un compte en cas d'abus, fraude ou comportement contraire à l'esprit du jeu.\n\nDisponibilité\nLe service est fourni en l'état. Des interruptions peuvent survenir pour maintenance, déploiement, correction ou incident technique.\n\nÉvolution des conditions\nLes présentes conditions peuvent être mises à jour. La version applicable est celle publiée dans l'application au moment de l'utilisation.",
  },
  confidentialite: {
    slug: "confidentialite",
    title: "Politique de confidentialité",
    summary: "Données collectées, finalités, sécurité, cookies et droits des utilisateurs.",
    version: "2026.05",
    content:
      "Données collectées\nPronoKif peut traiter les informations de compte, les pronostics, les ligues, les messages, les statistiques de jeu, les préférences et les données techniques nécessaires au fonctionnement du service.\n\nFinalités\nCes données servent à créer le compte, afficher les classements, calculer les scores, sécuriser l'accès, envoyer des notifications utiles et améliorer l'expérience.\n\nSécurité\nLes sessions utilisent des cookies httpOnly et les accès administrateur sont protégés par lien magique et, le cas échéant, authentification à deux facteurs.\n\nConservation\nLes données sont conservées pendant la durée nécessaire au fonctionnement du service, à la sécurité et aux obligations légales éventuelles.\n\nDroits\nVous pouvez demander l'accès, la rectification ou la suppression de vos données en contactant contact@pronokif.eu.\n\nCookies et PWA\nL'application peut utiliser des cookies de session, du stockage local et un service worker afin de maintenir la session, mémoriser certains choix et proposer une expérience PWA.",
  },
};

export const FALLBACK_LEGAL_PAGES_EN: Record<string, LegalPageContent> = {
  "mentions-legales": {
    slug: "mentions-legales",
    title: "Legal notice",
    summary: "Publisher identification, hosting, intellectual property, and contact.",
    version: "2026.05",
    content:
      "Publisher\nPronoKif is an independent prediction app around Formula 1, published by the PronoKif team. Complete publisher administrative information must be finalized before public launch.\n\nContact\nFor any service-related request, you can write to contact@pronokif.eu.\n\nHosting\nThe service is hosted by the technical infrastructure configured for PronoKif. Full hosting provider details must be specified before publication.\n\nIntellectual property\nPronoKif trademarks, logos, interfaces, text, visuals, and software elements are protected. Unauthorized reproduction is prohibited.\n\nIndependence\nPronoKif is not affiliated with, sponsored by, or approved by Formula 1, the FIA, teams, or official Formula 1 rights holders.",
  },
  cgu: {
    slug: "cgu",
    title: "Terms of use",
    summary: "Access, usage, prediction, league, and moderation rules.",
    version: "2026.05",
    content:
      "Purpose\nThese terms govern access to and use of PronoKif, an F1 prediction service for friends, private leagues, and playful rankings.\n\nUser account\nUsers agree to provide accurate information, keep access confidential, and avoid creating accounts to bypass game rules.\n\nPredictions and rankings\nPredictions must be entered before the deadlines shown in the app. Scores, mini-games, and rankings may be recalculated in case of data, calendar, or official result errors.\n\nBehavior\nLeague exchanges must remain respectful. PronoKif may moderate, suspend, or delete content or accounts in case of abuse, fraud, or behavior against the spirit of the game.\n\nAvailability\nThe service is provided as is. Interruptions may occur for maintenance, deployment, correction, or technical incidents.\n\nChanges to terms\nThese terms may be updated. The applicable version is the one published in the app at the time of use.",
  },
  confidentialite: {
    slug: "confidentialite",
    title: "Privacy policy",
    summary: "Collected data, purposes, security, cookies, and user rights.",
    version: "2026.05",
    content:
      "Collected data\nPronoKif may process account information, predictions, leagues, messages, game statistics, preferences, and technical data required for the service to work.\n\nPurposes\nThis data is used to create accounts, display rankings, calculate scores, secure access, send useful notifications, and improve the experience.\n\nSecurity\nSessions use httpOnly cookies and administrator access is protected by magic link and, where applicable, two-factor authentication.\n\nRetention\nData is kept for as long as necessary for service operation, security, and possible legal obligations.\n\nRights\nYou can request access, correction, or deletion of your data by contacting contact@pronokif.eu.\n\nCookies and PWA\nThe app may use session cookies, local storage, and a service worker to maintain the session, remember certain choices, and provide a PWA experience.",
  },
};

export const LEGAL_PAGE_LABELS: Record<string, Record<string, string>> = {
  "mentions-legales": { fr: "Mentions légales", en: "Legal notice" },
  cgu: { fr: "CGU", en: "Terms" },
  confidentialite: { fr: "Confidentialité", en: "Privacy" },
};

export function fallbackLegalPage(slug: string, locale = "fr"): LegalPageContent {
  const pages = locale === "en" ? FALLBACK_LEGAL_PAGES_EN : FALLBACK_LEGAL_PAGES;
  return pages[slug] || pages["mentions-legales"];
}

export function legalContentBlocks(content: string): Array<{ title: string; body: string }> {
  return content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [title, ...bodyLines] = block.split("\n");
      return { title: title.trim(), body: bodyLines.join("\n").trim() };
    });
}
