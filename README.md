# Gabin-meteo classique — affichage web

Branche `affichage-web` : site GitHub Pages du panneau de prévisions.

Site : [lecoonetsabande.github.io/gabin-meteo-classique](https://lecoonetsabande.github.io/gabin-meteo-classique/)

Multisite : [gabin-meteo-multisite.html](https://lecoonetsabande.github.io/gabin-meteo-classique/gabin-meteo-multisite.html)

Vue d’ensemble du dépôt : [README de `main`](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/main/README.md).

## Rôle

Cette branche ne contient **que** le front : HTML, CSS, JS, et les copies publiées des specs / JSON / CSV. Pas de collecte ni de traitement Python.

GitHub Pages est configuré sur la **racine** de `affichage-web`.

## Pages

- `index.html` — Ferme de Sauze. Boutons **Prévisions** et **Balise**. Graphiques : pluie, nébulosité, température, vent, point de rosée, pression. Infos vent AROMEHD / ARPEGE / IFS.
- `gabin-meteo-multisite.html` — Lyon, Hyères, Méribel. Trois boutons de site, pas de balise. Infos : « Mise à jour quotidienne a 6h30 et 19h30 » (sans exigences vent). Graphiques : pluie, nébulosité, température, vent. À Méribel : chutes de neige sous la nébulosité, isotherme 0 °C sous la température.

Horizons **1 / 3 / 5 jours**, barre de jour en bas, vues PC et iPhone. Clic = zoom plein écran ; survol = infobulle.

## Données : copies publiées, ne pas éditer

| Fichier | Parent | Usage |
| --- | --- | --- |
| `assets/spots_specs/*.csv` | `collecte-api-meteo` | Infos spots |
| `data/processed/quotidien.json` | `traitement-donnees` | Jours / horodatage |
| `data/processed/last_update.json` | `traitement-donnees` | Horodatage « MAJ » — rechargé à l’ouverture |
| `data/processed/curves/AROMEIFS.csv` | `traitement-donnees` | Graphiques |

Modifier les spots uniquement sur `collecte-api-meteo`.

## Fichiers JS

| Fichier | Rôle |
| --- | --- |
| `js/quotidien.js` | modes / sites, navigation des jours, cache local |
| `js/detail.js` | panneau, specs, chargement du CSV |
| `js/courbes.js` | rendu SVG des graphiques |
| `js/csv.js` | parseur CSV `;` |
| `js/session.js` | couleurs, flèche |

## Servir en local

```bash
git switch affichage-web
python -m http.server 43141
```

Ouvrir `http://127.0.0.1:43141/` ou `/gabin-meteo-multisite.html`.
