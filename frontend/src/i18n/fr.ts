/**
 * French translations — default locale.
 */
const fr = {
  // ── App-level ─────────────────────────────────────
  app: {
    skip_to_content: "Aller au contenu principal",
  },

  // ── Navigation ────────────────────────────────────
  nav: {
    home: "Accueil",
    predictions: "Pronos",
    championship: "Champ.",
    leagues: "Ligues",
    profile: "Profil",
    aria_label: "Navigation principale",
  },

  // ── Auth ──────────────────────────────────────────
  auth: {
    tagline: {
      main: "Fais tes pronos, défie tes potes,\nvivez la F1 comme jamais.",
      footer: "Pronostique. Défie.",
      footer_accent: "Vis-le.",
    },
    tabs: {
      login: "Connexion",
      register: "Inscription",
    },
    form: {
      email_label: "Email",
      email_placeholder: "you.com",
      password_label: "Mot de passe",
      remember_me: "Se souvenir",
      forgot_password: "Oublié ?",
    },
    login: {
      submit: "Se connecter",
      loading: "Connexion...",
      success: "Connexion réussie !",
    },
    register: {
      username_label: "Pseudo pilote",
      username_placeholder: "VerstappenFan, LeclercSZN...",
      password_placeholder: "8 caractères minimum",
      nationality_label: "Nationalité",
      nationality_placeholder: "Sélectionne ton pays",
      submit: "Créer mon compte",
      loading: "Création...",
      success: "Compte créé !",
    },
    magic_link: {
      send: "Recevoir un lien magique",
      sent: "Lien envoyé ✓",
      verifying: "Vérification du lien magique...",
      email_required: "Entre ton email pour recevoir le lien magique",
      send_error: "Erreur lors de l'envoi du lien magique",
      send_success: "Lien magique envoyé !",
      success: "Connexion magique confirmée !",
      invalid: "Lien magique invalide ou expiré",
    },
    social: {
      divider: "ou continuer avec",
    },
    footer: {
      new_user: "Nouveau ?",
      register_link: "Rejoins la course",
      existing_user: "Déjà inscrit ?",
      login_link: "Se connecter",
    },
    error: {
      generic: "Une erreur est survenue",
    },
  },

  // ── Username setup ────────────────────────────────
  username: {
    progress: "Étape 3/3",
    title: "Choisis ton pseudo",
    subtitle: "C'est comme ça que tes amis te verront.",
    placeholder: "SpeedyMax",
    validation: {
      char_count: "3-20 car.",
      allowed: "Lettres, chiffres, _",
    },
    preview_badge: "Nouveau",
    submit: "C'est parti !",
    loading: "Enregistrement...",
    success: "Pseudo enregistré !",
    taken: "Ce pseudo est déjà pris",
  },

  // ── Password ──────────────────────────────────────
  password: {
    forgot: {
      title: "Mot de passe oublié ?",
      subtitle: "Entre ton email pour recevoir un lien de réinitialisation.",
      email_placeholder: "you.com",
      submit: "Envoyer le lien",
      loading: "Envoi...",
      success_title: "Email envoyé",
      success_message:
        "Si un compte existe pour cet email, tu recevras un lien pour réinitialiser ton mot de passe.",
      resend_timer: "Renvoyer dans {{seconds}}s",
      resend: "Renvoyer l'email",
      open_mailbox: "Ouvrir ma boîte mail",
      back: "Retour à la connexion",
      error: "Une erreur est survenue. Réessaye.",
    },
    reset: {
      title: "Nouveau mot de passe",
      subtitle: "Choisis un mot de passe sécurisé.",
      password_label: "Nouveau mot de passe",
      confirm_label: "Confirmer",
      submit: "Réinitialiser",
      loading: "Réinitialisation...",
      success_title: "Mot de passe modifié",
      success_message: "Tu peux maintenant te connecter avec ton nouveau mot de passe.",
      success_login: "Se connecter",
      invalid_title: "Lien invalide",
      request_new: "Demander un nouveau lien",
      invalid_link: "Lien de réinitialisation invalide",
      mismatch: "Les mots de passe ne correspondent pas",
      invalid_criteria: "Le mot de passe ne remplit pas tous les critères",
      match_ok: "Les mots de passe correspondent",
      match_fail: "Ne correspond pas",
      error: "Erreur lors de la réinitialisation",
      rules: {
        characters: "8+ caractères",
        uppercase: "1 majuscule",
        lowercase: "1 minuscule",
        digit: "1 chiffre",
      },
      strength: {
        weak: "Faible",
        medium: "Moyen",
        good: "Bon",
        strong: "Fort",
      },
    },
  },

  // ── Splash screen ────────────────────────────────
  splash: {
    skip: "Passer",
    start: "Commencer",
    start_dashboard: "Accéder au paddock",
    start_login: "Se connecter",
    start_admin: "Accéder au back-office",
    baseline: "Pronostique. Défie. Vibre.",
    loading_label: "Synchronisation paddock",
    logs: [
      "Initialisation du paddock",
      "Chargement du calendrier 2026",
      "Préparation des pronostics",
      "Ouverture de la grille",
    ],
    aria_content: "Écran de lancement PronoKif F1",
    aria_loading: "Chargement de PronoKif F1",
    aria_steps: "Étapes de chargement",
  },

  // ── Email verification ────────────────────────────
  email_verification: {
    message: "Vérifie ton email pour sécuriser ton compte.",
    resend: "Renvoyer",
    sending: "Envoi...",
    sent: "Email de vérification envoyé !",
    error: "Erreur lors de l'envoi",
    close: "Fermer",
  },
};

export default fr;
