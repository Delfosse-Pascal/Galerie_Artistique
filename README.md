# Musée Maëlle Corvain — Les Lieux Oubliés

Parcours 3D d'un musée fictif dédié à **Maëlle Corvain** (1842–1897), peintre
symboliste des ruines, des landes et des demeures abandonnées. Seize œuvres
traversant quatre périodes — *Jeunesse, Errance, Hantises, Derniers Lieux* —
plus un atelier reconstitué et une salle immersive.

Rendu : Three.js (WebGL2), aucune dépendance à installer, importmap CDN.

## Lancer le musée

Serveur statique local (CORS exige `http://`, pas `file://`) :

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
| Regarder haut/bas (pitch) | Souris Y |
| Avancer / reculer (souris) | Shift + Souris Y |
| Avancer / reculer (clavier) | `W` / `S` ou `↑` / `↓` |
| Déplacement latéral | `A` / `D` ou `←` / `→` |
| Zoom (FOV) | Molette |
| Libérer la souris | `Esc` |

## Contraintes respectées

- **Collisions** : AABB par mur, contrôle axe-par-axe → glissement le long des surfaces, aucun passage à travers la géométrie.
- **Hauteur humaine fixe** (1,65 m), vitesse modérée (2,4 m/s), pas de vol libre.
- **Circulation logique** : chaque salle est reliée par une porte réelle, aucune zone morte.
- **Accrochage** : toiles collées à la paroi (offset 2 cm), hauteur de regard réaliste, cartels latéraux + overlay de contexte à l'approche.
- **Éclairage** : ACES filmic tone-mapping, puits de lumière zénithaux, spots directionnels par œuvre, appliques chaudes en couloirs, ambiance froide en salle immersive.

## Structure

```
Galerie_Artistique/
├── index.html          # page + importmap + UI
├── src/
│   ├── main.js         # boucle de rendu, orchestration
│   ├── museum.js       # architecture (salles, couloirs, matériaux, lumières)
│   ├── paintings.js    # catalogue, placement, cartels
│   └── controls.js     # caméra FPS + collisions AABB
├── images/             # 16 toiles haunted01..16.jpg
├── muse.txt            # cahier des charges
└── README.md
```

## Plan au sol

```
                    ┌──────────────────┐
                    │  IV. Derniers    │  z 39–51, h=10 m
                    │      Lieux       │  (salle monumentale)
                    └─────────┬────────┘
                              │
  ┌──────────┐         ┌──────┴───────┐         ┌──────────┐
  │Immersive │◄────────┤ III. Hantises├────────►│ Atelier  │
  │ (Gouffre)│         │  z 28–36     │         │          │
  └──────────┘         └──────┬───────┘         └──────────┘
                              │
                       ┌──────┴───────┐
                       │ II. Errance  │  z 17–25
                       └──────┬───────┘
                              │
                       ┌──────┴───────┐
                       │ I. Jeunesse  │  z 6–14
                       └──────┬───────┘
                              │
                       ┌──────┴───────┐
                       │    Hall      │  z -3 à 3
                       └──────────────┘
```

## Licence

Images : `images/haunted*.jpg` conservées localement ; code sous MIT.
