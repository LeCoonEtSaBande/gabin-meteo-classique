# Gabin-meteo classique — traitement

Branche `traitement-donnees` : assemble les bruts Open-Meteo en courbe AROMEIFS et en JSON quotidien.

Vue d’ensemble : [README de `main`](https://github.com/LeCoonEtSaBande/gabin-meteo-classique/blob/main/README.md).
Détail du code : [`src/traitement/README.md`](src/traitement/README.md).

Les **spécifications de spots** et les **bruts** ne sont pas versionnés ici. Parent : `collecte-api-meteo`. En local, `src/traitement/io_raw.py` les lit via `git show` s’ils ne sont pas déjà dans l’arbre. En CI : checkout de `collecte-api-meteo` (copie de travail, non commitée).

## Pipeline

Le workflow *Traitement et affichage* (sur `main`), après une collecte réussie :

1. checkout de cette branche ;
2. copie locale de `data/raw` et `assets/spots_specs` depuis `collecte-api-meteo` (non versionnée ici) ;
3. `python src/traitement/run.py` ;
4. push de `data/processed` sur `traitement-donnees` ;
5. copie vers `affichage-web` : specs, `quotidien.json`, `last_update.json`, `AROMEIFS.csv`.

## Jeu de courbes

| Jeu | Enchaînement | Où c’est lu |
| --- | --- | --- |
| `AROMEIFS` | AROMEHD → ARPEGE → IFS | graphique unique du panneau détails |

Vent / rafales déjà en **km/h**. Créneau quotidien : vent moyen **> 15 km/h**.

Pression de surface et chutes de neige : AROME HD ne les fournit généralement pas. Pour chaque échéance AROME sans valeur, on prend d’abord ARPEGE, sinon IFS, à la **même heure**. Les modèles réellement utilisés sont `pressure_source_model` et `snow_source_model`.

Nébulosité perçue : `cloud_cover_display_pct` dans `AROMEIFS.csv` (total prioritaire, sinon max basse/moy/haute×0,25 ; AROME « hauts seuls » → bas/moy à 0, sans repli ARPEGE). Courbes et icônes s’appuient sur ce champ.

## Lancer en local

```bash
git switch traitement-donnees
pip install -r requirements.txt
python src/traitement/run.py
```

Fichiers produits (seuls ceux-ci sont commités sur cette branche) : `data/processed/curves/AROMEIFS.csv`, `quotidien.json`, `last_update.json`.
