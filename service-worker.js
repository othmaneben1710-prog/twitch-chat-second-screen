// Service worker : ouvre (ou déplace) la fenêtre du chat popout de Twitch
// sur l'écran choisi, puis rend la main à l'onglet Twitch.
importScripts("lib/ecrans.js");

const CLE_ECRAN = "ecranChat";          // chrome.storage.local : écran mémorisé
const CLE_FENETRE = "fenetreChatId";    // chrome.storage.session : fenêtre du chat ouverte

function attendre(ms) {
  return new Promise(function (r) { setTimeout(r, ms); });
}

async function fenetreChatExistante() {
  const donnees = await chrome.storage.session.get(CLE_FENETRE);
  const id = donnees[CLE_FENETRE];
  if (typeof id !== "number") return null;
  try {
    return await chrome.windows.get(id, { populate: true });
  } catch (e) {
    await chrome.storage.session.remove(CLE_FENETRE);
    return null;
  }
}

async function ouvrirChat(chaine, idFenetreSource, idOnglet) {
  if (!chaine) throw new Error(chrome.i18n.getMessage("errNoChannel"));
  const url = Ecrans.urlChatPopout(chaine);

  const ecrans = await chrome.system.display.getInfo();
  let fenetreSource = null;
  if (typeof idFenetreSource === "number") {
    try { fenetreSource = await chrome.windows.get(idFenetreSource); } catch (e) { /* fenêtre fermée */ }
  }
  const ecranOnglet = Ecrans.ecranDeFenetre(ecrans, fenetreSource);
  const memo = (await chrome.storage.local.get(CLE_ECRAN))[CLE_ECRAN] || null;
  const choix = Ecrans.choisirEcranChat(ecrans, ecranOnglet, memo);
  if (!choix.ecran) throw new Error(chrome.i18n.getMessage("errNoDisplays"));

  const limites = Ecrans.limitesFenetre(choix.ecran);
  let fenetreChat = await fenetreChatExistante();

  if (fenetreChat) {
    // Réutilise la fenêtre déjà ouverte : change de chaîne si besoin, puis la déplace.
    const onglet = fenetreChat.tabs && fenetreChat.tabs[0];
    if (onglet && onglet.url !== url) await chrome.tabs.update(onglet.id, { url: url });
    if (fenetreChat.state !== "normal") {
      await chrome.windows.update(fenetreChat.id, { state: "normal" });
    }
    await chrome.windows.update(fenetreChat.id, Object.assign({ focused: true }, limites));
  } else {
    // On crée la fenêtre avec les limites de l'écran visé (Chrome refuse
    // « state: maximized » en même temps que des coordonnées), puis on l'agrandit.
    fenetreChat = await chrome.windows.create(Object.assign({
      url: url,
      type: "popup",
      focused: true,
    }, limites));
    await chrome.storage.session.set({ [CLE_FENETRE]: fenetreChat.id });
  }

  // Petite pause : sous Windows, agrandir trop tôt peut garder l'ancien écran.
  await attendre(150);
  await chrome.windows.update(fenetreChat.id, { state: "maximized" });

  // Remet le focus sur la fenêtre Twitch pour que la page puisse passer en plein écran.
  if (fenetreSource) {
    try { await chrome.windows.update(fenetreSource.id, { focused: true }); } catch (e) { /* ignorée */ }
  }

  const index = Ecrans.ecransUtilisables(ecrans).indexOf(choix.ecran);
  return {
    ok: true,
    chaine: chaine,
    ecranUnique: choix.ecranUnique,
    memeEcran: choix.memeEcran,
    raison: choix.raison,
    libelleEcran: Ecrans.libelleEcran(choix.ecran, Math.max(0, index)),
    idOnglet: idOnglet,
  };
}

chrome.runtime.onMessage.addListener(function (msg, sender, repondre) {
  if (!msg || msg.type !== "ouvrirChat") return false;

  const idFenetre = typeof msg.windowId === "number" ? msg.windowId : (sender.tab && sender.tab.windowId);
  const idOnglet = typeof msg.tabId === "number" ? msg.tabId : (sender.tab && sender.tab.id);

  ouvrirChat(msg.chaine, idFenetre, idOnglet).then(function (resultat) {
    // Depuis le popup, le plein écran ne peut pas être lancé directement :
    // on demande à la page d'afficher un bouton « Plein écran » à cliquer.
    if (msg.depuisPopup && typeof idOnglet === "number") {
      chrome.tabs.sendMessage(idOnglet, { type: "proposerPleinEcran", resultat: resultat })
        .catch(function () { /* page pas encore équipée : on ignore */ });
    }
    repondre(resultat);
  }).catch(function (err) {
    repondre({ ok: false, erreur: (err && err.message) || String(err) });
  });
  return true; // réponse asynchrone
});

chrome.windows.onRemoved.addListener(async function (id) {
  const donnees = await chrome.storage.session.get(CLE_FENETRE);
  if (donnees[CLE_FENETRE] === id) await chrome.storage.session.remove(CLE_FENETRE);
});
