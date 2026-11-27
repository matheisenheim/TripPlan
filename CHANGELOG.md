# Changelog

Toutes les modifications notables de TripPlan sont documentées dans ce fichier.
Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
versionnage suit le [versionnage sémantique](https://semver.org/lang/fr/).

> Ce changelog démarre rétroactivement à la release v1.0.1 : les versions
> antérieures n'en avaient pas. La section [1.0.1] est reconstituée depuis
> l'historique git et les pull requests fusionnées.

## [Non publié]

### Ajouté
- Mode local hors connexion : sans fichier Google Drive connecté, la base de voyages est lue et écrite dans le localStorage du navigateur
- Carte hors ligne (PMTiles) sur le web : le fichier `.pmtiles` est choisi via le sélecteur local, stocké en IndexedDB et servi en mémoire — la carte fonctionne sans aucun réseau
- Bouton « Vue par défaut » dans l'onglet Carte : enregistre le centre et le zoom actuels comme vue de démarrage de la carte
- Choix du lieu affiché par défaut sur la carte à la création d'un voyage (champ « Lieu affiché par défaut sur la carte » du formulaire « Nouveau voyage ») : remplace le repli en dur centré sur le Japon

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
