# Musée Maëlle Corvain — Les Lieux Oubliés

Parcours 3D d'un musée fictif dédié à **Maëlle Corvain** (1842–1897), peintre
symboliste des ruines, des landes et des demeures abandonnées. Seize œuvres
traversant quatre périodes — *Jeunesse, Errance, Hantises, Derniers Lieux* —
plus un atelier reconstitué et une salle immersive.

Rendu : Three.js (WebGL2), aucune dépendance à installer, importmap CDN.

> **Mode visibilité pastel (temporaire)** — palette pastel par salle et
> éclairage ambiant poussé pour l'inspection. Le mode cinématique sombre
> sera restauré ultérieurement.

## Lancer le musée

Serveur statique local requis (CORS exige `http://`, pas `file://`) :

```bash
# Python 3
python -m http.server 8080

# ou Node
npx serve . -p 8080
```

Puis ouvrir `http://localhost:8080` dans un navigateur récent (Chrome, Edge, Firefox).

## Commandes

| Action | Touche |
|---|---|
| Verrouiller la souris | Clic sur le canvas |
| Tourner (yaw) | Souris X |
| Regarder haut / bas (pitch) | Souris Y |
| Avancer / reculer (souris) | `Shift` + Souris Y |
| Avancer / reculer (clavier) | `W` / `S` ou `↑` / `↓` |
| Déplacement latéral | `A` / `D` ou `←` / `→` |
| Zoom puissant (FOV 12°–75°) | Molette |
| Libérer la souris | `Esc` |

## Contraintes respectées

- **Collisions permanentes** : AABB par mur, contrôle axe-par-axe → glissement le long des surfaces, aucun passage à travers la géométrie. Si la caméra touche un mur, le mouvement dans cette direction est bloqué ; elle ne peut repartir que sur un autre axe.
- **Hauteur humaine fixe** (1,65 m), vitesse modérée (2,4 m/s), pas de vol libre ni de clipping.
- **Circulation logique** : chaque salle est reliée par une porte réelle (1,6 m × 2,4 m), aucune zone morte.
- **Accrochage muséographique** : toiles collées à la paroi (offset 2 cm), hauteur de regard réaliste, cartels latéraux + overlay de contexte à l'approche (< 3 m, caméra orientée face à l'œuvre).
- **Scénographie** : cadres bois sombre, spots directionnels individuels, bancs, colonnes monumentales en R4, atelier reconstitué (chevalet + table + palette + chaise), cage de fer suspendue en salle immersive.
- **Éclairage moderne chaud (aucun suspendu)** : downlights encastrés en grille, bandeaux cove plafond, barres linéaires murales, uplights au pied des colonnes, bande LED continue en couloirs, tone-mapping ACES Filmic.

## Palette pastel par salle (mode visibilité)

| Salle | Teinte mur | Rôle |
|---|---|---|
| Hall d'entrée | crème | accueil, bureau |
| I. Jeunesse | **pêche** | période lumineuse (1862–1870) |
| II. Errance | **bleu** | période d'exil (1871–1879) |
| III. Hantises | **mauve** | période sombre (1880–1888) |
| Atelier | **jaune** | reconstitution de travail |
| Salle immersive | **menthe** | installation *Le Gouffre* |
| IV. Derniers Lieux | **rose** | salle monumentale (1889–1897) |
| Couloirs | beige | transitions |

## Structure

```
Galerie_Artistique/
├── index.html           # page, importmap CDN, UI (overlay cartel, HUD, start panel)
├── src/
│   ├── main.js          # boucle de rendu, scène, tone-mapping, label de salle
│   ├── museum.js        # architecture : salles, couloirs, matériaux pastel,
│   │                    #   luminaires modernes, atelier, salle immersive
│   ├── paintings.js     # catalogue fictif, placement, cadres, cartels
│   └── controls.js      # caméra FPS pointer-lock + collisions AABB
├── images/              # 16 toiles haunted01..16.jpg (non versionnées)
├── videos/              # tiroir média (non versionné)
├── musiques/            # tiroir média (non versionné)
├── muse.txt             # cahier des charges
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
  │ (Gouffre)│ porte   │  z 28–36     │ porte   │ (jaune)  │
  │ (menthe) │ x=-5    │  (mauve)     │ x=+5    │          │
  └──────────┘         └──────┬───────┘         └──────────┘
                              │ couloir c3
                       ┌──────┴───────┐
                       │ II. Errance  │  z 17–25 (bleu)
                       └──────┬───────┘
                              │ couloir c2
                       ┌──────┴───────┐
                       │ I. Jeunesse  │  z 6–14 (pêche)
                       └──────┬───────┘
                              │ couloir c1
                       ┌──────┴───────┐
                       │    Hall      │  z -3 à 3 (crème)
                       └──────────────┘
```

## Catalogue fictif (16 œuvres)

Maëlle Corvain (1842–1897) — période romantique tardive / symbolisme noir.

- **I. Jeunesse** (salle 1) : *Lande au vent tombant* (1862), *Le chemin vers Ar-Mor* (1865), *Manoir au retour des foins* (1867), *Clairière d'octobre* (1870).
- **II. Errance** (salle 2) : *Pont brisé sur l'Enn* (1872), *Route d'Arvor sous la pluie* (1874), *Ferme abandonnée à Logoù* (1876), *Le silence des halliers* (1878).
- **III. Hantises** (salle 3) : *Demeure des Morgane* (1881), *Appel sur la lande* (1883), *Veille au seuil* (1885), *Ce qui reste d'un jardin* (1887).
- **IV. Derniers Lieux** (salle 4, monumental) : *Le grand vestibule du monde* (1890), *Nef sans offices* (1892), *Dernière fenêtre ouverte* (1895), *Les lieux oubliés* (1897, inachevée).

## Licence

Code sous MIT. Images `images/haunted*.jpg` conservées localement, non redistribuées.
