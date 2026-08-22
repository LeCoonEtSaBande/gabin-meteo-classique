# Gabin-meteo classique

Prévisions météo (Sauze, Lyon, Hyères, Méribel) : collecte Open-Meteo, courbes AROMEIFS, panneau web.

Site public : [lecoonetsabande.github.io/gabin-meteo-classique](https://lecoonetsabande.github.io/gabin-meteo-classique/)

Page multisite : [gabin-meteo-multisite.html](https://lecoonetsabande.github.io/gabin-meteo-classique/gabin-meteo-multisite.html)

Dérivé de [gabin-meteo](https://github.com/LeCoonEtSaBande/gabin-meteo) (carte multi-spots). Ce dépôt ne le modifie pas.

## Branches

Ce dépôt n’est **pas** un historique unique fusionné dans `main`. Chaque branche a son rôle ; elles partagent seulement le commit d’initialisation.

| Branche | Contenu | README détaillé |
| --- | --- | --- |
| `main` | Workflows GitHub Actions (cron et enchaînement). Pas de données métier. | ce fichier |
| `collecte-api-meteo` | Script Python, CSV bruts Open-Meteo, **specs parentes** des spots | [README](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/collecte-api-meteo/README.md) |
| `traitement-donnees` | Courbe splicée et JSON quotidien (**parent** de `data/processed`) | [README](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/traitement-donnees/README.md) |
| `affichage-web` | Site GitHub Pages (copies publiées + front) | [README](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/affichage-web/README.md) |

Les PR d’interface ciblent `affichage-web`. Collecte et traitement ciblent leur branche. `main` ne reçoit que les workflows et la doc d’ensemble.

## Source unique des données

Chaque jeu a **un seul fichier parent**. Les autres branches ne l’éditent pas : elles le lisent, ou le workflow le recopie.

| Donnée | Parent (à éditer) | Transit |
| --- | --- | --- |
| Spot (`assets/spots_specs/*.csv`) | `collecte-api-meteo` | Lues par le traitement (checkout / `git show`). Recopiées vers `affichage-web` à chaque run |
| Prévisions brutes (`data/raw/`) | `collecte-api-meteo` | Lues par le traitement, jamais versionnées ailleurs |
| Courbe et JSON quotidien (`data/processed/`) | `traitement-donnees` | Recopiés vers `affichage-web` (`quotidien.json`, `last_update.json`, `AROMEIFS.csv`) |

Sur `affichage-web`, `assets/spots_specs/` et `data/processed/` sont des **copies publiées** pour GitHub Pages. Ne pas les modifier à la main. `traitement-donnees` ne versionne pas les specs ni les bruts.

## Pipeline (2 fois par jour)

Heures **Europe/Paris** : **6h** et **19h** (deux crons UTC sur `main` pour CEST et CET).

```
main : Collecte Open-Meteo
        → checkout collecte-api-meteo, fetch Open-Meteo, push data/raw
main : Traitement et affichage  (après un run de collecte réussi)
        → checkout traitement-donnees + bruts/specs (sans les committer)
        → python src/traitement/run.py
        → push data/processed sur traitement-donnees
        → copie specs, JSON et courbe AROMEIFS sur affichage-web
GitHub Pages  (source : racine de affichage-web, ou Actions)
```

Le site recharge `last_update.json` à l’ouverture : s’il a changé, le JSON quotidien est retéléchargé (même cache local que gabin-meteo).

Déclenchement manuel : Actions → *Collecte Open-Meteo* (`force` ignore le filtre horaire) ou *Traitement et affichage*.

## Données

- **4 spots** : Ferme de Sauze, Lyon, Hyères, Méribel.
- **3 modèles** Open-Meteo pour la courbe : AROMEHD, ARPEGE, IFS. Grilles les plus proches renseignées dans le CSV parent.
- **Une seule courbe** `AROMEIFS` : AROMEHD → ARPEGE → IFS (chaque modèle jusqu’à son horizon).
- Variables : nébulosité, précipitation, chutes de neige, température 2 m, vent / rafales / direction (km/h), point de rosée 2 m, pression de surface, isotherme 0 °C.
- Pression et neige absentes d’AROME HD : repli **ARPEGE puis IFS** sur les créneaux AROME.
- Isotherme 0 °C : absente d’AROME / ARPEGE / IFS ; collectée via **ICON** et alignée sur les échéances.

| Jeu | Enchaînement court → long terme | Usage |
| --- | --- | --- |
| `AROMEIFS` | AROMEHD → ARPEGE → IFS | graphique unique du panneau Détails |

## Site

- Page Sauze : boutons **Prévisions** / **Balise**. Graphiques : pluie, nébulosité, température, vent, rosée, pression.
- Page **gabin-meteo-multisite** : boutons Lyon / Hyères / Méribel. Sans rosée ni pression. Méribel ajoute neige et isotherme 0 °C.
- Pas de carte SVG. Vues PC et iPhone, barre de jour, horizons 1 / 3 / 5 jours.
- Clic = zoom plein écran ; survol = infobulle détaillée.

## Lancer en local

Collecte et traitement se lancent depuis le checkout de **leur** branche, pas depuis `main` :

```bash
git switch collecte-api-meteo
pip install -r requirements.txt
python src/collecte/run.py --force

git switch traitement-donnees
python src/traitement/run.py
```

Pour le site : checkout `affichage-web` et servir la racine (`python -m http.server 8080`).
