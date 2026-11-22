// Content script : bouton « chat sur l'autre écran » sur les pages de chaîne Twitch,
// raccourci Alt+Maj+C (Alt+Shift+C), et passage du lecteur en plein écran.
(function () {
  "use strict";
  if (window.__tcaeCharge) return;
  window.__tcaeCharge = true;

  const PREFIXE = "tcae-";
  let bouton = null;
  let modeDeuxEcrans = false; // vrai quand c'est nous qui avons lancé le plein écran
  let minuteurToast = null;

  // Textes : _locales/<langue>/messages.json.
  function t(cle, valeurs) { return chrome.i18n.getMessage(cle, valeurs); }
  const SENS = t("@@bidi_dir") || "ltr";
  // Lu dès le chargement : après une mise à jour de l'extension, chrome.i18n
  // n'est plus utilisable dans cette page.
  const TEXTE_RECHARGER = t("toastReload");
  const RACCOURCI = t("keyAlt") + "+" + t("keyShift") + "+C";

  function chaineCourante() {
    return Ecrans.chaineDepuisUrl(location.href);
  }

  function attendre(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  // ---------- Messages à l'écran ----------

  function toast(texte, action) {
    let el = document.getElementById(PREFIXE + "toast");
    if (!el) {
      el = document.createElement("div");
      el.id = PREFIXE + "toast";
      el.setAttribute("role", "status");
      el.dir = SENS;
    }
    // En plein écran, seul l'élément plein écran est visible : on y place le message.
    const parent = document.fullscreenElement || document.body;
    if (el.parentNode !== parent) parent.appendChild(el);
    el.textContent = "";
    const p = document.createElement("span");
    p.textContent = texte;
    el.appendChild(p);
    if (action) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = action.libelle;
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        cacherToast();
        action.faire();
      });
      el.appendChild(b);
    }
    el.classList.add(PREFIXE + "visible");
    clearTimeout(minuteurToast);
    minuteurToast = setTimeout(cacherToast, action ? 10000 : 6000);
  }

  function cacherToast() {
    const el = document.getElementById(PREFIXE + "toast");
    if (el) el.classList.remove(PREFIXE + "visible");
  }

  // Grand bouton centré, utilisé quand le plein écran n'a pas pu être lancé
  // automatiquement (le navigateur exige un clic dans la page).
  function proposerPleinEcran(texte) {
    let voile = document.getElementById(PREFIXE + "voile");
    if (voile) voile.remove();
    voile = document.createElement("div");
    voile.id = PREFIXE + "voile";
    voile.dir = SENS;
    const boite = document.createElement("div");
    boite.className = PREFIXE + "boite";
    const msg = document.createElement("p");
    msg.textContent = texte || t("promptDefault");
    const go = document.createElement("button");
    go.type = "button";
    go.className = PREFIXE + "principal";
    go.textContent = t("btnFullscreen");
    const non = document.createElement("button");
    non.type = "button";
    non.className = PREFIXE + "secondaire";
    non.textContent = t("btnLater");
    go.addEventListener("click", async function () {
      voile.remove();
      const ok = await passerEnPleinEcran();
      if (!ok) toast(t("toastFullscreenRefused"));
    });
    non.addEventListener("click", function () { voile.remove(); });
    boite.append(msg, go, non);
    voile.appendChild(boite);
    document.body.appendChild(voile);
    go.focus();
  }

  // ---------- Plein écran ----------

  function conteneurLecteur() {
    const video = document.querySelector("video");
    if (!video) return null;
    return video.closest('[data-a-target="video-player"], .video-player__container, .video-player') ||
      video.parentElement;
  }

  async function passerEnPleinEcran() {
    if (document.fullscreenElement) { modeDeuxEcrans = true; return true; }
    // 1) Le bouton plein écran de Twitch : garde les contrôles du lecteur.
    const boutonTwitch = document.querySelector('[data-a-target="player-fullscreen-button"]');
    if (boutonTwitch) {
      boutonTwitch.click();
      for (let i = 0; i < 10 && !document.fullscreenElement; i++) await attendre(50);
      if (document.fullscreenElement) { modeDeuxEcrans = true; return true; }
    }
    // 2) Sinon, on met nous-mêmes le conteneur du lecteur en plein écran.
    const cible = conteneurLecteur();
    if (!cible) return false;
    try {
      await cible.requestFullscreen({ navigationUI: "hide" });
      modeDeuxEcrans = true;
      return true;
    } catch (e) {
      return false;
    }
  }

  document.addEventListener("fullscreenchange", function () {
    if (document.fullscreenElement) return;
    if (!modeDeuxEcrans) return;
    modeDeuxEcrans = false;
    // Si le plein écran s'arrête (Échap, ou un clic ailleurs selon le système),
    // on propose d'y revenir en un clic.
    toast(t("toastFullscreenExited"), { libelle: t("btnBackToFullscreen"), faire: passerEnPleinEcran });
  });

  // ---------- Action principale ----------

  let enCours = false;

  async function lancer() {
    if (enCours) return;
    const chaine = chaineCourante();
    if (!chaine) {
      toast(t("toastWrongPage"));
      return;
    }
    enCours = true;
    try {
      let reponse;
      try {
        reponse = await chrome.runtime.sendMessage({ type: "ouvrirChat", chaine: chaine });
      } catch (e) {
        toast(TEXTE_RECHARGER);
        return;
      }
      if (!reponse || !reponse.ok) {
        toast(t("errOpenChat", [(reponse && reponse.erreur) || t("unknownError")]));
        return;
      }
      // Le clic ou la touche de l'utilisateur autorise le plein écran pendant
      // quelques secondes : on le demande maintenant, une fois le chat placé.
      const ok = await passerEnPleinEcran();
      if (reponse.ecranUnique) {
        toast(t("toastSingleScreen"));
      } else if (reponse.memeEcran) {
        toast(t("toastSameScreen"));
      } else if (ok) {
        toast(t("toastChatOpened", [reponse.libelleEcran]));
      }
      if (!ok) proposerPleinEcran(t("promptChatOpened", [reponse.libelleEcran]));
    } finally {
      enCours = false;
    }
  }

  // ---------- Bouton sur la page ----------

  function creerBouton() {
    const b = document.createElement("button");
    b.id = PREFIXE + "bouton";
    b.type = "button";
    b.dir = SENS;
    b.title = t("pageButtonTitle", [RACCOURCI]);
    b.textContent = t("pageButton");
    b.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      lancer();
    });
    document.body.appendChild(b);
    return b;
  }

  // Twitch est une application « une seule page » : on vérifie régulièrement
  // si on est sur une chaîne et où se trouve le lecteur vidéo.
  function mettreAJourBouton() {
    if (!document.body) return;
    if (!bouton || !bouton.isConnected) bouton = creerBouton();
    const video = document.querySelector("video");
    const r = video ? video.getBoundingClientRect() : null;
    const visible = !!chaineCourante() && !document.fullscreenElement && r && r.width > 200 && r.height > 100;
    if (!visible) {
      bouton.classList.remove(PREFIXE + "visible");
      return;
    }
    // Coin en haut à droite du lecteur.
    bouton.style.top = Math.max(r.top, 0) + 12 + "px";
    bouton.style.left = "";
    bouton.style.right = Math.max(window.innerWidth - r.right, 0) + 12 + "px";
    bouton.classList.add(PREFIXE + "visible");
  }

  setInterval(mettreAJourBouton, 700);
  window.addEventListener("resize", mettreAJourBouton);
  window.addEventListener("scroll", mettreAJourBouton, true);
  mettreAJourBouton();

  // ---------- Raccourci clavier Alt+Maj+C ----------

  document.addEventListener("keydown", function (e) {
    if (e.altKey && e.shiftKey && !e.ctrlKey && !e.metaKey && e.code === "KeyC" && !e.repeat) {
      e.preventDefault();
      e.stopPropagation();
      lancer();
    }
  }, true);

  // ---------- Messages venant de l'extension ----------

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === "proposerPleinEcran") {
      const r = msg.resultat || {};
      let texte = r.libelleEcran ? t("promptChatOpened", [r.libelleEcran]) : t("promptDefault");
      if (r.ecranUnique) texte = t("promptSingleScreen");
      proposerPleinEcran(texte);
    }
  });
})();
