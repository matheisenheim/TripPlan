# Changelog

Toutes les modifications notables de TripPlan sont documentées dans ce fichier.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
versionnage suit le [versionnage sémantique](https://semver.org/lang/fr/).

> Ce changelog démarre rétroactivement à la release v1.0.1 : les versions
> antérieures n'en avaient pas. La section [1.0.1] est reconstituée depuis
> l'historique git et les pull requests fusionnées.

## [Non publié]

### Ajouté
- Export / import de la base de voyages en JSON depuis les paramètres (⚙ → Base de voyages) : en mode local la base vit dans le navigateur, donc vider les données du site la fait disparaître — exporter régulièrement pour garder une sauvegarde
- Connexion Google Drive simplifiée : coller le lien ou l'ID du fichier dans ⚙ (« Connecter ce fichier », `utils/driveLink.ts`) — seul `VITE_GOOGLE_CLIENT_ID` est requis ; le Picker (clé API + n° de projet) devient optionnel
- Onglet Activités : bouton « Événements » listant les événements **Google Calendar** d'une date choisie, filtrable par ville (étapes du voyage), chaque événement ajoutable en activité planifiée (date + heure) d'un clic. Scope `calendar` (lecture+écriture) à la place de `calendar.readonly` — à ré-autoriser à la prochaine connexion Google
- Onglet Activités : bouton « ✨ Propositions » — catalogue d'activités embarquées (`src/data/activitySuggestions.ts`, éditable), filtrable par ville, ajoutables au voyage en un clic
- Bouton « Ajouter à Google Agenda » sur les activités planifiées (crée l'événement dans le calendrier principal ; la carte passe alors à « Agenda ✓ » pour pouvoir le retirer). Nouveau champ `Activity.calendarEventId` ; scope OAuth passé à `calendar` (lecture + écriture) — à ré-autoriser à la prochaine connexion Google

### Modifié
- Numéro de version automatique à chaque déploiement : `major.minor.<nb de commits>` (ex. 1.1.33) via `scripts/version.mjs` injecté dans `__APP_VERSION__` — plus de bump manuel de package.json ; `fetch-depth: 0` en CI pour l'historique complet
- PWA installable : `manifest.webmanifest` + icônes PNG (192/512/maskable/180, générées par `npm run icons`) + service worker existant → Chrome mobile propose « Installer l'application » ; le SW met en cache toutes les ressources same-origin (manifest, icônes inclus)

### Corrigé
- Afficheur d'erreurs JS (`index.html`) : les erreurs de chargement de ressources (event `error` sur une balise, « undefined:0:0 ») s'affichent en bandeau discret avec l'URL (« Ressource introuvable : … ») ; les vraies erreurs JS gardent le bandeau rouge avec stack
- `index.html` : indicateur « Chargement de TripPlan… » tant que le JS n'a pas démarré (retiré par `main.tsx` au montage) — permet de distinguer page blanche « HTML servi mais JS bloqué » vs « rien ne répond »

## [1.1.0] - 2026-11-27

### Ajouté
- Mode local hors connexion : sans fichier Google Drive connecté, la base de voyages est lue et écrite dans le localStorage du navigateur
- Carte hors ligne (PMTiles) sur le web : le fichier `.pmtiles` est choisi via le sélecteur local, stocké en IndexedDB et servi en mémoire — la carte fonctionne sans aucun réseau
- Bouton « Vue par défaut » dans l'onglet Carte : enregistre le centre et le zoom actuels comme vue de démarrage de la carte
- Sélection d'un lieu directement sur la carte (pin au tap) depuis le champ coordonnées (« Choisir sur la carte ») — fonctionne hors connexion : carte PMTiles si connectée, style en ligne sinon, fond neutre au pire ; le nom du lieu (reverse geocoding) n'est renseigné qu'avec internet
- Suite de tests Vitest + Testing Library (19 tests, `npm test`, exécutée en CI) incluant un smoke test de démarrage de l'app (anti page blanche), le mode local de `useDatabase`, les préférences de vue carte, le stockage local et la validation/migration des données
- `index.html` : meta no-cache pour éviter qu'un HTML trop vieux (servi en cache par GitHub Pages) ne référence des assets hashés supprimés au déploiement suivant (cause de page blanche)
- Service worker (`public/sw.js`, enregistré en production) : navigations en network-first avec repli cache — un `index.html` périmé en cache navigateur est revalidé sur le réseau à chaque ouverture, ce qui élimine les pages blanches après un déploiement ; les assets hashés restent en cache-first ; l'app reste utilisable hors ligne après la première visite
- Convertisseur de devises (onglet Ressources) : USD ($) et GBP (£) ajoutés à côté d'EUR et JPY — sélecteurs de devise de départ/arrivée, bouton pour inverser, taux croisés depuis les taux BCE pour 1 € (cache hors ligne conservé)
- Choix du lieu affiché par défaut sur la carte à la création d'un voyage (champ « Lieu affiché par défaut sur la carte » du formulaire « Nouveau voyage ») : remplace le repli en dur centré sur le Japon

### Corrigé
- Champ coordonnées : les champs Latitude/Longitude ne s'affichent plus une fois un lieu choisi dans les résultats de recherche (le lieu choisi est affiché, avec un bouton « Effacer ») ; le lien « Lieu introuvable ? » est renommé « Saisir les coordonnées manuellement » pour ne plus ressembler à un message d'erreur
- Page blanche sur mobile : si la création de la carte MapLibre échoue (ex. WebGL indisponible) dans un `useEffect`, React 19 démontait tout l'arbre — la création est désormais protégée et affiche un fallback « Carte indisponible » (les autres onglets restent utilisables) ; les erreurs JS sont aussi affichées à l'écran via un gestionnaire inline dans `index.html` (debug mobile)
- Page blanche après création d'un voyage sans étape : `fitBounds` n'est plus appelé sur un `LngLatBounds` vide (crash `reading 'lng'` dans MapLibre)
- Champ coordonnées : les champs Latitude/Longitude sont supprimés ; le lieu choisi reste affiché dans le champ de recherche (sans relancer la recherche), avec un bouton « Effacer le lieu »

### Modifié
- Projet renommé Japplan → TripPlan (titre de l'onglet, nom du package, README, page de confidentialité, pied des paramètres)
- Base path du déploiement GitHub Pages ajusté à `/TripPlan/`

### Supprimé
- Partie application Android (dossier `android/`, configuration Capacitor, build APK, jobs CI associés) : TripPlan est désormais une application 100 % web

## [1.0.1] - 2026-09-10

Première release publique de l'application (issue de `PierreDamienC/japplan`).

### Ajouté
- Application de suivi de voyage : carte interactive (MapLibre GL), planning par étape et par jour, liste d'activités, onglet Ressources
- Convertisseur de devises EUR ↔ JPY en haut de l'onglet Ressources
- Carte hors ligne sur Android via un fichier PMTiles (lecture SAF par plages d'octets)
- Synchronisation de la base Google Drive entre plusieurs utilisateurs : détection des changements distants (polling) et fusion des conflits (#5)
- Pipeline de versioning et de migration de la base Drive (`schemaVersion`) (#4)
- Versioning unifié entre l'app web, l'app Android et la base Drive (#7)
- Catégorie « Souvenirs » et prise en charge des activités multi-catégories

### Corrigé
- CVE XSS critique dans maplibre-gl : bump en 6.8.0 (#1)
- Carte blanche sur GitHub Pages : le worker maplibre-gl et son chunk partagé sont copiés ensemble dans `public/` (#2)
- Initialisation de la base avec une structure minimale quand le fichier Drive est vide (#3)
- Revérification serveur forcée sur les lectures Drive côté Android (#6)
- CVE-2026-103922 de Capacitor et installation du SDK Android en CI
