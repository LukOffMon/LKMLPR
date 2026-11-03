# CandyOS — Optimizador competitivo para Fortnite y Valorant

Manual público: **https://lukoffmon.github.io/LKMLPR/candyos/**

CandyOS es un único script de PowerShell con interfaz ASCII que:

1. **Diagnostica** (más de 45 comprobaciones): hardware (monitor conectado a la placa base, Hz, XMP/EXPO, single channel, discos, drivers), Windows, red (ping a las 8 regiones de Fortnite, jitter, pérdida, DNS, MTU, bufferbloat y velocidad) y juegos (Fortnite y Valorant/Vanguard). Da una puntuación de 0 a 100 y recomendaciones ordenadas por impacto.
2. **Optimiza** con 13 ajustes reversibles (punto de restauración y copia del valor original de cada cambio).
3. **Perfiles de juego**: 3 perfiles para el `GameUserSettings.ini` de Fortnite y una guía competitiva para Valorant.
4. **Modo Enfoque**: 9 ajustes temporales de sesión que se revierten solos al reiniciar o al volver a iniciar sesión.
5. **Limpia** basura (13 categorías, primero analiza y luego borra; nunca sigue enlaces simbólicos).
6. **Centraliza** 20 herramientas externas vía `winget`.

## Uso

```powershell
powershell -ExecutionPolicy Bypass -File .\CandyOS.ps1
```

O en una Terminal (Administrador):

```powershell
iex ((New-Object Net.WebClient).DownloadString('https://lukoffmon.github.io/LKMLPR/candyos/CandyOS.ps1'))
```

`-Mode`: `Menu`, `Diagnose`, `QuickDiagnose`, `Optimize`, `Games`, `Fortnite`, `Valorant`, `Clean`, `Startup`, `Focus`, `FocusStop`, `Monitor`, `Tools`, `Undo`.

## Datos

- Copias de seguridad, estado y log: `C:\ProgramData\CandyOS`
- Informes: `Documentos\CandyOS\Reportes`

## Seguridad

No modifica archivos de los juegos, no toca sus procesos ni los anti-cheat (Easy Anti-Cheat / Riot Vanguard). No desactiva Defender, no aplica hacks de bcdedit/timer ni otros tweaks placebo.

© 2026 LukOffMon. Todos los derechos reservados. Fortnite es una marca de Epic Games; VALORANT es una marca de Riot Games. Proyecto independiente, sin afiliación.
