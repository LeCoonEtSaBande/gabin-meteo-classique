# Gabin-meteo classique — affichage web

Branche `affichage-web` : site GitHub Pages du panneau de prévisions.

Site : [lecoonetsabande.github.io/gabin-meteo-classique](https://lecoonetsabande.github.io/gabin-meteo-classique/)

Vue d’ensemble du dépôt : [README de `main`](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/main/README.md).

## Rôle

Cette branche ne contient **que** le front : HTML, CSS, JS, et les copies publiées des specs / JSON / CSV. Pas de collecte ni de traitement Python.

GitHub Pages est configuré sur la **racine** de `affichage-web`.

## Interface

- Deux boutons : **Prévisions** (panneau détails) et **Balise** (bientôt disponible).
- Pas de carte SVG. Un seul spot : Portes-lès-Valence.
- Horizons **1 / 3 / 5 jours**, barre de jour en bas, vues PC et iPhone.
- Graphiques, dans l’ordre : nébulosité (fond soleil), pluie, température, vent et rafales, point de rosée, pression.
- Clic = zoom plein écran ; survol = infobulle.

## Données : copies publiées, ne pas éditer

| Fichier | Parent | Usage |
| --- | --- | --- |
| `assets/spots_specs/*.csv` | `collecte-api-meteo` | Infos spot, liens |
| `data/processed/quotidien.json` | `traitement-donnees` | Jours / horodatage |
| `data/processed/last_update.json` | `traitement-donnees` | Horodatage « MAJ » — rechargé à l’ouverture |
| `data/processed/curves/AROMEIFS.csv` | `traitement-donnees` | Graphiques |

Modifier le spot uniquement sur `collecte-api-meteo`.

## Fichiers JS

| Fichier | Rôle |
| --- | --- |
| `js/quotidien.js` | modes, navigation des jours, cache local |
| `js/detail.js` | panneau, specs, chargement du CSV |
| `js/courbes.js` | rendu SVG des six graphiques |
| `js/csv.js` | parseur CSV `;` |
| `js/session.js` | couleurs, flèche |

## Servir en local

```bash
git switch affichage-web
python -m http.server 8080
```

Ouvrir `http://127.0.0.1:8080/`.
