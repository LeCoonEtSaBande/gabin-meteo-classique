# Traitement des données

Assemble les prévisions brutes de `collecte-api-meteo` en courbe splicée AROMEIFS, puis calcule les indicateurs du JSON quotidien.

## Courbe

À un instant *t*, on ne garde que le modèle le plus court encore disponible.

| Jeu | Enchaînement |
| --- | --- |
| `AROMEIFS` | AROMEHD → ARPEGE → IFS |

Vent moyen et rafales sont déjà en **km/h** dans les bruts (`wind_speed_10m_kmh`, `wind_gusts_10m_kmh`) : pas de conversion.

Pression de surface : AROME HD ne la fournit généralement pas. Pour chaque échéance AROME sans valeur, on prend d’abord ARPEGE, sinon IFS, à la **même heure**. Le modèle réellement utilisé est stocké dans `pressure_source_model`.

Créneau exploitable (écrit dans `quotidien.json`) :

- fenêtre **7 h–22 h** uniquement (vent et rafales hors de cette plage ignorés) ;
- plage où le **vent moyen interpolé > 15 km/h** ; s’il n’y en a pas de **≥ 3 h**, plage où les **rafales interpolées > 28 km/h** ;
- si plusieurs créneaux ≥ 3 h : celui **le plus proche de l’heure du max de vent moyen** de la journée ;
- bornes interpolées au franchissement du seuil, puis heure entière la plus proche (17h53 → 18h) ;
- sinon `slot_start_h` / `slot_end_h` restent `null` et `slot_label` est vide.

Icône météo : max de nébulosité et de pluie sur l'heure du vent max, l'heure d'avant et celle d'après.
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
