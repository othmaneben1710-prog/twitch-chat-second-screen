// Faux « chrome.* » pour simuler deux écrans sans navigateur d'extension.
// Toutes les actions sont notées dans window.journal.
(function () {
  const journal = (window.journal = []);
  const ecrans = window.ECRANS_SIMULES || [
    { id: "1", name: "Écran PC", isPrimary: true, isEnabled: true, mirroringSourceId: "",
      bounds: { left: 0, top: 0, width: 1920, height: 1080 }, workArea: { left: 0, top: 0, width: 1920, height: 1040 } },
    { id: "2", name: "Écran TV", isPrimary: false, isEnabled: true, mirroringSourceId: "",
      bounds: { left: 1920, top: 0, width: 2560, height: 1440 }, workArea: { left: 1920, top: 0, width: 2560, height: 1400 } },
  ];
  const fenetres = { 10: { id: 10, left: -8, top: -8, width: 1936, height: 1056, state: "maximized", tabs: [] } };
  let prochainId = 100;
  const local = {}, session = {};
  const ecouteurs = [];
  function zone(obj) {
    return {
      get: async (k) => (k in obj ? { [k]: obj[k] } : {}),
      set: async (o) => { Object.assign(obj, o); journal.push("storage.set " + JSON.stringify(o)); },
      remove: async (k) => { delete obj[k]; journal.push("storage.remove " + k); },
    };
  }
  // Traductions : la vraie _locales/<langue>/messages.json (?lang=fr dans l'URL, « en » par défaut).
  const langue = new URLSearchParams(window.parent.location.search).get("lang") || "en";
  const xhr = new XMLHttpRequest();
  xhr.open("GET", "/_locales/" + langue + "/messages.json", false);
  xhr.send();
  const messages = JSON.parse(xhr.responseText);
  const RTL = ["ar", "he", "fa", "ur"];
  function getMessage(cle, valeurs) {
    if (cle === "@@bidi_dir") return RTL.includes(langue) ? "rtl" : "ltr";
    if (!messages[cle]) return "";
    let txt = messages[cle].message;
    [].concat(valeurs || []).forEach((v, i) => { txt = txt.split("$" + (i + 1)).join(v); });
    return txt;
  }

  window.chrome = {
    i18n: { getMessage: getMessage, getUILanguage: () => langue.replace("_", "-") },
    system: { display: { getInfo: async () => ecrans } },
    storage: { local: zone(local), session: zone(session) },
    windows: {
      get: async (id) => { if (!fenetres[id]) throw new Error("No window"); return fenetres[id]; },
      create: async (o) => {
        const f = Object.assign({ id: prochainId++, state: "normal", tabs: [{ id: 999, url: o.url }] }, o);
        fenetres[f.id] = f; journal.push("windows.create " + JSON.stringify(o)); return f;
      },
      update: async (id, o) => { Object.assign(fenetres[id], o); journal.push("windows.update " + id + " " + JSON.stringify(o)); return fenetres[id]; },
      onRemoved: { addListener: () => {} },
    },
    tabs: {
      query: async () => [{ id: 5, windowId: 10, url: window.URL_ONGLET || "https://www.twitch.tv/zerator" }],
      update: async (id, o) => { journal.push("tabs.update " + id + " " + JSON.stringify(o)); },
      sendMessage: async (id, m) => { journal.push("tabs.sendMessage " + id + " " + m.type); },
    },
    runtime: {
      onMessage: { addListener: (f) => ecouteurs.push(f) },
      sendMessage: (m) => new Promise((ok) => {
        journal.push("runtime.sendMessage " + JSON.stringify(m));
        const autre = window.parent !== window && window.parent.envoyerAuWorker;
        if (autre) autre(m).then(ok); else ok({ ok: true, libelleEcran: "(simulé)" });
      }),
    },
  };
  window.envoyerAuWorker = function (msg, expediteur) {
    return new Promise((ok) => {
      for (const f of ecouteurs) if (f(msg, expediteur || {}, ok) === true) return;
    });
  };
  window.importScripts = function () {};
  window.close = function () { journal.push("popup fermé"); };
})();
