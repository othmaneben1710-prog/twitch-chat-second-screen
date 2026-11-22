// Logique pure (sans API Chrome) : choix de l'écran et lecture de l'URL Twitch.
// Fichier « classique » (pas un module) pour être chargé à la fois par
// le service worker (importScripts), le popup (<script>) et la page de tests.
(function (racine) {
  "use strict";

  // Chemins de twitch.tv qui ne sont pas des chaînes.
  const CHEMINS_RESERVES = new Set([
    "directory", "videos", "settings", "popout", "search", "subscriptions",
    "inventory", "wallet", "drops", "p", "downloads", "jobs", "turbo",
    "friends", "messages", "moderator", "u", "embed", "login", "signup",
    "following", "store", "prime", "bits", "creatorcamp", "broadcast",
    "dashboard", "manager", "privacy", "legal", "team", "event", "clips",
  ]);

  /** Renvoie le nom de la chaîne pour une URL twitch.tv/<chaine>, sinon null. */
  function chaineDepuisUrl(url) {
    let u;
    try { u = new URL(url); } catch (e) { return null; }
    if (u.protocol !== "https:") return null;
    if (u.hostname !== "www.twitch.tv" && u.hostname !== "twitch.tv") return null;
    const morceaux = u.pathname.split("/").filter(Boolean);
    if (morceaux.length !== 1) return null;
    const nom = morceaux[0];
    if (!/^[A-Za-z0-9_]{1,25}$/.test(nom)) return null;
    if (CHEMINS_RESERVES.has(nom.toLowerCase())) return null;
    return nom.toLowerCase();
  }

  function urlChatPopout(chaine) {
    return "https://www.twitch.tv/popout/" + encodeURIComponent(chaine) + "/chat?popout=";
  }

  /** Écrans réellement utilisables (on ignore les écrans désactivés ou en miroir). */
  function ecransUtilisables(ecrans) {
    return (ecrans || []).filter(function (e) {
      if (!e || !e.bounds) return false;
      if (e.isEnabled === false) return false;
      if (e.mirroringSourceId && e.mirroringSourceId !== "") return false;
      return true;
    });
  }

  function surfaceCommune(a, b) {
    const l = Math.max(a.left, b.left);
    const t = Math.max(a.top, b.top);
    const r = Math.min(a.left + a.width, b.left + b.width);
    const bas = Math.min(a.top + a.height, b.top + b.height);
    return Math.max(0, r - l) * Math.max(0, bas - t);
  }

  function distanceAuCentre(rect, ecran) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const b = ecran.bounds;
    const ex = b.left + b.width / 2;
    const ey = b.top + b.height / 2;
    return Math.hypot(cx - ex, cy - ey);
  }

  /**
   * Écran sur lequel se trouve une fenêtre ({left, top, width, height}).
   * On prend l'écran qui contient la plus grande partie de la fenêtre.
   */
  function ecranDeFenetre(ecrans, fenetre) {
    const liste = ecransUtilisables(ecrans);
    if (liste.length === 0) return null;
    if (!fenetre || typeof fenetre.left !== "number") {
      return liste.find(function (e) { return e.isPrimary; }) || liste[0];
    }
    const rect = {
      left: fenetre.left, top: fenetre.top,
      width: Math.max(1, fenetre.width || 1), height: Math.max(1, fenetre.height || 1),
    };
    let meilleur = null;
    let meilleureSurface = 0;
    for (const e of liste) {
      const s = surfaceCommune(rect, e.bounds);
      if (s > meilleureSurface) { meilleureSurface = s; meilleur = e; }
    }
    if (meilleur) return meilleur;
    // Fenêtre hors de tous les écrans : on prend le plus proche.
    return liste.slice().sort(function (a, b) {
      return distanceAuCentre(rect, a) - distanceAuCentre(rect, b);
    })[0];
  }

  function memesLimites(a, b) {
    return !!a && !!b && a.left === b.left && a.top === b.top &&
      a.width === b.width && a.height === b.height;
  }

  /**
   * Choisit l'écran du chat.
   * @param ecrans      résultat de chrome.system.display.getInfo()
   * @param ecranOnglet écran où se trouve l'onglet Twitch (ou null)
   * @param prefere     écran mémorisé {id, bounds} ou null
   * @returns {ecran, raison, ecranUnique, memeEcran} ; ecran est null s'il n'y a aucun écran.
   *   raison : "memorise" | "auto" | "unique"
   */
  function choisirEcranChat(ecrans, ecranOnglet, prefere) {
    const liste = ecransUtilisables(ecrans);
    const resultat = { ecran: null, raison: "unique", ecranUnique: liste.length <= 1, memeEcran: false };
    if (liste.length === 0) return resultat;
    const idOnglet = ecranOnglet ? ecranOnglet.id : null;

    if (prefere) {
      let trouve = liste.find(function (e) { return e.id === prefere.id; });
      if (!trouve && prefere.bounds) {
        trouve = liste.find(function (e) { return memesLimites(e.bounds, prefere.bounds); });
      }
      if (trouve) {
        resultat.ecran = trouve;
        resultat.raison = "memorise";
        resultat.memeEcran = trouve.id === idOnglet;
        return resultat;
      }
    }

    const autres = liste.filter(function (e) { return e.id !== idOnglet; });
    if (autres.length === 0) {
      resultat.ecran = ecranOnglet || liste[0];
      resultat.raison = "unique";
      resultat.memeEcran = true;
      return resultat;
    }
    autres.sort(function (a, b) {
      if (!!a.isPrimary !== !!b.isPrimary) return a.isPrimary ? -1 : 1;
      if (a.bounds.left !== b.bounds.left) return a.bounds.left - b.bounds.left;
      return a.bounds.top - b.bounds.top;
    });
    resultat.ecran = autres[0];
    resultat.raison = "auto";
    return resultat;
  }

  /** Limites de la fenêtre du chat : la zone de travail de l'écran (sans la barre des tâches). */
  function limitesFenetre(ecran) {
    const z = ecran.workArea || ecran.bounds;
    return { left: z.left, top: z.top, width: z.width, height: z.height };
  }

  // Textes de secours (anglais) quand chrome.i18n n'est pas disponible (tests).
  const TEXTES_SECOURS = { screenLabel: "Screen $1 — $2 × $3", screenPrimary: "(primary)" };

  function traductionParDefaut(cle, valeurs) {
    if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getMessage) {
      const t = chrome.i18n.getMessage(cle, valeurs);
      if (t) return t;
    }
    let txt = TEXTES_SECOURS[cle] || cle;
    (valeurs || []).forEach(function (v, i) { txt = txt.split("$" + (i + 1)).join(v); });
    return txt;
  }

  /**
   * Texte lisible pour un écran, ex. « Screen 2 — 1920 × 1080 (primary) ».
   * @param traduire fonction (cle, valeurs) -> texte ; par défaut chrome.i18n.getMessage.
   */
  function libelleEcran(ecran, index, traduire) {
    const t = traduire || traductionParDefaut;
    let txt = t("screenLabel", [String(index + 1), String(ecran.bounds.width), String(ecran.bounds.height)]);
    if (ecran.isPrimary) txt += " " + t("screenPrimary");
    if (ecran.name && !/^\s*$/.test(ecran.name)) txt += " · " + ecran.name;
    return txt;
  }

  racine.Ecrans = {
    chaineDepuisUrl: chaineDepuisUrl,
    urlChatPopout: urlChatPopout,
    ecransUtilisables: ecransUtilisables,
    ecranDeFenetre: ecranDeFenetre,
    choisirEcranChat: choisirEcranChat,
    limitesFenetre: limitesFenetre,
    libelleEcran: libelleEcran,
  };
})(typeof self !== "undefined" ? self : this);
