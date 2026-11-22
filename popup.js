// Popup de l'extension : même action que le bouton de la page,
// plus le choix (mémorisé) de l'écran du chat.
(async function () {
  "use strict";
  const CLE_ECRAN = "ecranChat";
  const t = function (cle, valeurs) { return chrome.i18n.getMessage(cle, valeurs); };

  // Langue et sens d'écriture (droite à gauche pour l'arabe).
  document.documentElement.lang = chrome.i18n.getUILanguage();
  document.documentElement.dir = t("@@bidi_dir") || "ltr";
  document.querySelectorAll("[data-i18n]").forEach(function (el) {
    el.textContent = t(el.getAttribute("data-i18n"));
  });

  const elEtat = document.getElementById("etat");
  const elOuvrir = document.getElementById("ouvrir");
  const elEcrans = document.getElementById("ecrans");
  const elMemo = document.getElementById("memo");

  const [onglet] = await chrome.tabs.query({ active: true, currentWindow: true });
  const chaine = onglet && onglet.url ? Ecrans.chaineDepuisUrl(onglet.url) : null;

  if (chaine) {
    elEtat.textContent = t("popupChannel", [chaine]);
    elOuvrir.disabled = false;
  } else {
    elEtat.textContent = t("popupNotChannel");
  }

  elOuvrir.addEventListener("click", async function () {
    elOuvrir.disabled = true;
    elEtat.classList.remove("erreur");
    elEtat.textContent = t("popupOpening");
    // Le popup se ferme dès que la fenêtre du chat prend le focus : c'est le
    // service worker qui termine le travail et prévient la page Twitch.
    const reponse = await chrome.runtime.sendMessage({
      type: "ouvrirChat",
      chaine: chaine,
      tabId: onglet.id,
      windowId: onglet.windowId,
      depuisPopup: true,
    });
    if (reponse && !reponse.ok) {
      elEtat.classList.add("erreur");
      elEtat.textContent = t("errOpenChat", [reponse.erreur]);
      elOuvrir.disabled = false;
    } else {
      window.close();
    }
  });

  // ---------- Choix de l'écran ----------

  const ecrans = Ecrans.ecransUtilisables(await chrome.system.display.getInfo());
  const fenetre = onglet ? await chrome.windows.get(onglet.windowId) : null;
  const ecranOnglet = Ecrans.ecranDeFenetre(ecrans, fenetre);
  const memo = (await chrome.storage.local.get(CLE_ECRAN))[CLE_ECRAN] || null;
  const choixActuel = Ecrans.choisirEcranChat(ecrans, ecranOnglet, memo);

  function ajouterOption(valeur, texte, coche, note) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "ecran";
    input.value = valeur;
    input.checked = coche;
    const span = document.createElement("span");
    span.textContent = texte;
    if (note) {
      const n = document.createElement("span");
      n.className = "ici";
      n.textContent = " " + note;
      span.appendChild(n);
    }
    label.append(input, span);
    elEcrans.appendChild(label);
    input.addEventListener("change", enregistrer);
  }

  function afficherMemo() {
    const radio = elEcrans.querySelector("input:checked");
    if (!radio || radio.value === "auto") {
      elMemo.textContent = ecrans.length <= 1 ? t("popupSingleScreen") : t("popupAutoHint");
    } else {
      elMemo.textContent = t("popupSaved");
    }
  }

  async function enregistrer() {
    const radio = elEcrans.querySelector("input:checked");
    if (!radio || radio.value === "auto") {
      await chrome.storage.local.remove(CLE_ECRAN);
    } else {
      const e = ecrans.find(function (x) { return x.id === radio.value; });
      if (e) await chrome.storage.local.set({ [CLE_ECRAN]: { id: e.id, bounds: e.bounds } });
    }
    afficherMemo();
  }

  elEcrans.textContent = "";
  const memoTrouve = choixActuel.raison === "memorise";
  ajouterOption("auto", t("popupAuto"), !memoTrouve,
    !memoTrouve && memo ? t("popupSavedUnplugged") : "");
  ecrans.forEach(function (e, i) {
    ajouterOption(e.id, Ecrans.libelleEcran(e, i, t), memoTrouve && choixActuel.ecran.id === e.id,
      ecranOnglet && e.id === ecranOnglet.id ? t("popupLiveScreen") : "");
  });
  afficherMemo();
})();
