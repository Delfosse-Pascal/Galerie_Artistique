"""
Genere les manifest.json pour les dossiers images/, musiques/ et texturegif/.
Lance par start.bat avant le serveur HTTP, donc toute nouvelle image / musique
ajoutee dans le dossier est detectee a chaque demarrage du musee.
"""
import os, glob, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def gen(folder, patterns):
    out = []
    for pat in patterns:
        for f in glob.glob(os.path.join(ROOT, folder, pat)):
            name = os.path.basename(f)
            if name == 'manifest.json' or name == '.gitkeep':
                continue
            out.append(name)
    out = sorted(set(out), key=str.lower)
    path = os.path.join(ROOT, folder, 'manifest.json')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump({'folder': folder, 'items': out}, fh, ensure_ascii=False, indent=2)
    print(f'  {folder:<12} -> {len(out)} fichier(s)')

def gen_textures():
    """Scan texturegif/{mur,plafond,sol} and write texturegif/manifest.json."""
    TEX_EXT = ('*.gif', '*.jpg', '*.jpeg', '*.png', '*.webp')
    out = {'folder': 'texturegif'}
    for sub in ('mur', 'plafond', 'sol'):
        files = []
        for pat in TEX_EXT:
            for f in glob.glob(os.path.join(ROOT, 'texturegif', sub, pat)):
                files.append(os.path.basename(f))
        out[sub] = sorted(set(files), key=str.lower)
        print(f'  texturegif/{sub:<7} -> {len(out[sub])} fichier(s)')
    path = os.path.join(ROOT, 'texturegif', 'manifest.json')
    with open(path, 'w', encoding='utf-8') as fh:
        json.dump(out, fh, ensure_ascii=False, indent=2)

if __name__ == '__main__':
    print('Generation des manifests...')
    gen('images',   ['*.jpg', '*.jpeg', '*.png', '*.webp'])
    gen('musiques', ['*.mp3', '*.ogg', '*.wav', '*.m4a', '*.flac'])
    gen_textures()
    print('OK.')
