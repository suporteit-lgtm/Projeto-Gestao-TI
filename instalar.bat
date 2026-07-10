@echo off
chcp 65001 >nul
title Inventario T.I. - Instalacao (primeira vez)
echo ==========================================================
echo   INVENTARIO DE T.I. - Instalacao (rodar so uma vez)
echo ==========================================================
echo.

echo [1/3] Instalando dependencias do BACKEND (pode demorar)...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 goto erro

echo.
echo [2/3] Criando o banco de dados e dados de exemplo...
call npm run setup
if errorlevel 1 goto erro

echo.
echo [3/3] Instalando dependencias do FRONTEND...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 goto erro

echo.
echo ==========================================================
echo   PRONTO! Agora e so dar duplo-clique em: iniciar.bat
echo ==========================================================
pause
exit /b 0

:erro
echo.
echo *** Ocorreu um erro na instalacao. Verifique se o Node.js esta instalado. ***
pause
exit /b 1
