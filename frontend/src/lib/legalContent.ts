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

export function fallbackLegalPage(slug: string): LegalPageContent {
  return FALLBACK_LEGAL_PAGES[slug] || FALLBACK_LEGAL_PAGES["mentions-legales"];
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
