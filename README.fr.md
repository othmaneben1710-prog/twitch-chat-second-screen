# Chat sur second écran pour Twitch

🇬🇧 [English version](README.md)

Une extension pour Chrome et Edge. Tu regardes le live en plein écran sur un écran, et le chat Twitch s'ouvre en grand sur ton deuxième écran. Tu peux le lire et y écrire pendant que la vidéo reste en plein écran.

L'extension ne refait pas le chat : elle ouvre le chat « popout » officiel de Twitch. Tu y es donc connecté avec ton compte, comme d'habitude.

L'interface est disponible en 20 langues et suit automatiquement la langue du navigateur.

> Projet indépendant, non affilié à Twitch ni à Amazon.

## Installer l'extension (une seule fois)

1. Récupère l'extension, au choix :
   - télécharge `twitch-chat-second-screen.zip` depuis la page **Releases** du projet, puis décompresse-le dans un dossier ;
   - ou garde le dossier du projet tel quel.

   Range ce dossier quelque part où tu ne le supprimeras pas, par exemple dans Documents : le navigateur lit l'extension directement depuis ce dossier.
2. Ouvre la page des extensions :
   - dans **Chrome**, tape `chrome://extensions` dans la barre d'adresse ;
   - dans **Edge**, tape `edge://extensions`.
3. Active le **Mode développeur** : c'est un interrupteur en haut à droite dans Chrome, ou à gauche dans Edge.
4. Clique sur **Charger l'extension non empaquetée** et choisis le dossier qui contient `manifest.json`.
5. Clique sur la pièce de puzzle 🧩 à côté de la barre d'adresse, puis épingle « Chat sur second écran pour Twitch » pour garder son icône visible.
6. Si une page Twitch était déjà ouverte, recharge-la avec **F5**.

## S'en servir

1. Va sur la page d'une chaîne, par exemple `https://www.twitch.tv/nom-de-la-chaine`.
2. Lance l'extension avec **une** de ces trois méthodes :
   - clique sur le bouton violet **« Chat sur l'autre écran »**, en haut à droite du lecteur vidéo ;
   - ou appuie sur **Alt + Maj + C** ;
   - ou clique sur l'icône de l'extension, puis sur **« Ouvrir le chat sur l'autre écran »**.
3. Le chat s'ouvre en grand sur l'autre écran, et le live passe en plein écran.
   - Si tu passes par l'icône de l'extension, le navigateur interdit de lancer le plein écran tout seul. Un bouton **« Passer en plein écran »** apparaît alors sur la page Twitch : clique dessus.
4. Clique dans le chat sur l'autre écran pour écrire. Le live doit rester en plein écran.
5. Si le plein écran s'arrête quand même, un petit message **« Revenir en plein écran »** apparaît en bas du live : clique dessus.

Si tu changes de chaîne et que tu relances l'extension, elle réutilise la même fenêtre de chat au lieu d'en ouvrir une nouvelle.

### Choisir l'écran du chat

Clique sur l'icône de l'extension. Dans « Écran du chat » :

- **Automatique** : le chat va sur un écran **différent** de celui où se trouve le live. C'est le réglage par défaut.
- **Écran 1, Écran 2…** : le chat va toujours sur cet écran. Ton choix est enregistré pour les prochaines fois. L'écran où se trouve le live est marqué « — écran du live ».

Si l'écran choisi n'est plus branché, l'extension repasse toute seule en mode automatique.

### Avec un seul écran

Le chat s'ouvre quand même, dans une fenêtre à part, et un message te prévient. Le plein écran va le cacher : utilise **Alt + Tab** pour passer de l'un à l'autre.

## Problèmes fréquents

- **Le bouton violet n'apparaît pas** : recharge la page avec F5. Le bouton n'apparaît que sur la page d'une chaîne qui contient un lecteur vidéo, pas sur l'accueil ni dans les catégories.
- **« L'extension a été mise à jour : recharge la page »** : appuie sur F5. Ce message s'affiche quand l'extension a été rechargée pendant que la page Twitch était ouverte.
- **Le chat s'ouvre sur le mauvais écran** : choisis le bon écran dans le menu de l'extension.

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `manifest.json` | Description de l'extension (Manifest V3) |
| `_locales/` | Textes de l'interface, un dossier par langue |
| `service-worker.js` | Ouvre la fenêtre du chat sur le bon écran, puis l'agrandit |
| `content.js`, `content.css` | Bouton sur la page Twitch, raccourci clavier, plein écran, messages |
| `popup.html`, `popup.js`, `popup.css` | Menu de l'extension |
| `lib/ecrans.js` | Choix de l'écran et lecture de l'adresse Twitch (sans API Chrome, donc testable) |
| `icons/` | Icônes |
| `tests/` | Tests, non inclus dans le ZIP. `tests.html` marche en double-cliquant dessus ; les deux simulations ont besoin d'un petit serveur local ; `verifier-langues.ps1` contrôle les traductions |

Autorisations demandées : `system.display` pour connaître tes écrans, `storage` pour retenir l'écran choisi, et l'accès à `www.twitch.tv` uniquement.

## Licence

MIT, voir [LICENSE](LICENSE).
