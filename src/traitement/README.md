# Traitement des données

Assemble les prévisions brutes de `collecte-api-meteo` en courbe splicée AROMEIFS, puis calcule les indicateurs du JSON quotidien.

## Courbe

À un instant *t*, on ne garde que le modèle le plus court encore disponible.

| Jeu | Enchaînement |
| --- | --- |
| `AROMEIFS` | AROMEHD → ARPEGE → IFS |

Vent moyen et rafales sont déjà en **km/h** dans les bruts (`wind_speed_10m_kmh`, `wind_gusts_10m_kmh`) : pas de conversion.

Pression de surface et chutes de neige : AROME HD ne les fournit pas toujours. Pour chaque échéance AROME sans valeur, on prend d’abord ARPEGE, sinon IFS, à la **même heure**. Les modèles réellement utilisés sont `pressure_source_model` et `snow_source_model`.

Nébulosité affichée (`cloud_cover_display_pct`) : total NEBUL si présent, sinon `max(basse, moyenne, haute × 0,25)`. Si AROME HD ne renvoie que des hauts, basse et moyenne valent **0** et on **garde AROME** (pas de repli ARPEGE/IFS). Bruts sans couches → repli sur `cloud_cover_max_pct`.

Isotherme 0 °C : absente d’AROME / ARPEGE / IFS. La collecte la lit via ICON et l’aligne sur les échéances ; `freeze_source_model` vaut `ICON`.

Créneau exploitable (écrit dans `quotidien.json`) :

- fenêtre **7 h–22 h** uniquement (vent et rafales hors de cette plage ignorés) ;
- plage où le **vent moyen interpolé > 15 km/h** ; s’il n’y en a pas de **≥ 3 h**, plage où les **rafales interpolées > 28 km/h** ;
- si plusieurs créneaux ≥ 3 h : celui **le plus proche de l’heure du max de vent moyen** de la journée ;
- bornes interpolées au franchissement du seuil, puis heure entière la plus proche (17h53 → 18h) ;
- sinon `slot_start_h` / `slot_end_h` restent `null` et `slot_label` est vide.

Icône météo : max de nébulosité **display** et de pluie sur l'heure du vent max, l'heure d'avant et celle d'après.
Température affichée : valeur à **15 h**.

## Lancer

Les bruts et les specs sont lus dans l’arbre local s’ils sont présents (copie CI), sinon via `git show collecte-api-meteo:…`. Ne pas committer `data/raw/` ni `assets/spots_specs/` sur cette branche.

```bash
python src/traitement/run.py
```

Fichiers produits :

```
data/processed/
  curves/AROMEIFS.csv
  quotidien.json
  last_update.json
```
