@echo off
REM ============================================================
REM  Musee Maelle Corvain — lancement local
REM  - se place dans le dossier du projet
REM  - ouvre le navigateur sur http://localhost:8080
REM  - demarre le serveur Python (Ctrl+C pour arreter)
REM ============================================================

cd /d "%~dp0"

REM Ouvre le navigateur dans 2 s (le temps que le serveur demarre)
start "" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8080"

echo.
echo  === Galerie Artistique — serveur HTTP sur le port 8080 ===
echo  Ctrl+C pour arreter, puis fermer cette fenetre.
echo.

python -m http.server 8080
