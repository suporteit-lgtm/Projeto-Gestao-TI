@echo off
"C:\Program Files\Git\cmd\git.exe" add .
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: exibir nome da unidade no cabecalho do painel"
"C:\Program Files\Git\cmd\git.exe" push origin main
if %errorlevel% equ 0 (
    echo Push realizado com sucesso!
) else (
    echo Erro ao fazer push.
)
pause
