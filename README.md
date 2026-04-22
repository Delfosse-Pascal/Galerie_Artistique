# Musée Maëlle Corvain — Les Lieux Oubliés

Parcours 3D d'un musée fictif dédié à **Maëlle Corvain** (1842–1897), peintre
symboliste des ruines, des landes et des demeures abandonnées. 16 œuvres
canoniques traversant quatre périodes — *Jeunesse, Errance, Hantises, Derniers
Lieux* — plus un atelier reconstitué, une salle immersive, et jusqu'à
13 emplacements muraux supplémentaires pour vos propres images.

Rendu : Three.js (WebGL2), aucune dépendance à installer, importmap CDN.

> **Interaction** — curseur rouge en viseur toujours visible, rotation
> horizontale par edge-pan (souris près des bords → la caméra tourne). La
> caméra verticale est figée pour éviter le mal de mer. Cliquer sur un
> tableau ouvre une fiche plein écran. Panneau administration `F1`.

## Lancer le musée

### Option rapide : double-clic

```
start.bat
```

Le script :
1. régénère `images/manifest.json`, `musiques/manifest.json`, `texturegif/manifest.json` (via `scripts/gen_manifests.py`)
2. lance `python -m http.server 8080`
3. ouvre automatiquement le navigateur sur `http://localhost:8080`

### Option manuelle

```bash
# Python 3 (re-scan des dossiers)
python scripts/gen_manifests.py

# Serveur statique
python -m http.server 8080
# ou
npx serve . -p 8080
```

Puis ouvrir `http://localhost:8080` dans un navigateur récent.

## Commandes

| Action | Contrôle |
|---|---|
| Avancer / reculer | `W` / `S` ou `↑` / `↓` |
| Pas latéral | `A` / `D` ou `←` / `→` |
| Tourner (yaw) | Souris vers les bords gauche / droit |
| Zoom FOV (12°–75°) | Molette |
| Ouvrir un tableau | Clic (viser le tableau) |
| Fermer la fiche | `Esc` |
| Panneau administration | `F1` ou icône ⚙ haut-droite |
| Fermer l'administration | ✕ dans le panneau ou `Esc` |

## Contraintes respectées

- **Collisions permanentes** : AABB par mur, contrôle axe-par-axe → glissement le long des surfaces, aucun passage à travers la géométrie.
- **Hauteur humaine fixe** (1,65 m), vitesse modérée (2,4 m/s), pas de vol libre ni de clipping.
- **Caméra verticale figée** — `pitch = 0` chaque frame, plus de regard haut/bas pour éviter le mal de mer.
- **Circulation logique** : chaque salle reliée par une porte réelle (1,6 m × 2,4 m), aucune zone morte.
- **Accrochage muséographique** : toiles collées à la paroi (offset 2 cm), hauteur de regard réaliste, cartels latéraux + overlay de contexte à l'approche.
- **Aucun tableau à cheval sur un passage** — chaque emplacement a été vérifié vis-à-vis de la position des portes.
- **Scénographie** : cadres bois/or/argent/bronze (changeables), spots directionnels individuels, colonnes monumentales en R4, atelier reconstitué, cage de fer suspendue en salle immersive.
- **Éclairage moderne chaud** : downlights encastrés en grille, bandeaux cove plafond, barres linéaires murales, uplights colonnes, tone-mapping ACES Filmic.

## Panneau administration

Ouvrir avec `F1` ou l'icône ⚙. Actions disponibles :

| Section | Contrôle | Effet |
|---|---|---|
| Actions | Rafraîchir | réapplique ambiance + rafraîchit stats |
| Actions | Re-scanner dossier | recharge `texturegif/manifest.json` |
| Actions | Changer dossier | prompt pour nouveau chemin textures |
| Textures | Changer texture mur/plafond/sol | cycle dans le pool dédié à la surface (jamais cross-surface) |
| Textures | Aléatoire | tire une texture au hasard **dans chaque pool respectif** |
| Textures | Réinitialiser | retire map, revient au blanc neutre |
| Cadres | Dropdown style | Or / Argent / Bronze / Bois foncé / Noir mat / Blanc |
| Ambiance | Slider 0-100% | hemi + ambient + tone-mapping exposure |
| Zoom | Slider 0.5-2.5× | FOV caméra (`60 / zoom`) |
| Rotation tableaux | 0-3°/frame | fait tourner les toiles sur Y (défaut 0) |
| 🎵 Musique | ⏮ ▶ ⏭ | précédente / pause / suivante |
| 🎵 Musique | Aléatoire | shuffle au next |
| 🎵 Musique | Boucle | reprend une piste à la fin |
| 🎵 Musique | Slider volume | 0-100% |
| Stats | lecture seule | dossier images, nombre de tableaux / musiques / textures |

## Tiroirs médias (auto-scannés)

Placez librement vos fichiers dans ces dossiers, puis relancez `start.bat`.

| Dossier | Formats | Usage |
|---|---|---|
| `images/` | `.jpg .jpeg .png .webp` | tableaux du musée — ordre alphabétique, 29 emplacements max |
| `musiques/` | `.mp3 .ogg .wav .m4a .flac` | pistes du lecteur, démarrage aléatoire |
| `texturegif/mur/` | `.gif .jpg .jpeg .png .webp` | textures réservées aux murs |
| `texturegif/plafond/` | idem | textures réservées aux plafonds |
| `texturegif/sol/` | idem | textures réservées aux sols |
| `videos/` | — | emplacement réservé |

Le générateur `scripts/gen_manifests.py` construit les `manifest.json` correspondants que le front récupère au chargement.

**Textures cloisonnées par surface** — chaque sous-dossier `texturegif/{mur,plafond,sol}` alimente uniquement sa propre surface. Le tirage aléatoire à l'ouverture, le bouton `🎲 Aléatoire` et le cycle `Changer texture des murs/plafond/sol` restent strictement dans le pool correspondant : une texture placée dans `texturegif/sol/` ne peut jamais apparaître au plafond ou sur un mur.

Schéma du manifest `texturegif/manifest.json` :

```json
{
  "folder": "texturegif",
  "mur":     ["Mur (1).jpg", "Mur (2).jpg", "..."],
  "plafond": ["Plafond (1).gif", "..."],
  "sol":     ["Sol (1).gif", "..."]
}
```

## Emplacements de tableaux (29 slots)

- **16 canoniques** (CATALOG, catalogue fictif Corvain, avec titre / année / cartel) répartis sur r1 (Jeunesse), r2 (Errance), r3 (Hantises), r4 (Derniers Lieux)
- **13 extras** (EXTRA_SLOTS, titre auto = nom de fichier nettoyé) :
  - r1 Est/Ouest : 3+3 = 6 slots
  - r2 Est/Ouest : 1+1 = 2 slots
  - r4 Est/Ouest : 1+1 = 2 slots
  - Hall Est/Ouest : 1+1 = 2 slots
  - Salle immersive Ouest : 1 slot

Si vous dépassez 29 images, les surplus sont ignorés (warning console).

## Structure du projet

```
Galerie_Artistique/
├── index.html             # page, importmap CDN, UI (start, HUD, cartel, admin, modal)
├── start.bat              # launcher Windows (regen manifests + serveur + navigateur)
├── scripts/
│   └── gen_manifests.py   # scan images/musiques/texturegif → manifest.json
├── src/
│   ├── main.js            # boucle de rendu, scène, tone-mapping, wiring
│   ├── museum.js          # architecture : salles, couloirs, éclairage, atelier, salle immersive
│   ├── paintings.js       # catalogue + slots extras, chargement via manifest, cartels
│   ├── controls.js        # caméra FPS edge-pan + collisions AABB
│   ├── music.js           # lecteur audio, shuffle/loop/volume
│   └── admin.js           # panneau admin (textures, cadres, ambiance, musique, stats)
├── images/                # tiroir tableaux (non versionné, sauf .gitkeep + manifest.json)
├── musiques/              # tiroir audio (non versionné)
├── videos/                # tiroir vidéo (non versionné)
├── texturegif/            # tiroir textures (non versionné)
│   ├── mur/               #   → appliquées uniquement aux murs
│   ├── plafond/           #   → appliquées uniquement aux plafonds
│   └── sol/               #   → appliquées uniquement aux sols
├── muse.txt               # cahier des charges
├── .gitignore
└── README.md
```

## Plan au sol

```
                    ┌──────────────────┐
                    │  IV. Derniers    │  z 39–51, h=10 m
                    │      Lieux       │  (salle monumentale, 4 colonnes)
                    └─────────┬────────┘
                              │ porte 3,2 m
  ┌──────────┐         ┌──────┴───────┐         ┌──────────┐
  │Immersive │◄────────┤III. Hantises ├────────►│ Atelier  │  z 30–36
  │ (Gouffre)│ porte   │  z 28–36     │ porte   │          │
  │          │ x=-5    │              │ x=+5    │          │
  └──────────┘         └──────┬───────┘         └──────────┘
                              │ couloir c3
                       ┌──────┴───────┐
                       │ II. Errance  │  z 17–25
                       └──────┬───────┘
                              │ couloir c2
                       ┌──────┴───────┐
                       │ I. Jeunesse  │  z 6–14
                       └──────┬───────┘
                              │ couloir c1
                       ┌──────┴───────┐
                       │    Hall      │  z -3 à 3
                       └──────────────┘
```

## Catalogue fictif (16 œuvres canoniques)

Maëlle Corvain (1842–1897) — période romantique tardive / symbolisme noir.

- **I. Jeunesse** (salle 1) : *Lande au vent tombant* (1862), *Le chemin vers Ar-Mor* (1865), *Manoir au retour des foins* (1867), *Clairière d'octobre* (1870).
- **II. Errance** (salle 2) : *Pont brisé sur l'Enn* (1872), *Route d'Arvor sous la pluie* (1874), *Ferme abandonnée à Logoù* (1876), *Le silence des halliers* (1878).
- **III. Hantises** (salle 3) : *Demeure des Morgane* (1881), *Appel sur la lande* (1883), *Veille au seuil* (1885), *Ce qui reste d'un jardin* (1887).
- **IV. Derniers Lieux** (salle 4, monumental) : *Le grand vestibule du monde* (1890), *Nef sans offices* (1892), *Dernière fenêtre ouverte* (1895), *Les lieux oubliés* (1897, inachevée).

## Licence

Code sous MIT. Images, musiques, textures — conservées localement, non redistribuées.
