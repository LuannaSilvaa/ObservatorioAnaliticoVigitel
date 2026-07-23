@echo off
setlocal
cd /d "%~dp0"
title Observatorio Vigitel - Administracao Integrada

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 AdministracaoIntegradaAoIndex.py
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    python AdministracaoIntegradaAoIndex.py
  ) else (
    echo.
    echo Python nao foi encontrado neste computador.
    echo Instale o Python 3 e marque a opcao Add Python to PATH.
    echo.
    pause
  )
)
endlocal
