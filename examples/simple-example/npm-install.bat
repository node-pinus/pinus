::npm-install.bat
@echo off
::install web server dependencies && game server dependencies
cd web-server && yarn && cd .. && cd game-server && yarn