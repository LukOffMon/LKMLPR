<#
.SYNOPSIS
    CandyOS - Hiper optimizador competitivo para Fortnite y Valorant (PC de escritorio).

.DESCRIPTION
    Diagnostica hardware, Windows, red y la configuracion de Fortnite con
    multiples pruebas, calcula una puntuacion y genera recomendaciones
    priorizadas. Aplica optimizaciones reversibles (con punto de restauracion
    y copia de seguridad de cada valor modificado), un Modo Enfoque con ajustes
    temporales de sesion que se revierten solos al reiniciar, limpia basura del
    sistema y centraliza herramientas externas de confianza via winget.

    Interfaz 100% ASCII en terminal, sin dependencias externas.

.PARAMETER Mode
    Menu (por defecto), Diagnose, QuickDiagnose, Optimize, Games, Fortnite,
    Valorant, Clean, Startup, Focus, FocusStop, Monitor, Tools, Undo.

.PARAMETER NoElevate
    No solicita permisos de administrador (funciones limitadas).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\CandyOS.ps1

.NOTES
    CandyOS (c) 2026 LukOffMon. Todos los derechos reservados.
    No modifica archivos de los juegos, no inyecta nada en procesos y no toca
    los anti-cheat (Easy Anti-Cheat / Riot Vanguard). Solo edita configuracion de
    Windows y el archivo de ajustes de usuario de Fortnite (GameUserSettings.ini)
    con copia de seguridad.
#>
[CmdletBinding()]
param(
    [ValidateSet('Menu', 'Diagnose', 'QuickDiagnose', 'Optimize', 'Games', 'Fortnite', 'Valorant', 'Clean', 'Startup', 'Focus', 'FocusStop', 'Monitor', 'Tools', 'Undo')]
    [string]$Mode = 'Menu',
    [switch]$NoElevate
)

# =============================================================================
#  CONSTANTES Y ESTADO GLOBAL
# =============================================================================
$script:CandyVersion = '1.0.0'
$script:CandyUrl     = 'https://lukoffmon.github.io/LKMLPR/candyos/CandyOS.ps1'
$script:CandySite    = 'https://lukoffmon.github.io/LKMLPR/candyos/'
$script:W            = 78
$script:IsAdmin      = $false
$script:Findings     = New-Object System.Collections.Generic.List[object]
$script:Diag         = [ordered]@{}
$script:Metrics      = [ordered]@{}
$script:DnsResults   = $null
$script:MonitorHz    = 0
$script:MonitorMaxHz = 0
$script:IsDualCcdX3D = $false
$script:BestRegion   = $null
$script:RestorePointDone = $false
$script:LastScore    = $null

$script:MmPath        = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Multimedia\SystemProfile'
$script:FnMainSection = '/Script/FortniteGame.FortGameUserSettings'
$script:FnRhiSection  = 'D3DRHIPreference'
$script:FnSgSection   = 'ScalabilityGroups'
$script:ValProcesses  = @('VALORANT-Win64-Shipping', 'VALORANT')
$script:FnProcesses   = @('FortniteClient-Win64-Shipping', 'FortniteClient-Win64-Shipping_EAC', 'FortniteClient-Win64-Shipping_BE', 'FortniteLauncher')

$script:EpicRegions = @(
    @{ Code = 'NAE';  Name = 'NA-Este';        Host = 'ping-nae.ds.on.epicgames.com' },
    @{ Code = 'NAC';  Name = 'NA-Central';     Host = 'ping-nac.ds.on.epicgames.com' },
    @{ Code = 'NAW';  Name = 'NA-Oeste';       Host = 'ping-naw.ds.on.epicgames.com' },
    @{ Code = 'EU';   Name = 'Europa';         Host = 'ping-eu.ds.on.epicgames.com' },
    @{ Code = 'BR';   Name = 'Brasil';         Host = 'ping-br.ds.on.epicgames.com' },
    @{ Code = 'ME';   Name = 'Medio Oriente';  Host = 'ping-me.ds.on.epicgames.com' },
    @{ Code = 'ASIA'; Name = 'Asia';           Host = 'ping-asia.ds.on.epicgames.com' },
    @{ Code = 'OCE';  Name = 'Oceania';        Host = 'ping-oce.ds.on.epicgames.com' }
)

$script:DnsProviders = @(
    @{ Name = 'Cloudflare'; Primary = '1.1.1.1';        Secondary = '1.0.0.1' },
    @{ Name = 'Google';     Primary = '8.8.8.8';        Secondary = '8.8.4.4' },
    @{ Name = 'Quad9';      Primary = '9.9.9.9';        Secondary = '149.112.112.112' },
    @{ Name = 'OpenDNS';    Primary = '208.67.222.222'; Secondary = '208.67.220.220' }
)

# Palabras clave de ahorro de energia en adaptadores de red (Intel / Realtek / Killer / Broadcom)
$script:NicPowerKeywords = @('*EEE', 'EEE', 'AdvancedEEE', 'EEELinkAdvertisement', 'EnableGreenEthernet', 'GreenEthernet',
    'PowerSavingMode', 'GigaLite', 'ReduceSpeedOnPowerDown', 'ULPMode', 'EnableConnectedPowerGating',
    'EnableDynamicPowerGating', 'SavePowerNowEnabled', 'AutoPowerSaveModeEnabled', 'EnablePowerManagement', 'S5WakeOnLan_Disable_Dummy')

# =============================================================================
#  UTILIDADES BASE
# =============================================================================
function Test-IsAdmin {
    try {
        $id = [Security.Principal.WindowsIdentity]::GetCurrent()
        return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    } catch { return $false }
}

function Initialize-CandyPaths {
    $base = $env:ProgramData
    if (-not $base) { $base = $env:TEMP }
    $script:StateDir   = Join-Path $base 'CandyOS'
    $script:BackupDir  = Join-Path $script:StateDir 'backups'
    $script:BackupFile = Join-Path $script:StateDir 'undo.json'
    $script:StateFile  = Join-Path $script:StateDir 'state.json'
    $script:LogFile    = Join-Path $script:StateDir 'candyos.log'
    $docs = [Environment]::GetFolderPath('MyDocuments')
    if (-not $docs) { $docs = $env:USERPROFILE }
    $script:ReportDir  = Join-Path $docs 'CandyOS\Reportes'
    foreach ($d in @($script:StateDir, $script:BackupDir, $script:ReportDir)) {
        if (-not (Test-Path -LiteralPath $d)) {
            try { New-Item -ItemType Directory -Path $d -Force -ErrorAction Stop | Out-Null } catch { }
        }
    }
}

function Write-CandyLog {
    param([string]$Message)
    try {
        $line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
        Add-Content -LiteralPath $script:LogFile -Value $line -Encoding UTF8 -ErrorAction Stop
    } catch { }
}

function Get-CandyState {
    $obj = @{}
    if (Test-Path -LiteralPath $script:StateFile) {
        try {
            $raw = Get-Content -LiteralPath $script:StateFile -Raw -ErrorAction Stop
            if ($raw) {
                $j = $raw | ConvertFrom-Json
                foreach ($p in $j.PSObject.Properties) { $obj[$p.Name] = $p.Value }
            }
        } catch { }
    }
    return $obj
}

function Set-CandyStateValue {
    param([string]$Name, $Value)
    $s = Get-CandyState
    $s[$Name] = $Value
    try { ($s | ConvertTo-Json -Depth 6) | Set-Content -LiteralPath $script:StateFile -Encoding UTF8 -ErrorAction Stop } catch { }
}

function Format-Bytes {
    param([double]$Bytes)
    if ($Bytes -ge 1TB) { return ('{0:N2} TB' -f ($Bytes / 1TB)) }
    if ($Bytes -ge 1GB) { return ('{0:N2} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ('{0:N0} KB' -f ($Bytes / 1KB)) }
    return ('{0:N0} B' -f $Bytes)
}

function Get-Median {
    param([double[]]$Values)
    if (-not $Values -or $Values.Count -eq 0) { return $null }
    $s = $Values | Sort-Object
    $n = $s.Count
    if ($n % 2 -eq 1) { return [double]$s[[int][Math]::Floor($n / 2)] }
    return ([double]$s[$n / 2 - 1] + [double]$s[$n / 2]) / 2
}

function Test-ProcessRunning {
    param([string[]]$Names)
    foreach ($n in $Names) {
        if (Get-Process -Name $n -ErrorAction SilentlyContinue) { return $true }
    }
    return $false
}

# =============================================================================
#  INTERFAZ ASCII
# =============================================================================
function Show-Banner {
    $art = @(
        '     ____                _        ___  ____  ',
        '    / ___|__ _ _ __   __| |_   _ / _ \/ ___| ',
        '   | |   / _` | ''_ \ / _` | | | | | | \___ \ ',
        '   | |__| (_| | | | | (_| | |_| | |_| |___) |',
        '    \____\__,_|_| |_|\__,_|\__, |\___/|____/ ',
        '                           |___/             '
    )
    $colors = @('Magenta', 'White', 'Magenta', 'White', 'Magenta', 'White')
    Write-Host ''
    for ($i = 0; $i -lt $art.Count; $i++) { Write-Host ('   ' + $art[$i]) -ForegroundColor $colors[$i] }
    Write-Host ('   ' + ('=' * 50)) -ForegroundColor DarkMagenta
    Write-Host ('     COMPETITIVE OPTIMIZER :: FORTNITE + VALORANT :: v{0}' -f $script:CandyVersion) -ForegroundColor Cyan
    Write-Host ('   ' + ('=' * 50)) -ForegroundColor DarkMagenta
}

function Write-Title {
    param([string]$Text)
    Write-Host ''
    $s = '  +--[ ' + $Text + ' ]'
    $pad = $script:W - $s.Length - 1
    if ($pad -lt 2) { $pad = 2 }
    Write-Host ($s + ('-' * $pad) + '+') -ForegroundColor Magenta
}

function Write-Rule {
    param([string]$Color = 'DarkGray')
    Write-Host ('  ' + ('-' * ($script:W - 3))) -ForegroundColor $Color
}

function Write-Status {
    param(
        [ValidateSet('OK', 'WARN', 'FAIL', 'INFO', 'RUN')][string]$Status,
        [string]$Label,
        [string]$Value = ''
    )
    switch ($Status) {
        'OK'   { $tag = '[ OK ]'; $c = 'Green' }
        'WARN' { $tag = '[ !! ]'; $c = 'Yellow' }
        'FAIL' { $tag = '[ XX ]'; $c = 'Red' }
        'INFO' { $tag = '[ ii ]'; $c = 'Cyan' }
        default { $tag = '[ .. ]'; $c = 'DarkGray' }
    }
    $lbl = $Label
    if ($lbl.Length -gt 30) { $lbl = $lbl.Substring(0, 30) }
    Write-Host '  ' -NoNewline
    Write-Host $tag -ForegroundColor $c -NoNewline
    Write-Host (' ' + $lbl.PadRight(31)) -ForegroundColor Gray -NoNewline
    Write-Host $Value -ForegroundColor White
}

function Out-Diag {
    param([string]$Status, [string]$Section, [string]$Label, [string]$Value)
    Write-Status -Status $Status -Label $Label -Value $Value
    if (-not $script:Diag.Contains($Section)) { $script:Diag[$Section] = [ordered]@{} }
    $script:Diag[$Section][$Label] = $Value
}

function Write-Step {
    param([string]$Text, [switch]$NoNewline)
    Write-Host ('  >> ' + $Text) -ForegroundColor Cyan -NoNewline:$NoNewline
}

function Write-Note {
    param([string]$Text, [string]$Color = 'DarkGray', [int]$Indent = 4)
    foreach ($l in (Split-TextLines -Text $Text -Width ($script:W - $Indent - 2))) {
        Write-Host ((' ' * $Indent) + $l) -ForegroundColor $Color
    }
}

function Split-TextLines {
    param([string]$Text, [int]$Width = 70)
    $out = New-Object System.Collections.Generic.List[string]
    if (-not $Text) { return , $out }
    foreach ($para in ($Text -split "`n")) {
        $line = ''
        foreach ($word in ($para -split ' ')) {
            if ($word -eq '') { continue }
            if (($line.Length + $word.Length + 1) -gt $Width -and $line.Length -gt 0) {
                $out.Add($line)
                $line = $word
            } elseif ($line.Length -eq 0) {
                $line = $word
            } else {
                $line = $line + ' ' + $word
            }
        }
        if ($line.Length -gt 0) { $out.Add($line) }
    }
    return , $out
}

function Get-Bar {
    param([double]$Percent, [int]$Width = 30)
    if ($Percent -lt 0) { $Percent = 0 }
    if ($Percent -gt 100) { $Percent = 100 }
    $n = [int][Math]::Round($Percent / 100 * $Width)
    return '[' + ('#' * $n) + ('.' * ($Width - $n)) + ']'
}

function Get-ScoreColor {
    param([double]$Score)
    if ($Score -ge 85) { return 'Green' }
    if ($Score -ge 65) { return 'Yellow' }
    return 'Red'
}

function Read-Option {
    param([string]$Prompt = 'Opcion')
    Write-Host ''
    Write-Host ('  ' + $Prompt + ' > ') -ForegroundColor Magenta -NoNewline
    $a = Read-Host
    if ($null -eq $a) { return '' }
    return $a.Trim().ToUpper()
}

function Confirm-Candy {
    param([string]$Question)
    $a = Read-Option ($Question + ' [S/N]')
    return ($a -eq 'S' -or $a -eq 'SI' -or $a -eq 'Y' -or $a -eq 'YES')
}

function Wait-Candy {
    Write-Host ''
    Write-Host '  Presiona ENTER para continuar...' -ForegroundColor DarkGray -NoNewline
    [void](Read-Host)
}

function Get-SelectionNumbers {
    param([string]$Text, [int]$Max)
    $set = New-Object System.Collections.Generic.List[int]
    foreach ($part in ($Text -split '[,; ]+')) {
        if ($part -match '^(\d+)-(\d+)$') {
            for ($i = [int]$matches[1]; $i -le [int]$matches[2]; $i++) { if ($i -ge 1 -and $i -le $Max -and -not $set.Contains($i)) { $set.Add($i) } }
        } elseif ($part -match '^\d+$') {
            $i = [int]$part
            if ($i -ge 1 -and $i -le $Max -and -not $set.Contains($i)) { $set.Add($i) }
        }
    }
    return , $set
}

function Test-AdminOrWarn {
    if ($script:IsAdmin) { return $true }
    Write-Status FAIL 'Permisos' 'Esta funcion requiere ejecutar CandyOS como Administrador.'
    Wait-Candy
    return $false
}

# =============================================================================
#  COPIAS DE SEGURIDAD / DESHACER
# =============================================================================
function Get-BackupStore {
    if (Test-Path -LiteralPath $script:BackupFile) {
        try {
            $raw = Get-Content -LiteralPath $script:BackupFile -Raw -ErrorAction Stop
            if ($raw -and $raw.Trim()) { return @($raw | ConvertFrom-Json) }
        } catch { Write-CandyLog "Backup ilegible: $($_.Exception.Message)" }
    }
    return @()
}

function Save-BackupStore {
    param([object[]]$Store)
    try {
        ConvertTo-Json -InputObject @($Store) -Depth 8 | Set-Content -LiteralPath $script:BackupFile -Encoding UTF8 -ErrorAction Stop
    } catch { Write-CandyLog "No se pudo guardar backup: $($_.Exception.Message)" }
}

function Add-Backup {
    param([hashtable]$Entry)
    $store = @(Get-BackupStore)
    foreach ($e in $store) { if ($e.Key -eq $Entry.Key) { return } }   # se conserva siempre el valor ORIGINAL
    $Entry['Date'] = (Get-Date).ToString('s')
    $store += [pscustomobject]$Entry
    Save-BackupStore -Store $store
}

function Get-RegValueInfo {
    param([string]$Path, [string]$Name)
    $r = @{ Exists = $false; Kind = $null; Value = $null }
    try {
        $k = Get-Item -LiteralPath $Path -ErrorAction Stop
        if ($k.GetValueNames() -contains $Name) {
            $r.Exists = $true
            $r.Kind = $k.GetValueKind($Name).ToString()
            $r.Value = $k.GetValue($Name, $null, [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)
        }
    } catch { }
    return $r
}

function Get-RegValue {
    param([string]$Path, [string]$Name, $Default = $null)
    $i = Get-RegValueInfo -Path $Path -Name $Name
    if ($i.Exists) { return $i.Value }
    return $Default
}

function Set-RegTweak {
    param(
        [string]$Path,
        [string]$Name,
        $Value,
        [ValidateSet('DWord', 'QWord', 'String', 'ExpandString', 'Binary', 'MultiString')][string]$Type = 'DWord'
    )
    $cur = Get-RegValueInfo -Path $Path -Name $Name
    $bv = $cur.Value
    if ($bv -is [byte[]]) { $bv = @($bv | ForEach-Object { [int]$_ }) }
    Add-Backup @{ Key = "Reg|$Path|$Name"; Type = 'Reg'; Path = $Path; Name = $Name; Existed = $cur.Exists; Kind = $cur.Kind; Value = $bv }
    if (-not (Test-Path -LiteralPath $Path)) { New-Item -Path $Path -Force -ErrorAction Stop | Out-Null }
    New-ItemProperty -LiteralPath $Path -Name $Name -Value $Value -PropertyType $Type -Force -ErrorAction Stop | Out-Null
    Write-CandyLog "REG $Path\$Name = $Value ($Type)"
}

function Restore-RegEntry {
    param($Entry)
    if (-not $Entry.Existed) {
        Remove-ItemProperty -LiteralPath $Entry.Path -Name $Entry.Name -ErrorAction SilentlyContinue
        return
    }
    $v = $Entry.Value
    switch ($Entry.Kind) {
        'Binary'      { $v = [byte[]]@($v | ForEach-Object { [byte]$_ }) }
        'MultiString' { $v = [string[]]@($v) }
        'DWord'       { $l = [long]$v; if ($l -gt [int]::MaxValue) { $l = $l - 4294967296 }; $v = [int]$l }
        'QWord'       { $v = [long]$v }
        default       { $v = [string]$v }
    }
    if (-not (Test-Path -LiteralPath $Entry.Path)) { New-Item -Path $Entry.Path -Force | Out-Null }
    New-ItemProperty -LiteralPath $Entry.Path -Name $Entry.Name -Value $v -PropertyType $Entry.Kind -Force -ErrorAction Stop | Out-Null
}

# =============================================================================
#  ARCHIVOS INI (GameUserSettings.ini) - conserva codificacion y saltos de linea
# =============================================================================
function Read-IniFile {
    param([string]$Path)
    $bytes = [IO.File]::ReadAllBytes($Path)
    $enc = New-Object Text.UTF8Encoding($false)
    $skip = 0
    if ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFF -and $bytes[1] -eq 0xFE) {
        $enc = New-Object Text.UnicodeEncoding($false, $true); $skip = 2
    } elseif ($bytes.Length -ge 2 -and $bytes[0] -eq 0xFE -and $bytes[1] -eq 0xFF) {
        $enc = New-Object Text.UnicodeEncoding($true, $true); $skip = 2
    } elseif ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $enc = New-Object Text.UTF8Encoding($true); $skip = 3
    }
    $text = $enc.GetString($bytes, $skip, $bytes.Length - $skip)
    $nl = "`n"
    if ($text.Contains("`r`n")) { $nl = "`r`n" }
    $list = New-Object System.Collections.Generic.List[string]
    $list.AddRange([string[]]($text -split "`r?`n"))
    return @{ Path = $Path; Lines = $list; Encoding = $enc; NewLine = $nl }
}

function Write-IniFile {
    param([hashtable]$Ini, [string]$Path = $null)
    if (-not $Path) { $Path = $Ini.Path }
    $text = [string]::Join($Ini.NewLine, $Ini.Lines.ToArray())
    [IO.File]::WriteAllText($Path, $text, $Ini.Encoding)
}

function Get-IniSectionRange {
    param([hashtable]$Ini, [string]$Section)
    $start = -1; $end = $Ini.Lines.Count
    $hdr = '[' + $Section + ']'
    for ($i = 0; $i -lt $Ini.Lines.Count; $i++) {
        $t = $Ini.Lines[$i].Trim()
        if ($start -lt 0) {
            if ($t -eq $hdr) { $start = $i }
        } elseif ($t.StartsWith('[') -and $t.EndsWith(']')) {
            $end = $i; break
        }
    }
    return @{ Start = $start; End = $end }
}

function Get-IniValue {
    param([hashtable]$Ini, [string]$Section, [string]$Key)
    $r = Get-IniSectionRange -Ini $Ini -Section $Section
    if ($r.Start -lt 0) { return $null }
    $rx = '^\s*' + [regex]::Escape($Key) + '\s*=(.*)$'
    for ($i = $r.Start + 1; $i -lt $r.End; $i++) {
        $m = [regex]::Match($Ini.Lines[$i], $rx)
        if ($m.Success) { return $m.Groups[1].Value.Trim() }
    }
    return $null
}

function Set-IniValue {
    param([hashtable]$Ini, [string]$Section, [string]$Key, [string]$Value, [switch]$OnlyIfExists)
    $r = Get-IniSectionRange -Ini $Ini -Section $Section
    $newLine = $Key + '=' + $Value
    if ($r.Start -lt 0) {
        if ($OnlyIfExists) { return $false }
        if ($Ini.Lines.Count -gt 0 -and $Ini.Lines[$Ini.Lines.Count - 1].Trim() -eq '') {
            $Ini.Lines.Insert($Ini.Lines.Count - 1, '')
            $Ini.Lines.Insert($Ini.Lines.Count - 1, '[' + $Section + ']')
            $Ini.Lines.Insert($Ini.Lines.Count - 1, $newLine)
        } else {
            $Ini.Lines.Add(''); $Ini.Lines.Add('[' + $Section + ']'); $Ini.Lines.Add($newLine)
        }
        return $true
    }
    $rx = '^\s*' + [regex]::Escape($Key) + '\s*='
    for ($i = $r.Start + 1; $i -lt $r.End; $i++) {
        if ($Ini.Lines[$i] -match $rx) {
            if ($Ini.Lines[$i] -eq $newLine) { return $false }
            $Ini.Lines[$i] = $newLine
            return $true
        }
    }
    if ($OnlyIfExists) { return $false }
    $insertAt = $r.End
    while ($insertAt - 1 -gt $r.Start -and $Ini.Lines[$insertAt - 1].Trim() -eq '') { $insertAt-- }
    $Ini.Lines.Insert($insertAt, $newLine)
    return $true
}

function Remove-IniValue {
    param([hashtable]$Ini, [string]$Section, [string]$Key)
    $r = Get-IniSectionRange -Ini $Ini -Section $Section
    if ($r.Start -lt 0) { return $false }
    $rx = '^\s*' + [regex]::Escape($Key) + '\s*='
    for ($i = $r.Start + 1; $i -lt $r.End; $i++) {
        if ($Ini.Lines[$i] -match $rx) { $Ini.Lines.RemoveAt($i); return $true }
    }
    return $false
}

# =============================================================================
#  HALLAZGOS Y PUNTUACION
# =============================================================================
function Add-Finding {
    param(
        [ValidateSet('CRITICO', 'ALTO', 'MEDIO', 'BAJO', 'INFO')][string]$Sev,
        [ValidateSet('Hardware', 'Windows', 'Red', 'Juegos')][string]$Area,
        [string]$Title,
        [string]$Fix,
        [string]$Where = ''
    )
    $script:Findings.Add([pscustomobject]@{ Sev = $Sev; Area = $Area; Title = $Title; Fix = $Fix; Where = $Where })
}

function Get-SeverityWeight {
    param([string]$Sev)
    switch ($Sev) { 'CRITICO' { 20 } 'ALTO' { 10 } 'MEDIO' { 5 } 'BAJO' { 2 } default { 0 } }
}

function Get-SeverityRank {
    param([string]$Sev)
    switch ($Sev) { 'CRITICO' { 0 } 'ALTO' { 1 } 'MEDIO' { 2 } 'BAJO' { 3 } default { 4 } }
}

function Get-SeverityColor {
    param([string]$Sev)
    switch ($Sev) { 'CRITICO' { 'Red' } 'ALTO' { 'Yellow' } 'MEDIO' { 'DarkYellow' } 'BAJO' { 'Cyan' } default { 'Gray' } }
}

function Get-AreaScores {
    $scores = [ordered]@{}
    foreach ($a in @('Hardware', 'Windows', 'Red', 'Juegos')) {
        $pen = 0
        foreach ($f in $script:Findings) { if ($f.Area -eq $a) { $pen += (Get-SeverityWeight $f.Sev) } }
        $s = 100 - $pen
        if ($s -lt 0) { $s = 0 }
        $scores[$a] = $s
    }
    return $scores
}

function Get-Grade {
    param([double]$Score)
    if ($Score -ge 95) { return 'S' }
    if ($Score -ge 85) { return 'A' }
    if ($Score -ge 70) { return 'B' }
    if ($Score -ge 55) { return 'C' }
    if ($Score -ge 40) { return 'D' }
    return 'F'
}

# =============================================================================
#  DETECCION DE COMPONENTES
# =============================================================================
function Get-GpuVramMap {
    $map = @{}
    $base = 'HKLM:\SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}'
    foreach ($k in @(Get-ChildItem -LiteralPath $base -ErrorAction SilentlyContinue)) {
        if ($k.PSChildName -notmatch '^\d{4}$') { continue }
        try {
            $p = Get-ItemProperty -LiteralPath $k.PSPath -ErrorAction Stop
            $desc = $p.DriverDesc
            $mem = $null
            if ($p.PSObject.Properties['HardwareInformation.qwMemorySize']) { $mem = [double]$p.'HardwareInformation.qwMemorySize' }
            elseif ($p.PSObject.Properties['HardwareInformation.MemorySize']) {
                $m2 = $p.'HardwareInformation.MemorySize'
                if ($m2 -is [byte[]]) { $mem = [double][BitConverter]::ToUInt32($m2, 0) } else { $mem = [double]$m2 }
            }
            if ($desc -and $mem) { $map[[string]$desc] = $mem }
        } catch { }
    }
    return $map
}

function Test-DedicatedGpu {
    param([string]$Name)
    if ($Name -match 'NVIDIA|GeForce|Quadro|RTX|GTX') { return $true }
    if ($Name -match 'Radeon.*\b(RX|R9|R7|Pro|VII)\b|Vega (56|64)|RX\s?\d{3,4}') { return $true }
    if ($Name -match 'Arc.*\b[AB]\d{3}\b') { return $true }
    return $false
}

function Get-NvidiaFriendlyDriver {
    param([string]$Version)
    try {
        $p = $Version.Split('.')
        $s = ($p[2] + $p[3])
        $s = $s.Substring($s.Length - 5)
        return ('{0}.{1}' -f $s.Substring(0, 3), $s.Substring(3, 2))
    } catch { return $Version }
}

function Get-ActivePowerScheme {
    try {
        $o = (& powercfg.exe /getactivescheme 2>$null) | Out-String
        $m = [regex]::Match($o, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*\((.+)\)')
        if ($m.Success) { return [pscustomobject]@{ Guid = $m.Groups[1].Value.ToLower(); Name = $m.Groups[2].Value.Trim() } }
    } catch { }
    return $null
}

function Get-PowerSchemeKind {
    param($Scheme)
    if (-not $Scheme) { return 'Desconocido' }
    $st = Get-CandyState
    if ($st.ContainsKey('PowerPlanGuid') -and $st['PowerPlanGuid'] -eq $Scheme.Guid) { return 'Alto' }
    switch ($Scheme.Guid) {
        '381b4222-f694-41f0-9685-ff5bb260df2e' { return 'Equilibrado' }
        'a1841308-3541-4fab-bc81-f71556f20b4a' { return 'Ahorro' }
        '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c' { return 'Alto' }
        'e9a42b02-d5df-448d-aa00-03f14749eb61' { return 'Alto' }
    }
    if ($Scheme.Name -match 'Ultimate|M.ximo|Maximo|Alto|High|Bitsum|CandyOS|Performance|Rendimiento') { return 'Alto' }
    if ($Scheme.Name -match 'Balanced|Equilibrado') { return 'Equilibrado' }
    if ($Scheme.Name -match 'saver|Ahorro|Economizador') { return 'Ahorro' }
    return 'Personalizado'
}

function Get-DriveMediaType {
    param([string]$Letter)
    try {
        $Letter = $Letter.TrimEnd(':', '\')
        $part = Get-Partition -DriveLetter $Letter -ErrorAction Stop | Select-Object -First 1
        $disk = $part | Get-Disk -ErrorAction Stop
        $pd = Get-PhysicalDisk -ErrorAction Stop | Where-Object { [string]$_.DeviceId -eq [string]$disk.Number } | Select-Object -First 1
        if ($pd) {
            $bus = [string]$pd.BusType; $media = [string]$pd.MediaType
            $health = [string]$pd.HealthStatus
            if ($bus -eq 'NVMe') { return @{ Type = 'NVMe SSD'; Health = $health; Name = $pd.FriendlyName } }
            if ($media -eq 'SSD') { return @{ Type = 'SSD SATA'; Health = $health; Name = $pd.FriendlyName } }
            if ($media -eq 'HDD') { return @{ Type = 'HDD'; Health = $health; Name = $pd.FriendlyName } }
            return @{ Type = "Desconocido ($bus)"; Health = $health; Name = $pd.FriendlyName }
        }
    } catch { }
    return @{ Type = 'Desconocido'; Health = ''; Name = '' }
}

function Get-FortniteInfo {
    $info = [ordered]@{ Installed = $false; Path = $null; Exe = $null; Ini = $null; Drive = $null; Version = $null }
    $dat = Join-Path $env:ProgramData 'Epic\UnrealEngineLauncher\LauncherInstalled.dat'
    if (Test-Path -LiteralPath $dat) {
        try {
            $j = Get-Content -LiteralPath $dat -Raw -ErrorAction Stop | ConvertFrom-Json
            $fn = @($j.InstallationList) | Where-Object { $_.AppName -eq 'Fortnite' } | Select-Object -First 1
            if ($fn -and $fn.InstallLocation -and (Test-Path -LiteralPath $fn.InstallLocation)) {
                $info.Path = $fn.InstallLocation
                $info.Version = $fn.AppVersion
            }
        } catch { }
    }
    if (-not $info.Path) {
        $cands = New-Object System.Collections.Generic.List[string]
        foreach ($d in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
            $r = $d.Root
            $cands.Add((Join-Path $r 'Program Files\Epic Games\Fortnite'))
            $cands.Add((Join-Path $r 'Epic Games\Fortnite'))
            $cands.Add((Join-Path $r 'Games\Epic Games\Fortnite'))
            $cands.Add((Join-Path $r 'Fortnite'))
        }
        foreach ($c in $cands) {
            if (Test-Path -LiteralPath (Join-Path $c 'FortniteGame')) { $info.Path = $c; break }
        }
    }
    if ($info.Path) {
        $exe = Join-Path $info.Path 'FortniteGame\Binaries\Win64\FortniteClient-Win64-Shipping.exe'
        if (Test-Path -LiteralPath $exe) { $info.Exe = $exe }
        $info.Installed = $true
        $info.Drive = ([IO.Path]::GetPathRoot($info.Path)).TrimEnd('\')
    }
    $ini = Join-Path $env:LOCALAPPDATA 'FortniteGame\Saved\Config\WindowsClient\GameUserSettings.ini'
    if (Test-Path -LiteralPath $ini) { $info.Ini = $ini }
    return $info
}

function Get-MonitorRefresh {
    $cur = 0; $max = 0
    foreach ($g in @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue)) {
        if ($g.CurrentRefreshRate -and [int]$g.CurrentRefreshRate -gt $cur -and [int]$g.CurrentRefreshRate -lt 1000) { $cur = [int]$g.CurrentRefreshRate }
    }
    try {
        foreach ($mon in @(Get-CimInstance -Namespace root\wmi -ClassName WmiMonitorListedSupportedSourceModes -ErrorAction Stop)) {
            foreach ($m in @($mon.MonitorSourceModes)) {
                if ($m.VerticalRefreshRateDenominator -gt 0) {
                    $hz = [double]$m.VerticalRefreshRateNumerator / [double]$m.VerticalRefreshRateDenominator
                    if ($hz -gt $max -and $hz -lt 1000) { $max = $hz }
                }
            }
        }
    } catch { }
    $script:MonitorHz = $cur
    $script:MonitorMaxHz = [int][Math]::Round($max)
    return @{ Current = $cur; Max = $script:MonitorMaxHz }
}

function Get-ActiveAdapter {
    try {
        $routes = @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop)
        $route = $routes | Sort-Object { [int]$_.RouteMetric + [int]$_.InterfaceMetric } | Select-Object -First 1
        $ad = Get-NetAdapter -InterfaceIndex $route.ifIndex -ErrorAction Stop
        $wifi = ([string]$ad.PhysicalMediaType -match '802\.11') -or ([string]$ad.InterfaceDescription -match 'Wi-?Fi|Wireless|WLAN|802\.11')
        $vpn = ([string]$ad.InterfaceDescription -match 'VPN|TAP-|WireGuard|Wintun|Tunnel|ZeroTier|Tailscale|OpenVPN|Hamachi|Radmin|Cloudflare WARP|ExitLag|NoPing')
        return [pscustomobject]@{ Adapter = $ad; Name = $ad.Name; Gateway = $route.NextHop; IfIndex = $route.ifIndex; IsWifi = $wifi; IsVpn = $vpn }
    } catch { return $null }
}

# =============================================================================
#  PRUEBAS DE RED (Ping .NET: no depende del idioma de Windows)
# =============================================================================
function Test-CandyPing {
    param([string]$Target, [int]$Count = 20, [int]$Timeout = 1000, [int]$IntervalMs = 100, [int]$AbortAfter = 4)
    $times = New-Object System.Collections.Generic.List[double]
    $lost = 0; $sent = 0
    $p = New-Object System.Net.NetworkInformation.Ping
    try {
        for ($i = 0; $i -lt $Count; $i++) {
            $sent++
            try {
                $r = $p.Send($Target, $Timeout)
                if ($r.Status -eq [System.Net.NetworkInformation.IPStatus]::Success) { $times.Add([double]$r.RoundtripTime) } else { $lost++ }
            } catch { $lost++ }
            if ($times.Count -eq 0 -and $lost -ge $AbortAfter) { break }
            if ($IntervalMs -gt 0 -and $i -lt $Count - 1) { Start-Sleep -Milliseconds $IntervalMs }
        }
    } finally { $p.Dispose() }
    $res = [ordered]@{ Target = $Target; Sent = $sent; Received = $times.Count; LossPct = 100; Avg = $null; Min = $null; Max = $null; Jitter = $null; Ok = $false }
    if ($times.Count -gt 0) {
        $res.Ok = $true
        $res.LossPct = [Math]::Round(($lost / $sent) * 100, 1)
        $res.Avg = [Math]::Round(($times | Measure-Object -Average).Average, 1)
        $res.Min = ($times | Measure-Object -Minimum).Minimum
        $res.Max = ($times | Measure-Object -Maximum).Maximum
        $j = 0.0
        for ($k = 1; $k -lt $times.Count; $k++) { $j += [Math]::Abs($times[$k] - $times[$k - 1]) }
        if ($times.Count -gt 1) { $res.Jitter = [Math]::Round($j / ($times.Count - 1), 1) } else { $res.Jitter = 0 }
    }
    return [pscustomobject]$res
}

function Format-PingResult {
    param($R)
    if (-not $R.Ok) { return 'sin respuesta (ICMP bloqueado o caido)' }
    return ('{0} ms prom | min {1} / max {2} | jitter {3} ms | perdida {4}%' -f $R.Avg, $R.Min, $R.Max, $R.Jitter, $R.LossPct)
}

function Get-PathMtu {
    param([string]$Target = '1.1.1.1')
    $p = New-Object System.Net.NetworkInformation.Ping
    $opt = New-Object System.Net.NetworkInformation.PingOptions(64, $true)
    try {
        $test = {
            param($size)
            try {
                $buf = New-Object byte[] $size
                $r = $p.Send($Target, 1500, $buf, $opt)
                return ($r.Status -eq [System.Net.NetworkInformation.IPStatus]::Success)
            } catch { return $false }
        }
        if (& $test 1472) { return 1500 }
        if (-not (& $test 1200)) { return $null }
        $lo = 1200; $hi = 1472
        while ($hi - $lo -gt 1) {
            $mid = [int](($lo + $hi) / 2)
            if (& $test $mid) { $lo = $mid } else { $hi = $mid }
        }
        return $lo + 28
    } finally { $p.Dispose() }
}

function Measure-DnsServers {
    param([string]$CurrentDns)
    $domains = @('epicgames.com', 'fortnite.com', 'google.com', 'discord.com', 'microsoft.com')
    $servers = New-Object System.Collections.Generic.List[object]
    if ($CurrentDns) { $servers.Add(@{ Name = 'Actual'; Ip = $CurrentDns }) }
    foreach ($p in $script:DnsProviders) {
        if ($p.Primary -ne $CurrentDns) { $servers.Add(@{ Name = $p.Name; Ip = $p.Primary }) }
    }
    $results = New-Object System.Collections.Generic.List[object]
    foreach ($s in $servers) {
        $times = New-Object System.Collections.Generic.List[double]
        $fails = 0
        foreach ($round in 1..2) {
            foreach ($d in $domains) {
                $sw = [Diagnostics.Stopwatch]::StartNew()
                try {
                    Resolve-DnsName -Name $d -Server $s.Ip -Type A -DnsOnly -NoHostsFile -QuickTimeout -ErrorAction Stop | Out-Null
                    $sw.Stop(); $times.Add($sw.Elapsed.TotalMilliseconds)
                } catch { $sw.Stop(); $fails++ }
            }
        }
        $med = $null
        if ($times.Count -gt 0) { $med = [Math]::Round((Get-Median -Values $times.ToArray()), 1) }
        $results.Add([pscustomobject]@{ Name = $s.Name; Ip = $s.Ip; Median = $med; Fails = $fails })
    }
    return $results
}

function Invoke-ThroughputLoad {
    param([ValidateSet('Download', 'Upload')][string]$Direction, [int]$Seconds = 8, [int]$Streams = 4)
    $pool = [runspacefactory]::CreateRunspacePool(1, $Streams)
    $pool.Open()
    $worker = {
        param($Direction, $Seconds)
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        [Net.ServicePointManager]::DefaultConnectionLimit = 16
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $total = [long]0
        while ($sw.Elapsed.TotalSeconds -lt $Seconds) {
            try {
                if ($Direction -eq 'Download') {
                    $req = [Net.HttpWebRequest]::Create('https://speed.cloudflare.com/__down?bytes=100000000')
                    $req.Timeout = 10000; $req.ReadWriteTimeout = 10000; $req.UserAgent = 'CandyOS'
                    $resp = $req.GetResponse(); $st = $resp.GetResponseStream()
                    $buf = New-Object byte[] 65536
                    while ($sw.Elapsed.TotalSeconds -lt $Seconds) {
                        $n = $st.Read($buf, 0, $buf.Length)
                        if ($n -le 0) { break }
                        $total += $n
                    }
                    $st.Close(); $resp.Close()
                } else {
                    $size = 8MB
                    $req = [Net.HttpWebRequest]::Create('https://speed.cloudflare.com/__up')
                    $req.Method = 'POST'; $req.Timeout = 10000; $req.ReadWriteTimeout = 10000; $req.UserAgent = 'CandyOS'
                    $req.ContentType = 'application/octet-stream'; $req.AllowWriteStreamBuffering = $false; $req.ContentLength = $size
                    $buf = New-Object byte[] 65536
                    (New-Object Random).NextBytes($buf)
                    $st = $req.GetRequestStream()
                    $sent = 0
                    while ($sent -lt $size) {
                        $st.Write($buf, 0, $buf.Length); $sent += $buf.Length; $total += $buf.Length
                        if ($sw.Elapsed.TotalSeconds -ge $Seconds) { break }
                    }
                    if ($sent -ge $size) { $st.Close(); $resp = $req.GetResponse(); $resp.Close() } else { $req.Abort() }
                }
            } catch { Start-Sleep -Milliseconds 200 }
        }
        $sw.Stop()
        return [pscustomobject]@{ Bytes = $total; Seconds = $sw.Elapsed.TotalSeconds }
    }
    $jobs = @()
    for ($i = 0; $i -lt $Streams; $i++) {
        $ps = [powershell]::Create()
        $ps.RunspacePool = $pool
        [void]$ps.AddScript($worker).AddArgument($Direction).AddArgument($Seconds)
        $jobs += @{ PS = $ps; Handle = $ps.BeginInvoke() }
    }
    return @{ Pool = $pool; Jobs = $jobs }
}

function Complete-ThroughputLoad {
    param($Load)
    $bytes = [long]0; $secs = 0.0
    foreach ($j in $Load.Jobs) {
        try {
            $r = $j.PS.EndInvoke($j.Handle)
            foreach ($x in $r) { $bytes += [long]$x.Bytes; if ($x.Seconds -gt $secs) { $secs = $x.Seconds } }
        } catch { }
        $j.PS.Dispose()
    }
    $Load.Pool.Close(); $Load.Pool.Dispose()
    if ($secs -le 0) { return 0 }
    return [Math]::Round(($bytes * 8) / $secs / 1e6, 1)   # Mbps
}

function Get-BufferbloatGrade {
    param([double]$Delta)
    if ($Delta -lt 5) { return 'A+' }
    if ($Delta -lt 30) { return 'A' }
    if ($Delta -lt 60) { return 'B' }
    if ($Delta -lt 200) { return 'C' }
    if ($Delta -lt 400) { return 'D' }
    return 'F'
}

# =============================================================================
#  DIAGNOSTICO: HARDWARE
# =============================================================================
function Invoke-DiagHardware {
    Write-Title 'HARDWARE'
    $sec = 'Hardware'

    # --- CPU ---
    $cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cpu) {
        $name = ([string]$cpu.Name -replace '\s+', ' ').Trim()
        $cores = [int]$cpu.NumberOfCores; $threads = [int]$cpu.NumberOfLogicalProcessors
        Out-Diag OK $sec 'Procesador' $name
        $st = 'OK'
        if ($cores -lt 6) { $st = 'WARN' }
        Out-Diag $st $sec 'Nucleos / Hilos' ('{0} / {1}  (base {2:N2} GHz)' -f $cores, $threads, ($cpu.MaxClockSpeed / 1000))
        $script:Metrics['CpuCores'] = $cores
        if ($cores -lt 4) {
            Add-Finding CRITICO Hardware 'CPU de menos de 4 nucleos: Fortnite estara limitado por CPU.' 'Usa Modo Rendimiento en Fortnite, limita FPS a un valor estable y cierra TODO lo que corra en segundo plano (CandyOS > Modo Enfoque).' 'Menu 4 y 7'
        } elseif ($cores -lt 6) {
            Add-Finding MEDIO Hardware 'CPU de 4-5 nucleos: Fortnite es muy dependiente del procesador.' 'Modo Rendimiento o DX12 en bajo, distancia de visualizacion media y Modo Enfoque antes de jugar.' 'Menu 4 y 7'
        }
        if ($name -match 'X3D' -and $cores -ge 12) {
            $script:IsDualCcdX3D = $true
            Out-Diag INFO $sec 'Ryzen X3D doble CCD' 'Detectado: requiere plan Equilibrado + Game Bar'
            Add-Finding INFO Hardware 'Ryzen X3D de doble CCD detectado.' 'Mantener plan de energia Equilibrado, Xbox Game Bar actualizada y el driver de chipset AMD al dia: asi Windows estaciona los nucleos sin 3D V-Cache mientras juegas. CandyOS respeta esto automaticamente.'
        }
        $load = [int]$cpu.LoadPercentage
        if ($load -gt 0) {
            $st = 'OK'; if ($load -ge 30) { $st = 'WARN' }
            Out-Diag $st $sec 'Uso de CPU en reposo' ('{0}%' -f $load)
            if ($load -ge 30) { Add-Finding MEDIO Hardware ('La CPU esta al {0}% sin jugar: hay procesos consumiendo en segundo plano.' -f $load) 'Revisa el Monitor en tiempo real (menu 8) para ver que consume y usa Modo Enfoque (menu 7).' 'Menu 7 y 8' }
        }
    } else { Out-Diag WARN $sec 'Procesador' 'No se pudo leer' }

    # --- GPU ---
    $vram = Get-GpuVramMap
    $gpus = @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Where-Object { $_.Name -and $_.Name -notmatch 'Microsoft Basic|Remote|Virtual|Parsec|DisplayLink|Mirage|Citrix|VMware|VirtualBox|Hyper-V|Meta Virtual|IddSample|Spacedesk' })
    $dedicated = @($gpus | Where-Object { Test-DedicatedGpu $_.Name })
    $integrated = @($gpus | Where-Object { -not (Test-DedicatedGpu $_.Name) })
    $script:Metrics['GpuVendor'] = 'Desconocido'
    foreach ($g in $gpus) {
        $isDed = Test-DedicatedGpu $g.Name
        $mem = $null
        if ($vram.ContainsKey([string]$g.Name)) { $mem = $vram[[string]$g.Name] } elseif ($g.AdapterRAM -gt 0) { $mem = [double][uint32]$g.AdapterRAM }
        $memTxt = ''
        if ($mem) { $memTxt = ' | ' + (Format-Bytes $mem) + ' VRAM' }
        $kind = 'integrada'; if ($isDed) { $kind = 'dedicada' }
        Out-Diag OK $sec ('GPU ' + $kind) ($g.Name + $memTxt)
        if ($isDed) {
            if ($g.Name -match 'NVIDIA|GeForce|RTX|GTX|Quadro') { $script:Metrics['GpuVendor'] = 'NVIDIA' }
            elseif ($g.Name -match 'Radeon|AMD') { $script:Metrics['GpuVendor'] = 'AMD' }
            elseif ($g.Name -match 'Arc') { $script:Metrics['GpuVendor'] = 'Intel' }
            if ($mem) { $script:Metrics['VramGB'] = [Math]::Round($mem / 1GB, 1) }
        }
        $drv = [string]$g.DriverVersion
        if ($g.Name -match 'NVIDIA|GeForce|RTX|GTX|Quadro') { $drv = (Get-NvidiaFriendlyDriver $drv) + '  (' + $g.DriverVersion + ')' }
        $age = $null
        if ($g.DriverDate) { try { $age = [int]((Get-Date) - [datetime]$g.DriverDate).TotalDays } catch { } }
        $ageTxt = ''
        if ($null -ne $age) { $ageTxt = ('  | {0} dias' -f $age) }
        $st = 'OK'
        if ($isDed -and $null -ne $age -and $age -gt 120) { $st = 'WARN' }
        Out-Diag $st $sec ('  Driver ' + $kind) ($drv + $ageTxt)
        if ($isDed -and $null -ne $age -and $age -gt 120) {
            Add-Finding MEDIO Hardware ('El driver de tu GPU tiene {0} dias.' -f $age) 'Fortnite recibe optimizaciones en drivers nuevos. Instala el ultimo driver limpio: DDU (desinstalacion limpia) + NVCleanstall (NVIDIA, sin telemetria) o AMD Adrenalin. Disponibles en el Centro de herramientas.' 'Menu 9'
        }
        if ($mem -and $isDed -and $mem -lt 4GB) {
            Add-Finding ALTO Hardware ('GPU con {0} de VRAM: insuficiente para texturas altas.' -f (Format-Bytes $mem)) 'Usa Modo Rendimiento o DX12 con texturas en bajo para evitar tirones por falta de VRAM.' 'Menu 4'
        }
    }
    if ($gpus.Count -eq 0) { Out-Diag WARN $sec 'GPU' 'No se pudo detectar' }
    if ($dedicated.Count -eq 0 -and $gpus.Count -gt 0) {
        Add-Finding ALTO Hardware 'Solo se detecto grafica integrada.' 'Usa Modo Rendimiento, resolucion 3D al 75-100% y limita FPS. Una GPU dedicada es la mejora de hardware con mas impacto.' 'Menu 4'
    }
    # Monitor conectado a la placa base en vez de a la GPU dedicada
    if ($dedicated.Count -gt 0) {
        $dedDrives = @($dedicated | Where-Object { $_.CurrentHorizontalResolution -gt 0 })
        $intDrives = @($integrated | Where-Object { $_.CurrentHorizontalResolution -gt 0 })
        if ($dedDrives.Count -eq 0 -and $intDrives.Count -gt 0) {
            Out-Diag FAIL $sec 'Conexion del monitor' 'Monitor conectado a la PLACA BASE'
            Add-Finding CRITICO Hardware 'Tu monitor esta conectado a la salida de video de la placa base, no a la tarjeta grafica.' 'Conecta el cable HDMI/DisplayPort a los puertos de la tarjeta grafica (abajo, en la parte trasera del gabinete). Puedes estar perdiendo mas del 50% de FPS.'
        } elseif ($dedDrives.Count -gt 0) {
            Out-Diag OK $sec 'Conexion del monitor' 'Conectado a la GPU dedicada'
        }
    }

    # --- Monitor / Hz ---
    $mon = Get-MonitorRefresh
    if ($mon.Current -gt 0) {
        $maxTxt = ''
        if ($mon.Max -gt 0) { $maxTxt = ('  (soporta hasta {0} Hz)' -f $mon.Max) }
        $st = 'OK'
        if ($mon.Max -gt 0 -and $mon.Current -lt ($mon.Max - 2)) { $st = 'FAIL' }
        Out-Diag $st $sec 'Frecuencia del monitor' (('{0} Hz' -f $mon.Current) + $maxTxt)
        $script:Metrics['MonitorHz'] = $mon.Current
        if ($mon.Max -gt 0 -and $mon.Current -lt ($mon.Max - 2)) {
            Add-Finding CRITICO Hardware ('Tu monitor soporta {0} Hz pero Windows lo usa a {1} Hz.' -f $mon.Max, $mon.Current) 'Configuracion > Sistema > Pantalla > Pantalla avanzada > Frecuencia de actualizacion: elige la maxima. Usa cable DisplayPort o HDMI 2.0+. Es la mejora de fluidez mas grande y gratis.'
        } elseif ($mon.Current -le 60) {
            Add-Finding INFO Hardware 'Monitor a 60 Hz.' 'Aunque generes mas FPS, solo veras 60 imagenes por segundo. Un monitor de 144 Hz+ es la mejora de fluidez mas notable para Fortnite competitivo.'
        }
    }

    # --- RAM ---
    $sticks = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue)
    if ($sticks.Count -gt 0) {
        $total = [double](($sticks | Measure-Object -Property Capacity -Sum).Sum)
        $totalGB = [Math]::Round($total / 1GB)
        $cfg = 0; $spd = 0; $type = 0
        foreach ($s in $sticks) {
            if ($s.ConfiguredClockSpeed -gt $cfg) { $cfg = [int]$s.ConfiguredClockSpeed }
            if ($s.Speed -gt $spd) { $spd = [int]$s.Speed }
            if ($s.SMBIOSMemoryType) { $type = [int]$s.SMBIOSMemoryType }
        }
        if ($cfg -eq 0) { $cfg = $spd }
        $typeTxt = switch ($type) { 24 { 'DDR3' } 26 { 'DDR4' } 34 { 'DDR5' } 35 { 'LPDDR5' } default { 'DDR' } }
        $st = 'OK'; if ($totalGB -lt 16) { $st = 'WARN' }
        Out-Diag $st $sec 'Memoria RAM' ('{0} GB {1} | {2} modulo(s)' -f $totalGB, $typeTxt, $sticks.Count)
        $script:Metrics['RamGB'] = $totalGB
        $rated = 0
        foreach ($s in $sticks) {
            $m = [regex]::Match([string]$s.PartNumber, '(?<!\d)(2666|2933|3000|3200|3466|3600|3733|3800|3866|4000|4133|4266|4400|4600|5200|5600|6000|6200|6400|6600|6800|7000|7200|7600|8000|8200|8400)(?!\d)')
            if ($m.Success -and [int]$m.Value -gt $rated) { $rated = [int]$m.Value }
        }
        $ratedTxt = ''
        if ($rated -gt 0) { $ratedTxt = (' | kit de {0} MT/s' -f $rated) }
        $xmpOff = $false
        if ($rated -gt 0 -and $rated -gt ($cfg + 100)) { $xmpOff = $true }
        $xmpLikely = (($type -eq 26 -and $cfg -le 2400) -or ($type -eq 34 -and $cfg -le 4800))
        $st = 'OK'; if ($xmpOff -or $xmpLikely) { $st = 'WARN' }
        Out-Diag $st $sec 'Velocidad RAM' (('{0} MT/s' -f $cfg) + $ratedTxt)
        $script:Metrics['RamMTs'] = $cfg
        if ($xmpOff) {
            Add-Finding ALTO Hardware ('Tu RAM es de {0} MT/s pero funciona a {1} MT/s: XMP/EXPO desactivado.' -f $rated, $cfg) 'Entra a la BIOS y activa el perfil XMP (Intel) / EXPO o DOCP (AMD). En Fortnite puede dar +10-20% de FPS minimos.'
        } elseif ($xmpLikely) {
            Add-Finding MEDIO Hardware ('RAM a {0} MT/s: probablemente XMP/EXPO esta desactivado.' -f $cfg) 'Si tu kit es de mayor velocidad (mira la etiqueta del modulo), activa XMP/EXPO/DOCP en la BIOS.'
        }
        if ($totalGB -lt 8) {
            Add-Finding CRITICO Hardware ('Solo {0} GB de RAM.' -f $totalGB) 'Fortnite recomienda 16 GB. Con menos tendras tirones constantes. Cierra todo antes de jugar y considera ampliar a 16 GB (2x8 GB).'
        } elseif ($totalGB -lt 16) {
            Add-Finding ALTO Hardware ('{0} GB de RAM (recomendado: 16 GB).' -f $totalGB) 'Usa Modo Enfoque para liberar memoria e ISLC para limpiar la standby list. Ampliar a 16 GB en doble canal es lo ideal.' 'Menu 7 y 9'
        }
        if ($sticks.Count -eq 1) {
            Out-Diag FAIL $sec 'Canal de memoria' 'SINGLE CHANNEL (1 modulo)'
            Add-Finding ALTO Hardware 'RAM en single channel (un solo modulo).' 'Fortnite es sensible al ancho de banda de memoria: usar 2 modulos iguales (doble canal) puede dar +15-30% de FPS en escenas de CPU.'
        } else {
            $chans = @()
            foreach ($s in $sticks) {
                $m = [regex]::Match(([string]$s.DeviceLocator + ' ' + [string]$s.BankLabel), 'Channel\s?([A-D])', 'IgnoreCase')
                if ($m.Success) { $chans += $m.Groups[1].Value.ToUpper() }
            }
            if ($chans.Count -eq $sticks.Count -and @($chans | Select-Object -Unique).Count -eq 1) {
                Out-Diag FAIL $sec 'Canal de memoria' ('Todos los modulos en el canal ' + $chans[0])
                Add-Finding ALTO Hardware 'Los modulos de RAM estan en el mismo canal (no hay doble canal real).' 'Revisa el manual de tu placa: normalmente se usan las ranuras A2 y B2 (2a y 4a desde el procesador).'
            } else {
                Out-Diag OK $sec 'Canal de memoria' 'Multi-canal'
            }
        }
    }
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    if ($os) {
        $usedPct = [Math]::Round((1 - ($os.FreePhysicalMemory / $os.TotalVisibleMemorySize)) * 100)
        $st = 'OK'; if ($usedPct -ge 75) { $st = 'WARN' }
        Out-Diag $st $sec 'RAM en uso ahora' ('{0}%  {1}' -f $usedPct, (Get-Bar $usedPct 20))
        if ($usedPct -ge 75) { Add-Finding MEDIO Hardware ('{0}% de la RAM ocupada sin jugar.' -f $usedPct) 'Cierra navegadores y launchers con Modo Enfoque antes de abrir Fortnite.' 'Menu 7' }
    }

    # --- Discos ---
    $fn = Get-FortniteInfo
    $val = Get-ValorantInfo
    $sysDrive = $env:SystemDrive
    $drives = @($sysDrive)
    if ($fn.Drive -and $drives -notcontains $fn.Drive) { $drives += $fn.Drive }
    if ($val.Drive -and $drives -notcontains $val.Drive) { $drives += $val.Drive }
    foreach ($d in $drives) {
        $mt = Get-DriveMediaType $d
        $ld = Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}'" -f $d) -ErrorAction SilentlyContinue
        $freeTxt = ''
        $freePct = 100; $freeGB = 999
        if ($ld -and $ld.Size -gt 0) {
            $freePct = [Math]::Round($ld.FreeSpace / $ld.Size * 100)
            $freeGB = [Math]::Round($ld.FreeSpace / 1GB, 1)
            $freeTxt = (' | libre {0} GB ({1}%)' -f $freeGB, $freePct)
        }
        $roles = @()
        if ($d -eq $sysDrive) { $roles += 'Sistema' }
        if ($fn.Drive -eq $d) { $roles += 'Fortnite' }
        if ($val.Drive -eq $d) { $roles += 'Valorant' }
        $role = $roles -join '+'
        $st = 'OK'
        if ($mt.Type -eq 'HDD' -or $freePct -lt 10) { $st = 'WARN' }
        if ($mt.Health -and $mt.Health -ne 'Healthy') { $st = 'FAIL' }
        Out-Diag $st $sec ('Disco ' + $d + ' (' + $role + ')') ($mt.Type + $freeTxt)
        if ($mt.Health -and $mt.Health -ne 'Healthy') {
            Add-Finding CRITICO Hardware ('El disco {0} reporta estado de salud: {1}.' -f $d, $mt.Health) 'Haz copia de seguridad YA y revisa el disco con CrystalDiskInfo (Centro de herramientas).' 'Menu 9'
        }
        if ($mt.Type -eq 'HDD' -and $role -match 'Fortnite') {
            Add-Finding ALTO Hardware ('Fortnite esta instalado en un disco duro mecanico ({0}).' -f $d) 'Mueve Fortnite a un SSD (idealmente NVMe): reduce tirones por carga de texturas y acelera las partidas. En Epic: Biblioteca > ... > Desinstalar y reinstalar en el SSD, o mover la carpeta y usar Verificar.'
        } elseif ($mt.Type -eq 'HDD' -and $role -match 'Sistema') {
            Add-Finding MEDIO Hardware ('Windows esta en un disco duro mecanico ({0}).' -f $d) 'Instalar Windows en un SSD mejora todo el sistema, incluida la carga de shaders.'
        }
        if ($role -match 'Fortnite|Valorant' -and $freeGB -lt 30) {
            Add-Finding ALTO Hardware ('Solo {0} GB libres en el disco de tus juegos ({1}).' -f $freeGB, $d) 'Las actualizaciones de Fortnite/Valorant necesitan 20-40 GB libres. Usa la Limpieza (menu 5) y WizTree para encontrar archivos grandes.' 'Menu 5 y 9'
        } elseif ($freePct -lt 10) {
            Add-Finding MEDIO Hardware ('El disco {0} tiene menos del 10% libre.' -f $d) 'Un SSD casi lleno pierde rendimiento. Ejecuta la Limpieza (menu 5).' 'Menu 5'
        }
    }

    # --- Placa / BIOS ---
    $bb = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1
    $bios = Get-CimInstance Win32_BIOS -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($bb) { Out-Diag INFO $sec 'Placa base' (([string]$bb.Manufacturer + ' ' + [string]$bb.Product).Trim()) }
    if ($bios) {
        $bdate = $null
        try { $bdate = [datetime]$bios.ReleaseDate } catch { }
        $bt = [string]$bios.SMBIOSBIOSVersion
        if ($bdate) { $bt = $bt + ' (' + $bdate.ToString('yyyy-MM-dd') + ')' }
        Out-Diag INFO $sec 'BIOS' $bt
        if ($bdate -and ((Get-Date) - $bdate).TotalDays -gt 900) {
            Add-Finding BAJO Hardware 'La BIOS tiene mas de 2 anos.' 'Considera actualizarla desde la web del fabricante de tu placa (mejoras de estabilidad, memoria y microcodigo). Sigue sus instrucciones al pie de la letra.'
        }
    }
}

# =============================================================================
#  DIAGNOSTICO: WINDOWS
# =============================================================================
function Invoke-DiagWindows {
    Write-Title 'WINDOWS'
    $sec = 'Windows'
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
    $build = 0
    if ($os) {
        $build = [int]$os.BuildNumber
        $ubr = Get-RegValue 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' 'UBR' 0
        $disp = Get-RegValue 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion' 'DisplayVersion' ''
        $st = 'OK'; if ($build -lt 19045) { $st = 'WARN' }
        Out-Diag $st $sec 'Sistema operativo' ('{0} {1} (build {2}.{3})' -f ([string]$os.Caption -replace 'Microsoft ', ''), $disp, $build, $ubr)
        if ($build -lt 19045) { Add-Finding MEDIO Windows 'Version de Windows desactualizada.' 'Actualiza a Windows 10 22H2 o Windows 11: mejoras en el planificador, DirectX 12 y Game Mode.' }
        $up = (Get-Date) - $os.LastBootUpTime
        $st = 'OK'; if ($up.TotalDays -gt 3) { $st = 'WARN' }
        Out-Diag $st $sec 'Tiempo encendido' ('{0} dias {1} h' -f [int][Math]::Floor($up.TotalDays), $up.Hours)
        if ($up.TotalDays -gt 3) { Add-Finding BAJO Windows ('El PC lleva {0} dias sin reiniciar.' -f [int]$up.TotalDays) 'Reinicia antes de una sesion competitiva: libera memoria, handles y procesos colgados. (El inicio rapido de Windows NO reinicia el kernel al apagar).' }
    }
    $script:Metrics['Build'] = $build

    if (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') {
        Out-Diag WARN $sec 'Reinicio pendiente' 'Windows Update espera un reinicio'
        Add-Finding BAJO Windows 'Hay un reinicio pendiente de Windows Update.' 'Reinicia para terminar de instalar actualizaciones y evitar que se instalen en segundo plano mientras juegas.'
    }

    # Plan de energia
    $sch = Get-ActivePowerScheme
    $kind = Get-PowerSchemeKind $sch
    $schName = 'Desconocido'; if ($sch) { $schName = $sch.Name }
    if ($script:IsDualCcdX3D) {
        $st = 'OK'; if ($kind -ne 'Equilibrado') { $st = 'WARN' }
        Out-Diag $st $sec 'Plan de energia' $schName
        if ($kind -ne 'Equilibrado') { Add-Finding MEDIO Windows 'Ryzen X3D doble CCD con plan distinto a Equilibrado.' 'Con estos CPU el plan Equilibrado es necesario para el core parking hacia el CCD con 3D V-Cache. CandyOS lo configura en Optimizar Windows.' 'Menu 3' }
    } else {
        $st = 'OK'; if ($kind -eq 'Equilibrado' -or $kind -eq 'Ahorro') { $st = 'WARN' }
        Out-Diag $st $sec 'Plan de energia' $schName
        if ($kind -eq 'Ahorro') { Add-Finding ALTO Windows 'Plan de energia en Ahorro.' 'Cambia a Maximo rendimiento: el CPU baja frecuencias y genera stutter.' 'Menu 3' }
        elseif ($kind -eq 'Equilibrado') { Add-Finding MEDIO Windows 'Plan de energia Equilibrado.' 'En escritorio, el plan Maximo rendimiento (Ultimate) evita bajadas de frecuencia y core parking: frametimes mas estables.' 'Menu 3' }
    }

    # Game Mode
    $gm = Get-RegValue 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' $null
    if ($gm -eq 0) { Out-Diag WARN $sec 'Modo Juego' 'Desactivado'; Add-Finding MEDIO Windows 'Modo Juego de Windows desactivado.' 'Activalo: prioriza el juego y pausa Windows Update durante la partida.' 'Menu 3' }
    else { Out-Diag OK $sec 'Modo Juego' 'Activado' }

    # HAGS
    if ($build -ge 19041) {
        $hags = Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' $null
        if ($hags -eq 2) { Out-Diag OK $sec 'Prog. GPU por hardware' 'Activada' }
        else { Out-Diag WARN $sec 'Prog. GPU por hardware' 'Desactivada'; Add-Finding BAJO Windows 'Programacion de GPU acelerada por hardware (HAGS) desactivada.' 'Activala en GPUs GTX 10xx / RX 5000 o superiores: reduce un poco la latencia y es necesaria para DLSS Frame Generation.' 'Menu 3' }
    }

    # Game DVR
    $dvr = Get-RegValue 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 1
    $cap = Get-RegValue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0
    if ($dvr -eq 1 -or $cap -eq 1) {
        Out-Diag WARN $sec 'Grabacion en segundo plano' 'Xbox Game DVR activo'
        Add-Finding MEDIO Windows 'Grabacion en segundo plano de Xbox Game Bar activa.' 'Grabar continuamente consume GPU y disco. Desactivala (si usas ShadowPlay / ReLive, usa solo uno).' 'Menu 3'
    } else { Out-Diag OK $sec 'Grabacion en segundo plano' 'Desactivada' }

    # Optimizaciones para juegos en ventana (Win11)
    if ($build -ge 22000) {
        $dx = [string](Get-RegValue 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' 'DirectXUserGlobalSettings' '')
        if ($dx -match 'SwapEffectUpgradeEnable=1') { Out-Diag OK $sec 'Optimiz. juegos en ventana' 'Activado' }
        else { Out-Diag WARN $sec 'Optimiz. juegos en ventana' 'Desactivado'; Add-Finding BAJO Windows 'Optimizaciones para juegos en ventana desactivadas.' 'Activa el modelo flip en ventana sin bordes: menos latencia si juegas en pantalla completa en ventana.' 'Menu 3' }
    }

    # VBS / HVCI
    try {
        $dg = Get-CimInstance -Namespace root\Microsoft\Windows\DeviceGuard -ClassName Win32_DeviceGuard -ErrorAction Stop
        $hvci = @($dg.SecurityServicesRunning) -contains 2
        if ($hvci) {
            Out-Diag WARN $sec 'Integridad de memoria (HVCI)' 'Activa'
            Add-Finding INFO Windows 'Integridad de memoria (VBS/HVCI) activa: puede costar ~5-10% de FPS en algunos CPU.' 'Es una proteccion de seguridad. CandyOS NO la desactiva automaticamente. Si decides hacerlo: Seguridad de Windows > Seguridad del dispositivo > Aislamiento del nucleo. Valora el riesgo.'
        } else { Out-Diag OK $sec 'Integridad de memoria (HVCI)' 'Inactiva' }
    } catch { }

    # Aceleracion del raton
    $ms = [string](Get-RegValue 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '1')
    if ($ms -ne '0') { Out-Diag WARN $sec 'Aceleracion del raton' 'Activada'; Add-Finding BAJO Windows 'Precision del puntero mejorada (aceleracion) activada.' 'Desactivala para una punteria consistente en menus y en el escritorio (Fortnite usa raw input en partida).' 'Menu 3' }
    else { Out-Diag OK $sec 'Aceleracion del raton' 'Desactivada' }

    # Apps de inicio
    $startup = @(Get-StartupItems | Where-Object { $_.Enabled })
    $st = 'OK'; if ($startup.Count -gt 8) { $st = 'WARN' }
    Out-Diag $st $sec 'Apps al iniciar Windows' ('{0} activas' -f $startup.Count)
    if ($startup.Count -gt 8) { Add-Finding MEDIO Windows ('{0} programas arrancan con Windows.' -f $startup.Count) 'Desactiva los que no necesitas (launchers, actualizadores, chats): menos RAM y CPU en segundo plano.' 'Menu 6' }

    # Procesos pesados / overlays
    $known = Get-GameModeCatalog
    $running = @()
    foreach ($k in $known) {
        $p = @(Get-Process -Name $k.Proc -ErrorAction SilentlyContinue)
        if ($p.Count -gt 0) { $running += $k.Label }
    }
    $running = @($running | Select-Object -Unique)
    if ($running.Count -gt 0) {
        $txt = ($running | Select-Object -First 6) -join ', '
        if ($running.Count -gt 6) { $txt += (' (+{0})' -f ($running.Count - 6)) }
        Out-Diag WARN $sec 'Segundo plano evitable' $txt
        if ($running.Count -ge 3) { Add-Finding MEDIO Windows ('{0} programas evitables abiertos ({1}).' -f $running.Count, $txt) 'Cierralos antes de jugar con Modo Enfoque.' 'Menu 7' }
        else { Add-Finding BAJO Windows ('Programas evitables abiertos: {0}.' -f $txt) 'Cierralos antes de jugar con Modo Enfoque.' 'Menu 7' }
    } else { Out-Diag OK $sec 'Segundo plano evitable' 'Nada relevante' }
    $overlays = @()
    foreach ($o in @(@{P = 'Discord'; N = 'Discord (overlay)' }, @{P = 'RTSS'; N = 'RivaTuner overlay' }, @{P = 'NVIDIA Overlay'; N = 'NVIDIA Overlay' }, @{P = 'GameBar'; N = 'Xbox Game Bar' }, @{P = 'Overwolf'; N = 'Overwolf' }, @{P = 'MSIAfterburner'; N = 'MSI Afterburner' })) {
        if (Get-Process -Name $o.P -ErrorAction SilentlyContinue) { $overlays += $o.N }
    }
    if ($overlays.Count -gt 0) {
        Out-Diag INFO $sec 'Overlays activos' ($overlays -join ', ')
        if ($overlays.Count -ge 2) { Add-Finding BAJO Windows ('Varios overlays activos: {0}.' -f ($overlays -join ', ')) 'Cada overlay se dibuja sobre el juego y anade latencia/stutter. Deja solo uno (o ninguno) para jugar competitivo.' }
    }
}

# =============================================================================
#  DIAGNOSTICO: RED
# =============================================================================
function Invoke-DiagNetwork {
    param([switch]$Full)
    Write-Title 'RED'
    $sec = 'Red'
    $act = Get-ActiveAdapter
    if (-not $act) {
        Out-Diag FAIL $sec 'Conexion' 'Sin ruta a Internet'
        Add-Finding CRITICO Red 'No se detecto conexion a Internet.' 'Revisa el cable / WiFi y vuelve a ejecutar el diagnostico.'
        return
    }
    $ad = $act.Adapter
    $speed = 0
    try { $speed = [double]$ad.ReceiveLinkSpeed } catch { }
    $spTxt = ''
    if ($speed -gt 0) { if ($speed -ge 1e9) { $spTxt = ('{0:N1} Gbps' -f ($speed / 1e9)) } else { $spTxt = ('{0:N0} Mbps' -f ($speed / 1e6)) } }
    $type = 'Ethernet (cable)'
    if ($act.IsWifi) { $type = 'WiFi' }
    if ($act.IsVpn) { $type = 'VPN / tunel' }
    $st = 'OK'; if ($act.IsWifi) { $st = 'FAIL' } elseif ($act.IsVpn) { $st = 'WARN' }
    Out-Diag $st $sec 'Tipo de conexion' ($type + ' | ' + $spTxt)
    Out-Diag INFO $sec 'Adaptador' ([string]$ad.InterfaceDescription)
    $script:Metrics['Connection'] = $type
    if ($act.IsWifi) {
        Add-Finding ALTO Red 'Estas jugando por WiFi.' 'El WiFi agrega jitter y perdida de paquetes (rubber banding). Usa cable Ethernet (Cat 6): es la mejora de red #1. Si no puedes, usa 5/6 GHz cerca del router o un adaptador PLC/powerline.'
        try {
            $wl = (& netsh.exe wlan show interfaces 2>$null) | Out-String
            $m = [regex]::Match($wl, '(\d{1,3})\s*%')
            if ($m.Success) {
                $sig = [int]$m.Groups[1].Value
                $st = 'OK'; if ($sig -lt 70) { $st = 'WARN' }
                $band = ''
                $bm = [regex]::Match($wl, '(2[.,]4|5|6)\s*GHz')
                if ($bm.Success) { $band = ' | ' + $bm.Groups[1].Value + ' GHz' }
                Out-Diag $st $sec 'Senal WiFi' (('{0}%' -f $sig) + $band)
                if ($sig -lt 70) { Add-Finding ALTO Red ('Senal WiFi debil ({0}%).' -f $sig) 'Acercate al router, usa la banda de 5 GHz o, mejor, cable Ethernet.' }
                if ($bm.Success -and $bm.Groups[1].Value -match '2') { Add-Finding MEDIO Red 'WiFi en banda 2.4 GHz.' 'La banda de 2.4 GHz esta saturada e interfiere con todo. Conectate a la red de 5 GHz.' }
            }
        } catch { }
    } elseif ($speed -gt 0 -and $speed -lt 1e9 -and -not $act.IsVpn) {
        Add-Finding MEDIO Red ('Enlace Ethernet a {0}.' -f $spTxt) 'Si tu router es Gigabit, revisa el cable (Cat 5e/6), el puerto o los drivers de la tarjeta de red.'
    }
    if ($act.IsVpn) { Add-Finding INFO Red 'El trafico sale por una VPN o tunel.' 'Las VPN normales suelen subir el ping. Desactivala para jugar salvo que sea un optimizador de rutas que hayas verificado que mejora tu ping.' }

    # Ping al router
    Write-Step ('Midiendo latencia al router ({0})...' -f $act.Gateway) -NoNewline
    $gw = $null
    if ($act.Gateway -and $act.Gateway -ne '0.0.0.0') { $gw = Test-CandyPing -Target $act.Gateway -Count 20 -IntervalMs 50 }
    Write-Host ''
    if ($gw -and $gw.Ok) {
        $limit = 3; if ($act.IsWifi) { $limit = 10 }
        $st = 'OK'; if ($gw.Avg -gt $limit -or $gw.LossPct -gt 0 -or $gw.Jitter -gt 3) { $st = 'WARN' }
        Out-Diag $st $sec 'Router (red local)' (Format-PingResult $gw)
        $script:Metrics['GatewayPing'] = $gw.Avg
        if ($gw.LossPct -gt 0) { Add-Finding ALTO Red ('Perdida de paquetes en tu red local ({0}%).' -f $gw.LossPct) 'El problema esta entre tu PC y el router: cable, WiFi o el router. Prueba otro cable/puerto y reinicia el router.' }
        elseif ($gw.Avg -gt $limit -or $gw.Jitter -gt 3) { Add-Finding MEDIO Red ('Latencia/jitter alto hacia el router ({0} ms, jitter {1} ms).' -f $gw.Avg, $gw.Jitter) 'Normal es <1-2 ms por cable. Revisa cable, WiFi o dispositivos saturando la red.' }
    } elseif ($gw) { Out-Diag INFO $sec 'Router (red local)' 'No responde a ping (normal en algunos routers)' }

    # Internet
    $inet = @()
    foreach ($t in @(@{N = 'Cloudflare 1.1.1.1'; H = '1.1.1.1' }, @{N = 'Google 8.8.8.8'; H = '8.8.8.8' })) {
        Write-Step ('Midiendo latencia a {0}...' -f $t.N) -NoNewline
        $r = Test-CandyPing -Target $t.H -Count 20 -IntervalMs 100
        Write-Host ''
        $st = 'OK'
        if (-not $r.Ok -or $r.LossPct -ge 2 -or $r.Jitter -gt 8) { $st = 'WARN' }
        Out-Diag $st $sec $t.N (Format-PingResult $r)
        if ($r.Ok) { $inet += $r }
    }
    if ($inet.Count -gt 0) {
        $loss = ($inet | Measure-Object -Property LossPct -Maximum).Maximum
        $jit = ($inet | Measure-Object -Property Jitter -Maximum).Maximum
        $script:Metrics['InternetJitter'] = $jit
        $script:Metrics['InternetLoss'] = $loss
        if ($loss -ge 2) { Add-Finding ALTO Red ('Perdida de paquetes hacia Internet ({0}%).' -f $loss) 'Si la red local esta limpia, el problema es tu proveedor: reinicia el modem/router y, si persiste, reclama al ISP con este reporte.' }
        if ($jit -gt 8) { Add-Finding MEDIO Red ('Jitter alto hacia Internet ({0} ms).' -f $jit) 'Jitter alto = ping inestable. Revisa descargas/streams en otros dispositivos y activa QoS/SQM en el router.' }
    } else {
        Add-Finding ALTO Red 'No se pudo medir ping hacia Internet.' 'Un firewall puede bloquear ICMP, o hay problemas de conexion.'
    }

    # Servidores de Fortnite
    Write-Title 'SERVIDORES DE FORTNITE (EPIC)'
    $regionResults = @()
    foreach ($rg in $script:EpicRegions) {
        Write-Step ('{0,-14}' -f $rg.Name) -NoNewline
        $r = Test-CandyPing -Target $rg.Host -Count 8 -IntervalMs 60 -AbortAfter 3
        if ($r.Ok) {
            $bar = Get-Bar ([Math]::Min(100, $r.Avg / 3)) 20
            $c = 'Green'; if ($r.Avg -gt 60) { $c = 'Yellow' }; if ($r.Avg -gt 120) { $c = 'Red' }
            Write-Host (' {0} {1,6} ms  jitter {2,4} ms  perdida {3}%' -f $bar, $r.Avg, $r.Jitter, $r.LossPct) -ForegroundColor $c
            $regionResults += [pscustomobject]@{ Code = $rg.Code; Name = $rg.Name; Avg = $r.Avg; Jitter = $r.Jitter; Loss = $r.LossPct }
            if (-not $script:Diag.Contains('Servidores Fortnite')) { $script:Diag['Servidores Fortnite'] = [ordered]@{} }
            $script:Diag['Servidores Fortnite'][$rg.Name] = (Format-PingResult $r)
        } else {
            Write-Host ' sin respuesta' -ForegroundColor DarkGray
        }
    }
    if ($regionResults.Count -gt 0) {
        $best = $regionResults | Sort-Object Avg | Select-Object -First 1
        $script:BestRegion = $best
        $script:Metrics['BestRegion'] = $best.Name
        $script:Metrics['BestRegionPing'] = $best.Avg
        Write-Host ''
        Out-Diag OK $sec 'Mejor region de Fortnite' ('{0} ({1} ms)' -f $best.Name, $best.Avg)
        Add-Finding INFO Red ('Tu mejor region de matchmaking es {0} ({1} ms).' -f $best.Name, $best.Avg) 'En Fortnite: Configuracion > Juego > Region de emparejamiento. Elige esa region (no "Automatica") para garantizar el menor ping.'
        if ($best.Avg -gt 80) { Add-Finding MEDIO Red ('Incluso tu mejor servidor tiene {0} ms.' -f $best.Avg) 'Revisa bufferbloat y rutas. Optimizadores de ruta (ExitLag, NoPing; de pago) pueden ayudar en algunas zonas: pruebalos en periodo gratuito y compara con este reporte.' }
    } else {
        Out-Diag INFO $sec 'Servidores Fortnite' 'No responden a ICMP desde tu red'
    }

    # DNS
    Write-Title 'DNS'
    $curDns = $null
    try {
        $cd = Get-DnsClientServerAddress -InterfaceIndex $act.IfIndex -AddressFamily IPv4 -ErrorAction Stop
        $curDns = @($cd.ServerAddresses) | Select-Object -First 1
    } catch { }
    Write-Step 'Comparando servidores DNS (10 consultas c/u)...'
    $dns = @(Measure-DnsServers -CurrentDns $curDns)
    $script:DnsResults = $dns
    foreach ($d in $dns) {
        if ($null -ne $d.Median) { Out-Diag INFO $sec ('DNS ' + $d.Name + ' ' + $d.Ip) ('{0} ms (mediana)' -f $d.Median) }
        else { Out-Diag WARN $sec ('DNS ' + $d.Name + ' ' + $d.Ip) 'No responde' }
    }
    $okDns = @($dns | Where-Object { $null -ne $_.Median } | Sort-Object Median)
    if ($okDns.Count -gt 0) {
        $bestDns = $okDns[0]
        $cur = $dns | Where-Object { $_.Name -eq 'Actual' } | Select-Object -First 1
        if ($cur -and $null -ne $cur.Median -and $bestDns.Name -ne 'Actual' -and ($cur.Median - $bestDns.Median) -gt 15) {
            Add-Finding BAJO Red ('{0} responde {1} ms mas rapido que tu DNS actual.' -f $bestDns.Name, [Math]::Round($cur.Median - $bestDns.Median)) 'El DNS NO cambia el ping dentro de la partida, pero acelera conexiones del launcher, tienda y lobby. CandyOS puede configurarlo (reversible).' 'Menu 3'
        }
    }

    # MTU
    Write-Step 'Detectando MTU de la ruta...' -NoNewline
    $mtu = Get-PathMtu
    Write-Host ''
    if ($mtu) {
        $st = 'OK'; if ($mtu -lt 1500) { $st = 'INFO' }
        Out-Diag $st $sec 'MTU de la ruta' ('{0} bytes' -f $mtu)
        if ($mtu -lt 1400) { Add-Finding BAJO Red ('MTU bajo detectado ({0}).' -f $mtu) 'Puede indicar PPPoE/VPN. No suele afectar a Fortnite (paquetes UDP pequenos), pero si notas problemas consulta a tu ISP.' }
    }

    # Ahorro de energia del adaptador
    try {
        $props = @(Get-NetAdapterAdvancedProperty -Name $act.Name -ErrorAction Stop | Where-Object { $script:NicPowerKeywords -contains $_.RegistryKeyword })
        $on = @($props | Where-Object { @($_.RegistryValue)[0] -ne '0' -and @($_.ValidRegistryValues) -contains '0' })
        if ($on.Count -gt 0) {
            Out-Diag WARN $sec 'Ahorro energia adaptador' (($on | ForEach-Object { $_.DisplayName }) -join ', ')
            Add-Finding MEDIO Red 'El adaptador de red tiene funciones de ahorro de energia activas (EEE / Green Ethernet).' 'Pueden causar micro-cortes y latencia extra al "despertar" la tarjeta. CandyOS las desactiva de forma reversible.' 'Menu 3'
        } else { Out-Diag OK $sec 'Ahorro energia adaptador' 'Desactivado' }
    } catch { }

    # TCP autotuning
    try {
        $tcp = Get-NetTCPSetting -SettingName Internet -ErrorAction Stop
        $lvl = [string]$tcp.AutoTuningLevelLocal
        if ($lvl -and $lvl -ne 'Normal') {
            Out-Diag WARN $sec 'TCP Auto-Tuning' $lvl
            Add-Finding BAJO Red ('TCP Auto-Tuning en "{0}".' -f $lvl) 'Algunos "optimizadores" lo desactivan y eso reduce la velocidad de descarga (actualizaciones). Restaura con: netsh int tcp set global autotuninglevel=normal'
        } elseif ($lvl) { Out-Diag OK $sec 'TCP Auto-Tuning' 'Normal' }
    } catch { }

    # Bufferbloat + velocidad
    if ($Full) {
        Write-Title 'VELOCIDAD + BUFFERBLOAT (ping bajo carga)'
        Write-Note 'Se mide el ping en reposo y mientras se satura la conexion. Si sube mucho, tu router tiene "bufferbloat": el ping se dispara cuando alguien descarga o hace streaming.' 'Gray' 4
        $target = '1.1.1.1'
        Write-Step 'Ping en reposo...' -NoNewline
        $idle = Test-CandyPing -Target $target -Count 15 -IntervalMs 100
        Write-Host ''
        if ($idle.Ok) {
            Write-Step 'Descarga a maxima velocidad (8 s)...' -NoNewline
            $load = Invoke-ThroughputLoad -Direction Download -Seconds 8
            Start-Sleep -Milliseconds 1200
            $dl = Test-CandyPing -Target $target -Count 30 -IntervalMs 150 -AbortAfter 30
            $down = Complete-ThroughputLoad $load
            Write-Host ''
            Write-Step 'Subida a maxima velocidad (8 s)...' -NoNewline
            $load = Invoke-ThroughputLoad -Direction Upload -Seconds 8
            Start-Sleep -Milliseconds 1200
            $ul = Test-CandyPing -Target $target -Count 30 -IntervalMs 150 -AbortAfter 30
            $up = Complete-ThroughputLoad $load
            Write-Host ''
            $st = 'OK'; if ($down -lt 25) { $st = 'WARN' }
            Out-Diag $st $sec 'Descarga (estimada)' ('{0} Mbps' -f $down)
            $st = 'OK'; if ($up -lt 5) { $st = 'WARN' }
            Out-Diag $st $sec 'Subida (estimada)' ('{0} Mbps' -f $up)
            $script:Metrics['DownMbps'] = $down
            $script:Metrics['UpMbps'] = $up
            $dDl = 0; $dUl = 0
            if ($dl.Ok) { $dDl = [Math]::Round($dl.Avg - $idle.Avg, 1) }
            if ($ul.Ok) { $dUl = [Math]::Round($ul.Avg - $idle.Avg, 1) }
            $worst = [Math]::Max($dDl, $dUl)
            $grade = Get-BufferbloatGrade $worst
            $script:Metrics['Bufferbloat'] = $grade
            $st = 'OK'; if ($worst -ge 30) { $st = 'WARN' }; if ($worst -ge 100) { $st = 'FAIL' }
            Out-Diag INFO $sec 'Ping en reposo' ('{0} ms' -f $idle.Avg)
            Out-Diag $st $sec 'Ping bajo descarga' ('+{0} ms' -f $dDl)
            Out-Diag $st $sec 'Ping bajo subida' ('+{0} ms' -f $dUl)
            Out-Diag $st $sec 'Calificacion bufferbloat' $grade
            if ($worst -ge 60) {
                Add-Finding ALTO Red ('Bufferbloat severo: el ping sube +{0} ms cuando la red se usa (nota {1}).' -f $worst, $grade) 'Activa SQM / Smart QoS / "Cake" en tu router y limita el ancho de banda al ~90% de lo contratado. Si tu router no lo soporta, prioriza tu PC en QoS o evita descargas mientras juegas.'
            } elseif ($worst -ge 30) {
                Add-Finding MEDIO Red ('Bufferbloat moderado (+{0} ms bajo carga, nota {1}).' -f $worst, $grade) 'Activa QoS en el router o evita descargas/streams en la red mientras juegas.'
            }
            if ($down -gt 0 -and $down -lt 10) { Add-Finding MEDIO Red ('Descarga baja ({0} Mbps).' -f $down) 'No afecta el ping en partida, pero las actualizaciones tardaran y cualquier otra descarga en casa causara lag.' }
            Write-Note 'Velocidad estimada con 4 conexiones a Cloudflare: puede ser menor a la contratada en planes muy altos.' 'DarkGray' 4
        } else {
            Out-Diag INFO $sec 'Bufferbloat' 'No medible (ICMP bloqueado)'
        }
    }
}

# =============================================================================
#  DIAGNOSTICO: FORTNITE
# =============================================================================
function Invoke-DiagFortnite {
    Write-Title 'FORTNITE'
    $sec = 'Fortnite'
    $fn = Get-FortniteInfo
    if (-not $fn.Installed) {
        Out-Diag WARN $sec 'Instalacion' 'No encontrada'
        Add-Finding INFO Juegos 'No se encontro Fortnite instalado con Epic Games Launcher.' 'Si esta instalado en una ruta poco comun, las optimizaciones de Windows y red siguen aplicando.'
    } else {
        Out-Diag OK $sec 'Instalacion' $fn.Path
        if ($fn.Version) { Out-Diag INFO $sec 'Version' ([string]$fn.Version) }
        if ($fn.Exe) {
            $pref = [string](Get-RegValue 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' $fn.Exe '')
            if ($pref -match 'GpuPreference=2') { Out-Diag OK $sec 'Preferencia de GPU' 'Alto rendimiento' }
            else { Out-Diag WARN $sec 'Preferencia de GPU' 'Automatica'; Add-Finding BAJO Juegos 'Fortnite no esta forzado a la GPU de alto rendimiento.' 'Forzarlo evita que Windows lo ejecute en la grafica integrada en equipos con dos GPUs.' 'Menu 3' }
        }
    }
    if (-not $fn.Ini) {
        Out-Diag INFO $sec 'GameUserSettings.ini' 'No existe (abre Fortnite una vez)'
        return
    }
    $ini = $null
    try { $ini = Read-IniFile $fn.Ini } catch { Out-Diag WARN $sec 'GameUserSettings.ini' 'No se pudo leer'; return }
    Out-Diag OK $sec 'Configuracion' $fn.Ini

    $rhi = Get-IniValue $ini $script:FnRhiSection 'PreferredRHI'
    $fl = Get-IniValue $ini $script:FnRhiSection 'PreferredFeatureLevel'
    $modeTxt = 'Desconocido'
    if ($fl -eq 'es31') { $modeTxt = 'Modo Rendimiento' }
    elseif ($rhi -eq 'dx12') { $modeTxt = 'DirectX 12' }
    elseif ($rhi -eq 'dx11') { $modeTxt = 'DirectX 11' }
    $script:Metrics['FnRenderMode'] = $modeTxt
    Out-Diag INFO $sec 'Modo de renderizado' $modeTxt
    $lowEnd = ($script:Metrics.Contains('VramGB') -and $script:Metrics['VramGB'] -lt 4) -or ($script:Metrics.Contains('CpuCores') -and $script:Metrics['CpuCores'] -lt 6) -or ($script:Metrics.Contains('GpuVendor') -and $script:Metrics['GpuVendor'] -eq 'Desconocido')
    if ($modeTxt -eq 'DirectX 11') {
        Add-Finding MEDIO Juegos 'Fortnite usa DirectX 11.' 'DX11 es el modo con peor soporte actual. Usa DirectX 12 (GPU moderna) o Modo Rendimiento (PC modesta / maximo FPS).' 'Menu 4'
    } elseif ($lowEnd -and $modeTxt -eq 'DirectX 12') {
        Add-Finding MEDIO Juegos 'Tu equipo es de gama de entrada y usa DirectX 12.' 'Prueba el Modo Rendimiento: menos carga de CPU/GPU y mas FPS estables.' 'Menu 4'
    }

    $vsync = Get-IniValue $ini $script:FnMainSection 'bUseVSync'
    if ($vsync -eq 'True') { Out-Diag FAIL $sec 'VSync' 'Activado'; Add-Finding ALTO Juegos 'VSync activado en Fortnite.' 'Agrega mucha latencia de entrada. Desactivalo y usa un limite de FPS (o G-Sync/FreeSync + limite).' 'Menu 4' }
    else { Out-Diag OK $sec 'VSync' 'Desactivado' }

    $fps = Get-IniValue $ini $script:FnMainSection 'FrameRateLimit'
    $fpsVal = 0.0
    if ($fps) { [void][double]::TryParse(($fps -replace ',', '.'), [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$fpsVal) }
    $hz = $script:MonitorHz
    if ($hz -le 0) { $hz = (Get-MonitorRefresh).Current }
    $fpsTxt = 'Ilimitado'; if ($fpsVal -gt 0) { $fpsTxt = ('{0} FPS' -f [int]$fpsVal) }
    $st = 'OK'
    if ($fpsVal -gt 0 -and $hz -gt 0 -and $fpsVal -lt ($hz - 5)) { $st = 'FAIL' }
    Out-Diag $st $sec 'Limite de FPS' $fpsTxt
    if ($fpsVal -gt 0 -and $hz -gt 0 -and $fpsVal -lt ($hz - 5)) {
        Add-Finding ALTO Juegos ('El limite de FPS ({0}) es menor que tu monitor ({1} Hz).' -f [int]$fpsVal, $hz) 'Sube el limite al menos a la frecuencia del monitor para aprovecharlo.' 'Menu 4'
    } elseif ($fpsVal -eq 0) {
        Add-Finding BAJO Juegos 'FPS sin limite.' 'Sin limite los frametimes son irregulares y la GPU al 99% sube la latencia. Limita a un valor estable que tu PC mantenga (o usa NVIDIA Reflex On+Boost).' 'Menu 4'
    }

    $fs = Get-IniValue $ini $script:FnMainSection 'FullscreenMode'
    $fsTxt = switch ($fs) { '0' { 'Pantalla completa' } '1' { 'Ventana sin bordes' } '2' { 'Ventana' } default { 'Desconocido' } }
    $st = 'OK'; if ($fs -eq '1' -or $fs -eq '2') { $st = 'WARN' }
    Out-Diag $st $sec 'Modo de ventana' $fsTxt
    if ($fs -eq '2') { Add-Finding ALTO Juegos 'Fortnite en modo Ventana.' 'Usa Pantalla completa: menor latencia y mas FPS.' 'Menu 4' }
    elseif ($fs -eq '1') { Add-Finding BAJO Juegos 'Fortnite en Ventana sin bordes.' 'Pantalla completa suele dar menor latencia. Si prefieres sin bordes, activa "Optimizaciones para juegos en ventana" (Win11).' 'Menu 4' }

    $resX = Get-IniValue $ini $script:FnMainSection 'ResolutionSizeX'
    $resY = Get-IniValue $ini $script:FnMainSection 'ResolutionSizeY'
    if ($resX -and $resY) { Out-Diag INFO $sec 'Resolucion' ('{0}x{1}' -f $resX, $resY) }
    $res3d = Get-IniValue $ini $script:FnSgSection 'sg.ResolutionQuality'
    if ($res3d) { Out-Diag INFO $sec 'Resolucion 3D' ('{0}%' -f ([double]($res3d -replace ',', '.'))) }

    $shadow = Get-IniValue $ini $script:FnSgSection 'sg.ShadowQuality'
    if ($null -ne $shadow -and $modeTxt -ne 'Modo Rendimiento') {
        $st = 'OK'; if ([int]$shadow -gt 0) { $st = 'WARN' }
        $names = @('Bajo/Off', 'Medio', 'Alto', 'Epico', 'Cinematico')
        $sn = $shadow; if ([int]$shadow -ge 0 -and [int]$shadow -lt 5) { $sn = $names[[int]$shadow] }
        Out-Diag $st $sec 'Sombras' $sn
        if ([int]$shadow -gt 0) { Add-Finding MEDIO Juegos 'Sombras activadas.' 'Las sombras son el ajuste que mas FPS cuesta. En competitivo usa Sombras: Desactivado.' 'Menu 4' }
    }
    $accel = Get-IniValue $ini $script:FnMainSection 'bDisableMouseAcceleration'
    if ($accel -eq 'False') { Add-Finding BAJO Juegos 'Aceleracion de raton del juego activa.' 'Desactivala para punteria consistente.' 'Menu 4' }

    if ($script:Metrics['GpuVendor'] -eq 'NVIDIA') {
        Add-Finding INFO Juegos 'GPU NVIDIA detectada.' 'En Fortnite activa NVIDIA Reflex: "Activado + Impulso" (On + Boost). Es la mayor reduccion de latencia disponible y no se puede leer desde el archivo de configuracion.'
    } elseif ($script:Metrics['GpuVendor'] -eq 'AMD') {
        Add-Finding INFO Juegos 'GPU AMD detectada.' 'Activa AMD Anti-Lag (o Anti-Lag 2 si esta disponible) en AMD Software Adrenalin para Fortnite.'
    }
    if ($fn.Exe -and (Test-ProcessRunning $script:FnProcesses)) { Out-Diag INFO $sec 'Estado' 'Fortnite esta abierto ahora' }
}

# =============================================================================
#  BENCHMARKS RAPIDOS (para comparar antes/despues)
# =============================================================================
function Invoke-DiagBenchmarks {
    Write-Title 'PRUEBAS DE RENDIMIENTO'
    $sec = 'Benchmarks'
    Write-Note 'Pruebas cortas de CPU, memoria y disco. Sirven para comparar tu PC antes y despues de optimizar (se guardan en el historial).' 'Gray' 4

    # CPU: ordenamiento de 1M enteros (codigo nativo .NET, 1 hilo)
    Write-Step 'CPU (1 hilo, 3 s)...' -NoNewline
    try {
        $n = 1000000
        $rndBytes = New-Object byte[] ($n * 4)
        (New-Object Random 1234).NextBytes($rndBytes)
        $src = New-Object int[] $n
        [Buffer]::BlockCopy($rndBytes, 0, $src, 0, $rndBytes.Length)
        $work = New-Object int[] $n
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $iter = 0
        while ($sw.Elapsed.TotalSeconds -lt 3) {
            [Array]::Copy($src, $work, $n)
            [Array]::Sort($work)
            $iter++
        }
        $sw.Stop()
        $cpuScore = [int][Math]::Round($iter / $sw.Elapsed.TotalSeconds * 100)
        Write-Host ''
        Out-Diag INFO $sec 'CPU un hilo (CandyScore)' ('{0} pts' -f $cpuScore)
        $script:Metrics['BenchCpu'] = $cpuScore
    } catch { Write-Host ''; Out-Diag WARN $sec 'CPU un hilo' 'Error en la prueba' }

    # Memoria: copia de bloques de 128 MB
    Write-Step 'Memoria (ancho de banda de copia)...' -NoNewline
    try {
        $size = 128MB
        $a = New-Object byte[] $size
        $b = New-Object byte[] $size
        [Array]::Copy($a, $b, $size)
        $sw = [Diagnostics.Stopwatch]::StartNew()
        $copies = 0
        while ($sw.Elapsed.TotalSeconds -lt 2) { [Array]::Copy($a, $b, $size); $copies++ }
        $sw.Stop()
        $gbs = [Math]::Round(($copies * $size * 2) / $sw.Elapsed.TotalSeconds / 1GB, 1)
        $a = $null; $b = $null
        [GC]::Collect()
        Write-Host ''
        Out-Diag INFO $sec 'Memoria (lectura+escritura)' ('{0} GB/s' -f $gbs)
        $script:Metrics['BenchMemGBs'] = $gbs
    } catch { Write-Host ''; Out-Diag WARN $sec 'Memoria' 'Error en la prueba' }

    # Disco: escritura secuencial de 256 MB en la unidad de Fortnite (o sistema)
    $fn = Get-FortniteInfo
    $drive = $env:SystemDrive
    if ($fn.Drive) { $drive = $fn.Drive }
    $dir = Join-Path ($drive + '\') 'CandyOS_bench'
    if ($drive -eq $env:SystemDrive) { $dir = Join-Path $env:TEMP 'CandyOS_bench' }
    Write-Step ('Disco {0} (escritura 256 MB)...' -f $drive) -NoNewline
    try {
        if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null }
        $file = Join-Path $dir 'bench.tmp'
        $chunk = New-Object byte[] (4MB)
        (New-Object Random).NextBytes($chunk)
        $fs = New-Object IO.FileStream($file, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None, 4MB, [IO.FileOptions]::WriteThrough)
        $sw = [Diagnostics.Stopwatch]::StartNew()
        for ($i = 0; $i -lt 64; $i++) { $fs.Write($chunk, 0, $chunk.Length) }
        $fs.Flush($true)
        $sw.Stop()
        $fs.Close()
        $mbs = [Math]::Round(256 / $sw.Elapsed.TotalSeconds)
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host ''
        $st = 'OK'; if ($mbs -lt 200) { $st = 'WARN' }
        Out-Diag $st $sec ('Disco ' + $drive + ' escritura') ('{0} MB/s' -f $mbs)
        $script:Metrics['BenchDiskMBs'] = $mbs
    } catch {
        Write-Host ''
        Out-Diag WARN $sec 'Disco' 'No se pudo medir'
        Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# =============================================================================
#  RESUMEN, PUNTUACION E INFORME
# =============================================================================
function Show-DiagnosticSummary {
    param($Previous)
    $scores = Get-AreaScores
    $global = [int][Math]::Round((($scores.Values | Measure-Object -Average).Average))
    # Un problema critico impide un rango alto; varios altos tambien limitan la nota
    $nCrit = @($script:Findings | Where-Object { $_.Sev -eq 'CRITICO' }).Count
    $nHigh = @($script:Findings | Where-Object { $_.Sev -eq 'ALTO' }).Count
    if ($nCrit -gt 0 -and $global -gt 64) { $global = 64 }
    elseif ($nHigh -ge 2 -and $global -gt 79) { $global = 79 }
    $grade = Get-Grade $global
    $script:LastScore = $global
    $script:Metrics['Score'] = $global
    foreach ($k in $scores.Keys) { $script:Metrics[('Score' + $k)] = $scores[$k] }

    Write-Host ''
    Write-Host ('  ' + ('=' * ($script:W - 3))) -ForegroundColor Magenta
    Write-Host '   RESULTADO CANDYOS' -ForegroundColor White
    Write-Host ('  ' + ('=' * ($script:W - 3))) -ForegroundColor Magenta
    $c = Get-ScoreColor $global
    Write-Host '   PUNTUACION GLOBAL  ' -ForegroundColor Gray -NoNewline
    Write-Host ('{0,3} / 100  {1}  RANGO {2}' -f $global, (Get-Bar $global 30), $grade) -ForegroundColor $c
    if ($Previous -and $Previous.Score) {
        $delta = $global - [int]$Previous.Score
        $sign = '+'; if ($delta -lt 0) { $sign = '' }
        Write-Host ('   (diagnostico anterior: {0}/100 el {1}  ->  {2}{3})' -f $Previous.Score, $Previous.Date, $sign, $delta) -ForegroundColor DarkGray
    }
    Write-Host ''
    foreach ($k in $scores.Keys) {
        $v = $scores[$k]
        Write-Host ('     {0,-10}' -f $k) -ForegroundColor Gray -NoNewline
        Write-Host (' {0,3}  {1}' -f $v, (Get-Bar $v 30)) -ForegroundColor (Get-ScoreColor $v)
    }
    if ($Previous) {
        $cmp = @(
            @{ K = 'BenchCpu'; N = 'CPU (pts)' }, @{ K = 'BenchMemGBs'; N = 'Memoria (GB/s)' }, @{ K = 'BenchDiskMBs'; N = 'Disco (MB/s)' },
            @{ K = 'BestRegionPing'; N = 'Ping mejor region (ms)' }, @{ K = 'InternetJitter'; N = 'Jitter (ms)' }
        )
        $lines = @()
        foreach ($m in $cmp) {
            if ($script:Metrics.Contains($m.K) -and $Previous.PSObject.Properties[$m.K]) {
                $lines += ('     {0,-24} antes {1,8}   ahora {2,8}' -f $m.N, $Previous.($m.K), $script:Metrics[$m.K])
            }
        }
        if ($lines.Count -gt 0) {
            Write-Host ''
            Write-Host '   Comparacion con el diagnostico anterior:' -ForegroundColor Cyan
            foreach ($l in $lines) { Write-Host $l -ForegroundColor Gray }
        }
    }

    $sorted = @($script:Findings | Sort-Object @{ Expression = { Get-SeverityRank $_.Sev } }, Area)
    Write-Title 'RECOMENDACIONES (ordenadas por impacto)'
    if ($sorted.Count -eq 0) { Write-Host '   Nada que mejorar. Tu PC esta lista para jugar.' -ForegroundColor Green }
    $i = 0
    foreach ($f in $sorted) {
        $i++
        Write-Host ('  {0,2}. ' -f $i) -ForegroundColor White -NoNewline
        Write-Host ('[{0}]' -f $f.Sev) -ForegroundColor (Get-SeverityColor $f.Sev) -NoNewline
        Write-Host (' ' + $f.Area + ': ') -ForegroundColor DarkGray -NoNewline
        $tl = Split-TextLines -Text $f.Title -Width ($script:W - 24)
        Write-Host $tl[0] -ForegroundColor White
        for ($t = 1; $t -lt $tl.Count; $t++) { Write-Host ('        ' + $tl[$t]) -ForegroundColor White }
        foreach ($l in (Split-TextLines -Text ('-> ' + $f.Fix) -Width ($script:W - 10))) { Write-Host ('        ' + $l) -ForegroundColor Gray }
        if ($f.Where) { Write-Host ('        CandyOS: ' + $f.Where) -ForegroundColor Magenta }
    }
}

function Save-DiagnosticReport {
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $file = Join-Path $script:ReportDir ('CandyOS_Diagnostico_' + $stamp + '.txt')
    $sb = New-Object System.Text.StringBuilder
    [void]$sb.AppendLine('=' * 78)
    [void]$sb.AppendLine(('  CandyOS v{0} - Informe de diagnostico competitivo (Fortnite + Valorant)' -f $script:CandyVersion))
    [void]$sb.AppendLine(('  Fecha: {0}   Equipo: {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $env:COMPUTERNAME))
    [void]$sb.AppendLine('=' * 78)
    $scores = Get-AreaScores
    [void]$sb.AppendLine(('  PUNTUACION GLOBAL: {0}/100  (Rango {1})' -f $script:LastScore, (Get-Grade $script:LastScore)))
    foreach ($k in $scores.Keys) { [void]$sb.AppendLine(('    {0,-10} {1,3}/100' -f $k, $scores[$k])) }
    [void]$sb.AppendLine('')
    foreach ($sec in $script:Diag.Keys) {
        [void]$sb.AppendLine(('--- ' + $sec.ToUpper() + ' ' + ('-' * [Math]::Max(3, 70 - $sec.Length))))
        foreach ($k in $script:Diag[$sec].Keys) { [void]$sb.AppendLine(('  {0,-32} {1}' -f $k.Trim(), $script:Diag[$sec][$k])) }
        [void]$sb.AppendLine('')
    }
    [void]$sb.AppendLine(('--- RECOMENDACIONES ' + ('-' * 58)))
    $i = 0
    foreach ($f in @($script:Findings | Sort-Object @{ Expression = { Get-SeverityRank $_.Sev } }, Area)) {
        $i++
        [void]$sb.AppendLine(('{0,3}. [{1}] {2}: {3}' -f $i, $f.Sev, $f.Area, $f.Title))
        foreach ($l in (Split-TextLines -Text ('-> ' + $f.Fix) -Width 70)) { [void]$sb.AppendLine('       ' + $l) }
        if ($f.Where) { [void]$sb.AppendLine('       CandyOS: ' + $f.Where) }
    }
    [void]$sb.AppendLine('')
    [void]$sb.AppendLine('Generado por CandyOS - ' + $script:CandySite)
    try {
        [IO.File]::WriteAllText($file, $sb.ToString(), (New-Object Text.UTF8Encoding($true)))
        $m = [ordered]@{ Date = (Get-Date -Format 'yyyy-MM-dd HH:mm') }
        foreach ($k in $script:Metrics.Keys) { $m[$k] = $script:Metrics[$k] }
        ($m | ConvertTo-Json -Depth 4) | Set-Content -LiteralPath (Join-Path $script:ReportDir ('CandyOS_Metricas_' + $stamp + '.json')) -Encoding UTF8
        return $file
    } catch { return $null }
}

function Get-PreviousMetrics {
    $f = Get-ChildItem -LiteralPath $script:ReportDir -Filter 'CandyOS_Metricas_*.json' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $f) { return $null }
    try { return (Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json) } catch { return $null }
}

function Invoke-FullDiagnostic {
    param([switch]$Quick)
    Clear-Host
    Show-Banner
    $script:Findings.Clear()
    $script:Diag = [ordered]@{}
    $script:Metrics = [ordered]@{}
    $prev = Get-PreviousMetrics
    $t0 = Get-Date
    if ($Quick) { Write-Note 'Diagnostico rapido: se omiten la prueba de velocidad/bufferbloat y los benchmarks.' 'Cyan' 2 }
    else { Write-Note 'Diagnostico completo: tarda 2-3 minutos. No abras juegos ni descargas mientras tanto.' 'Cyan' 2 }
    Invoke-DiagHardware
    Invoke-DiagWindows
    Invoke-DiagFortnite
    Invoke-DiagValorant
    if ($Quick) { Invoke-DiagNetwork } else { Invoke-DiagNetwork -Full; Invoke-DiagBenchmarks }
    Show-DiagnosticSummary -Previous $prev
    $file = Save-DiagnosticReport
    Set-CandyStateValue 'LastScore' $script:LastScore
    Set-CandyStateValue 'LastDiag' (Get-Date -Format 'yyyy-MM-dd HH:mm')
    Write-Host ''
    Write-Rule
    Write-Host ('  Duracion: {0:N0} s' -f ((Get-Date) - $t0).TotalSeconds) -ForegroundColor DarkGray
    if ($file) { Write-Host ('  Informe guardado en: ' + $file) -ForegroundColor Green }
    Write-CandyLog ('Diagnostico completado. Puntuacion {0}' -f $script:LastScore)
    Wait-Candy
}

# =============================================================================
#  PUNTO DE RESTAURACION
# =============================================================================
function New-CandyRestorePoint {
    if ($script:RestorePointDone) { return $true }
    Write-Step 'Creando punto de restauracion del sistema...' -NoNewline
    $freqPath = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore'
    $old = Get-RegValueInfo $freqPath 'SystemRestorePointCreationFrequency'
    $ok = $false
    try {
        New-ItemProperty -LiteralPath $freqPath -Name 'SystemRestorePointCreationFrequency' -Value 0 -PropertyType DWord -Force -ErrorAction Stop | Out-Null
        $r = Invoke-CimMethod -Namespace root/default -ClassName SystemRestore -MethodName CreateRestorePoint -Arguments @{ Description = 'CandyOS - antes de optimizar'; RestorePointType = [uint32]12; EventType = [uint32]100 } -ErrorAction Stop
        $ok = ($r.ReturnValue -eq 0)
    } catch { $ok = $false }
    try {
        if ($old.Exists) { New-ItemProperty -LiteralPath $freqPath -Name 'SystemRestorePointCreationFrequency' -Value $old.Value -PropertyType DWord -Force | Out-Null }
        else { Remove-ItemProperty -LiteralPath $freqPath -Name 'SystemRestorePointCreationFrequency' -ErrorAction SilentlyContinue }
    } catch { }
    Write-Host ''
    if ($ok) {
        Write-Status OK 'Punto de restauracion' 'Creado'
        $script:RestorePointDone = $true
        return $true
    }
    Write-Status WARN 'Punto de restauracion' 'No se pudo crear (Proteccion del sistema desactivada?)'
    if ((Get-Command Enable-ComputerRestore -ErrorAction SilentlyContinue) -and (Confirm-Candy 'Activar Proteccion del sistema en la unidad del sistema y reintentar?')) {
        try {
            Enable-ComputerRestore -Drive ($env:SystemDrive + '\') -ErrorAction Stop
            $r = Invoke-CimMethod -Namespace root/default -ClassName SystemRestore -MethodName CreateRestorePoint -Arguments @{ Description = 'CandyOS - antes de optimizar'; RestorePointType = [uint32]12; EventType = [uint32]100 } -ErrorAction Stop
            if ($r.ReturnValue -eq 0) { Write-Status OK 'Punto de restauracion' 'Creado'; $script:RestorePointDone = $true; return $true }
        } catch { }
        Write-Status WARN 'Punto de restauracion' 'Sigue sin poder crearse'
    }
    Write-Note 'Igualmente CandyOS guarda una copia de cada valor que modifica y puedes deshacerlo todo desde el menu U.' 'Gray' 4
    $script:RestorePointDone = Confirm-Candy 'Continuar sin punto de restauracion?'
    return $script:RestorePointDone
}

# =============================================================================
#  OPTIMIZACIONES DE WINDOWS (catalogo reversible)
# =============================================================================
function Set-CandyPowerPlan {
    $cur = Get-ActivePowerScheme
    if ($cur) { Add-Backup @{ Key = 'PowerPlan'; Type = 'PowerPlan'; Guid = $cur.Guid; Name = $cur.Name } }
    if ($script:IsDualCcdX3D) {
        & powercfg.exe /setactive 381b4222-f694-41f0-9685-ff5bb260df2e | Out-Null
        return
    }
    $st = Get-CandyState
    $guid = $null
    if ($st.ContainsKey('PowerPlanGuid')) {
        $list = (& powercfg.exe /list) | Out-String
        if ($list -match [regex]::Escape([string]$st['PowerPlanGuid'])) { $guid = [string]$st['PowerPlanGuid'] }
    }
    if (-not $guid) {
        foreach ($srcGuid in @('e9a42b02-d5df-448d-aa00-03f14749eb61', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c')) {
            $o = (& powercfg.exe -duplicatescheme $srcGuid 2>$null) | Out-String
            $m = [regex]::Match($o, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
            if ($m.Success) { $guid = $m.Groups[1].Value.ToLower(); break }
        }
        if ($guid) {
            & powercfg.exe -changename $guid 'CandyOS Ultimate' 'Plan de maximo rendimiento creado por CandyOS' | Out-Null
            Set-CandyStateValue 'PowerPlanGuid' $guid
        }
    }
    if (-not $guid) { throw 'No se pudo crear el plan de energia.' }
    & powercfg.exe /setactive $guid | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'powercfg no pudo activar el plan.' }
}

function Get-NicPowerProps {
    $act = Get-ActiveAdapter
    if (-not $act) { return @() }
    try {
        return @(Get-NetAdapterAdvancedProperty -Name $act.Name -ErrorAction Stop | Where-Object {
                $script:NicPowerKeywords -contains $_.RegistryKeyword -and @($_.RegistryValue)[0] -ne '0' -and @($_.ValidRegistryValues) -contains '0' })
    } catch { return @() }
}

function Set-NicPowerOff {
    $act = Get-ActiveAdapter
    if (-not $act) { throw 'No hay adaptador de red activo.' }
    foreach ($p in (Get-NicPowerProps)) {
        Add-Backup @{ Key = ('Nic|' + $act.Name + '|' + $p.RegistryKeyword); Type = 'NicProp'; Adapter = $act.Name; Keyword = $p.RegistryKeyword; Value = @($p.RegistryValue)[0] }
        Set-NetAdapterAdvancedProperty -Name $act.Name -RegistryKeyword $p.RegistryKeyword -RegistryValue '0' -NoRestart -ErrorAction Stop
    }
    try {
        $pm = Get-NetAdapterPowerManagement -Name $act.Name -ErrorAction Stop
        if ([string]$pm.AllowComputerToTurnOffDevice -eq 'Enabled') {
            Add-Backup @{ Key = ('NicPM|' + $act.Name); Type = 'NicPM'; Adapter = $act.Name; Value = 'Enabled' }
            Set-NetAdapterPowerManagement -Name $act.Name -AllowComputerToTurnOffDevice Disabled -NoRestart -ErrorAction Stop
        }
    } catch { }
    Write-Note 'El adaptador aplicara los cambios tras reiniciar el PC (o desactivar/activar la red).' 'DarkGray' 6
}

function Test-NicPowerOff {
    if (@(Get-NicPowerProps).Count -gt 0) { return $false }
    try {
        $act = Get-ActiveAdapter
        $pm = Get-NetAdapterPowerManagement -Name $act.Name -ErrorAction Stop
        if ([string]$pm.AllowComputerToTurnOffDevice -eq 'Enabled') { return $false }
    } catch { }
    return $true
}

function Get-InterfaceDhcpDns {
    param($Adapter)
    try {
        $p = 'HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters\Interfaces\' + $Adapter.InterfaceGuid
        $ns = [string](Get-RegValue $p 'NameServer' '')
        return ($ns.Trim() -eq '')
    } catch { return $true }
}

function Set-FastestDns {
    $act = Get-ActiveAdapter
    if (-not $act) { throw 'No hay adaptador de red activo.' }
    if (-not $script:DnsResults) {
        Write-Step 'Midiendo servidores DNS...'
        $cur = $null
        try { $cur = @((Get-DnsClientServerAddress -InterfaceIndex $act.IfIndex -AddressFamily IPv4 -ErrorAction Stop).ServerAddresses) | Select-Object -First 1 } catch { }
        $script:DnsResults = @(Measure-DnsServers -CurrentDns $cur)
    }
    $best = @($script:DnsResults | Where-Object { $null -ne $_.Median -and $_.Name -ne 'Actual' } | Sort-Object Median) | Select-Object -First 1
    if (-not $best) { throw 'Ningun DNS publico respondio.' }
    $prov = $script:DnsProviders | Where-Object { $_.Name -eq $best.Name } | Select-Object -First 1
    $isDhcp = Get-InterfaceDhcpDns $act.Adapter
    $curServers = @()
    if (-not $isDhcp) { try { $curServers = @((Get-DnsClientServerAddress -InterfaceIndex $act.IfIndex -AddressFamily IPv4 -ErrorAction Stop).ServerAddresses) } catch { } }
    Add-Backup @{ Key = ('Dns|' + $act.IfIndex); Type = 'DNS'; IfIndex = $act.IfIndex; Adapter = $act.Name; Dhcp = $isDhcp; Servers = $curServers }
    Set-DnsClientServerAddress -InterfaceIndex $act.IfIndex -ServerAddresses @($prov.Primary, $prov.Secondary) -ErrorAction Stop
    Clear-DnsClientCache -ErrorAction SilentlyContinue
    Write-Note ('DNS configurado: {0} ({1}, {2})' -f $prov.Name, $prov.Primary, $prov.Secondary) 'DarkGray' 6
}

function Test-FastestDns {
    if (-not $script:DnsResults) { return $false }
    $act = Get-ActiveAdapter
    if (-not $act) { return $false }
    try { $cur = @((Get-DnsClientServerAddress -InterfaceIndex $act.IfIndex -AddressFamily IPv4 -ErrorAction Stop).ServerAddresses) | Select-Object -First 1 } catch { return $false }
    $best = @($script:DnsResults | Where-Object { $null -ne $_.Median } | Sort-Object Median) | Select-Object -First 1
    if (-not $best) { return $true }
    if ($best.Name -eq 'Actual') { return $true }
    return ($cur -eq $best.Ip)
}

function Set-DxGlobalSetting {
    param([string]$Key, [string]$Value)
    $path = 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences'
    $cur = [string](Get-RegValue $path 'DirectXUserGlobalSettings' '')
    $pairs = [ordered]@{}
    foreach ($kv in ($cur -split ';')) {
        if ($kv -match '^\s*([^=]+)=(.*)$') { $pairs[$matches[1].Trim()] = $matches[2].Trim() }
    }
    $pairs[$Key] = $Value
    $str = (($pairs.Keys | ForEach-Object { $_ + '=' + $pairs[$_] }) -join ';') + ';'
    Set-RegTweak $path 'DirectXUserGlobalSettings' $str 'String'
}

function Get-TweakCatalog {
    $fn = Get-FortniteInfo
    $build = 0
    try { $build = [int](Get-CimInstance Win32_OperatingSystem -ErrorAction Stop).BuildNumber } catch { }
    $list = New-Object System.Collections.Generic.List[object]

    $powerName = 'Plan de energia CandyOS Ultimate (maximo rendimiento)'
    $powerDesc = 'Evita bajadas de frecuencia y core parking del CPU: frametimes mas estables.'
    if ($script:IsDualCcdX3D) { $powerName = 'Plan de energia Equilibrado (Ryzen X3D doble CCD)'; $powerDesc = 'Necesario para que Windows use el CCD con 3D V-Cache en juegos.' }
    $list.Add([pscustomobject]@{ Id = 'power'; Name = $powerName; Desc = $powerDesc; Impact = 'FPS'; Risk = 'Seguro'; Reboot = $false
            Test = { $k = Get-PowerSchemeKind (Get-ActivePowerScheme); if ($script:IsDualCcdX3D) { $k -eq 'Equilibrado' } else { $k -eq 'Alto' } }
            Apply = { Set-CandyPowerPlan } })
    $list.Add([pscustomobject]@{ Id = 'gamemode'; Name = 'Activar Modo Juego de Windows'; Desc = 'Prioriza el juego y frena Windows Update y notificaciones mientras juegas.'; Impact = 'Fluidez'; Risk = 'Seguro'; Reboot = $false
            Test = { (Get-RegValue 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1) -eq 1 -and (Get-RegValueInfo 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled').Exists }
            Apply = { Set-RegTweak 'HKCU:\Software\Microsoft\GameBar' 'AutoGameModeEnabled' 1; Set-RegTweak 'HKCU:\Software\Microsoft\GameBar' 'AllowAutoGameMode' 1 } })
    if ($build -ge 19041) {
        $list.Add([pscustomobject]@{ Id = 'hags'; Name = 'Programacion de GPU acelerada por hardware'; Desc = 'Menos latencia de CPU->GPU; requerido por DLSS Frame Generation. (GTX 10xx / RX 5000 o superior).'; Impact = 'Latencia'; Risk = 'Seguro'; Reboot = $true
                Test = { (Get-RegValue 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 0) -eq 2 }
                Apply = { Set-RegTweak 'HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers' 'HwSchMode' 2 } })
    }
    $list.Add([pscustomobject]@{ Id = 'gamedvr'; Name = 'Desactivar grabacion en segundo plano (Game DVR)'; Desc = 'Xbox Game Bar deja de grabar en segundo plano: libera GPU y disco.'; Impact = 'FPS'; Risk = 'Seguro'; Reboot = $false
            Test = { (Get-RegValue 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 1) -eq 0 -and (Get-RegValue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0) -eq 0 }
            Apply = { Set-RegTweak 'HKCU:\System\GameConfigStore' 'GameDVR_Enabled' 0; Set-RegTweak 'HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR' 'AppCaptureEnabled' 0 } })
    $list.Add([pscustomobject]@{ Id = 'mmcss'; Name = 'Prioridad multimedia para juegos (MMCSS)'; Desc = 'Reserva menos CPU a tareas de fondo y da prioridad alta de GPU/CPU a la categoria Games.'; Impact = 'Fluidez'; Risk = 'Seguro'; Reboot = $true
            Test = { $mm = $script:MmPath; (Get-RegValue $mm 'SystemResponsiveness' 20) -eq 10 -and (Get-RegValue $mm 'NetworkThrottlingIndex' 10) -eq -1 -and (Get-RegValue ($mm + '\Tasks\Games') 'GPU Priority' 0) -eq 8 }
            Apply = {
                $mm = $script:MmPath
                Set-RegTweak $mm 'SystemResponsiveness' 10
                Set-RegTweak $mm 'NetworkThrottlingIndex' -1
                $g = $mm + '\Tasks\Games'
                Set-RegTweak $g 'GPU Priority' 8
                Set-RegTweak $g 'Priority' 6
                Set-RegTweak $g 'Scheduling Category' 'High' 'String'
                Set-RegTweak $g 'SFIO Priority' 'High' 'String'
            } })
    $list.Add([pscustomobject]@{ Id = 'mouse'; Name = 'Desactivar aceleracion del raton de Windows'; Desc = 'Movimiento 1:1 en escritorio y menus (punteria consistente). Aplica al volver a iniciar sesion.'; Impact = 'Punteria'; Risk = 'Seguro'; Reboot = $false
            Test = { [string](Get-RegValue 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '1') -eq '0' }
            Apply = { Set-RegTweak 'HKCU:\Control Panel\Mouse' 'MouseSpeed' '0' 'String'; Set-RegTweak 'HKCU:\Control Panel\Mouse' 'MouseThreshold1' '0' 'String'; Set-RegTweak 'HKCU:\Control Panel\Mouse' 'MouseThreshold2' '0' 'String' } })
    $exes = @()
    if ($fn.Exe) { $exes += $fn.Exe }
    $val = Get-ValorantInfo
    if ($val.Exe) { $exes += $val.Exe }
    if ($exes.Count -gt 0) {
        $list.Add([pscustomobject]@{ Id = 'gpupref'; Name = 'Fortnite/Valorant siempre en GPU de alto rendimiento'; Desc = 'Evita que Windows ejecute el juego en la grafica integrada.'; Impact = 'FPS'; Risk = 'Seguro'; Reboot = $false; Arg = $exes
                Test = { param($t) $ok = $true; foreach ($e in $t.Arg) { if ([string](Get-RegValue 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' $e '') -notmatch 'GpuPreference=2') { $ok = $false } }; $ok }
                Apply = { param($t) foreach ($e in $t.Arg) { Set-RegTweak 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' $e 'GpuPreference=2;' 'String' } } })
    }
    if ($build -ge 22000) {
        $list.Add([pscustomobject]@{ Id = 'windowed'; Name = 'Optimizaciones para juegos en ventana (Win11)'; Desc = 'Modelo flip en ventana sin bordes: menos latencia y permite VRR.'; Impact = 'Latencia'; Risk = 'Seguro'; Reboot = $false
                Test = { [string](Get-RegValue 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' 'DirectXUserGlobalSettings' '') -match 'SwapEffectUpgradeEnable=1' }
                Apply = { Set-DxGlobalSetting 'SwapEffectUpgradeEnable' '1' } })
    }
    $list.Add([pscustomobject]@{ Id = 'nicpower'; Name = 'Desactivar ahorro de energia de la tarjeta de red'; Desc = 'Quita Energy Efficient Ethernet / Green Ethernet y la suspension del adaptador: evita micro-cortes.'; Impact = 'Red'; Risk = 'Seguro'; Reboot = $true
            Test = { Test-NicPowerOff }
            Apply = { Set-NicPowerOff } })
    $list.Add([pscustomobject]@{ Id = 'dns'; Name = 'Usar el DNS mas rapido medido'; Desc = 'Acelera launcher, tienda y conexiones. NO cambia el ping dentro de la partida.'; Impact = 'Red'; Risk = 'Moderado'; Reboot = $false
            Test = { Test-FastestDns }
            Apply = { Set-FastestDns } })
    $list.Add([pscustomobject]@{ Id = 'deliveryopt'; Name = 'No compartir actualizaciones con otros PCs (P2P)'; Desc = 'Windows deja de subir actualizaciones a otros equipos de Internet: libera tu subida.'; Impact = 'Red'; Risk = 'Seguro'; Reboot = $false
            Test = { (Get-RegValue 'Registry::HKEY_USERS\S-1-5-20\Software\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Settings' 'DownloadMode' 1) -eq 0 -or (Get-RegValue 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' 'DODownloadMode' 1) -eq 0 }
            Apply = {
                try { Set-RegTweak 'Registry::HKEY_USERS\S-1-5-20\Software\Microsoft\Windows\CurrentVersion\DeliveryOptimization\Settings' 'DownloadMode' 0 }
                catch { Set-RegTweak 'HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization' 'DODownloadMode' 0 }
            } })
    $list.Add([pscustomobject]@{ Id = 'bgapps'; Name = 'Bloquear apps de la Tienda en segundo plano'; Desc = 'Las apps UWP no se ejecutan en segundo plano (puede quitar notificaciones de algunas apps de la Tienda).'; Impact = 'RAM/CPU'; Risk = 'Moderado'; Reboot = $false
            Test = { (Get-RegValue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' 'GlobalUserDisabled' 0) -eq 1 }
            Apply = { Set-RegTweak 'HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications' 'GlobalUserDisabled' 1; Set-RegTweak 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Search' 'BackgroundAppGlobalToggle' 0 } })
    $list.Add([pscustomobject]@{ Id = 'transparency'; Name = 'Desactivar transparencias de Windows'; Desc = 'Menos trabajo para el compositor de escritorio (DWM). Ganancia pequena.'; Impact = 'Fluidez'; Risk = 'Seguro'; Reboot = $false
            Test = { (Get-RegValue 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 1) -eq 0 }
            Apply = { Set-RegTweak 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize' 'EnableTransparency' 0 } })
    return $list
}

function Show-OptimizeMenu {
    if (-not (Test-AdminOrWarn)) { return }
    while ($true) {
        Clear-Host
        Show-Banner
        Write-Title 'OPTIMIZAR WINDOWS PARA FORTNITE'
        Write-Note 'Todas las optimizaciones son reversibles (menu U). Antes del primer cambio se crea un punto de restauracion.' 'Gray' 2
        Write-Host ''
        $cat = @(Get-TweakCatalog)
        Write-Host ('  {0,-3} {1,-11} {2,-46} {3,-9} {4}' -f '#', 'ESTADO', 'OPTIMIZACION', 'IMPACTO', 'RIESGO') -ForegroundColor DarkGray
        Write-Rule
        $state = @{}
        for ($i = 0; $i -lt $cat.Count; $i++) {
            $t = $cat[$i]
            $applied = $false
            try { $applied = [bool](& $t.Test $t) } catch { }
            $state[$t.Id] = $applied
            $nm = $t.Name; if ($nm.Length -gt 46) { $nm = $nm.Substring(0, 45) + '.' }
            Write-Host ('  {0,-3} ' -f ($i + 1)) -ForegroundColor White -NoNewline
            if ($applied) { Write-Host ('{0,-11} ' -f '[APLICADO]') -ForegroundColor Green -NoNewline }
            else { Write-Host ('{0,-11} ' -f '[PENDIENTE]') -ForegroundColor Yellow -NoNewline }
            Write-Host ('{0,-46} ' -f $nm) -ForegroundColor White -NoNewline
            Write-Host ('{0,-9} ' -f $t.Impact) -ForegroundColor Cyan -NoNewline
            $rc = 'Green'; if ($t.Risk -ne 'Seguro') { $rc = 'Yellow' }
            Write-Host $t.Risk -ForegroundColor $rc
        }
        Write-Rule
        Write-Host '  [A] Aplicar TODAS las seguras pendientes (recomendado)' -ForegroundColor Magenta
        Write-Host '  [1-n] Aplicar una o varias (ej: 1,3,5)   [D] Ver detalles   [0] Volver' -ForegroundColor Gray
        $o = Read-Option
        if ($o -eq '0' -or $o -eq '') { return }
        if ($o -eq 'D') {
            Write-Host ''
            for ($i = 0; $i -lt $cat.Count; $i++) {
                Write-Host ('  {0,2}. {1}' -f ($i + 1), $cat[$i].Name) -ForegroundColor White
                Write-Note $cat[$i].Desc 'Gray' 6
            }
            Wait-Candy
            continue
        }
        $sel = @()
        if ($o -eq 'A') { $sel = @($cat | Where-Object { $_.Risk -eq 'Seguro' -and -not $state[$_.Id] }) }
        else { foreach ($n in (Get-SelectionNumbers -Text $o -Max $cat.Count)) { $sel += $cat[$n - 1] } }
        if ($sel.Count -eq 0) { Write-Status INFO 'Nada que aplicar' 'Todo lo seleccionado ya esta aplicado'; Wait-Candy; continue }
        if (-not (New-CandyRestorePoint)) { continue }
        $needReboot = $false
        foreach ($t in $sel) {
            try {
                & $t.Apply $t
                Write-Status OK $t.Id $t.Name
                if ($t.Reboot) { $needReboot = $true }
            } catch {
                Write-Status FAIL $t.Id ($t.Name + ' -> ' + $_.Exception.Message)
                Write-CandyLog ('Fallo tweak {0}: {1}' -f $t.Id, $_.Exception.Message)
            }
        }
        if ($needReboot) { Write-Host ''; Write-Host '  Algunas optimizaciones requieren REINICIAR el PC para aplicarse.' -ForegroundColor Yellow }
        Wait-Candy
    }
}

# =============================================================================
#  CONFIGURACION DE FORTNITE (GameUserSettings.ini)
# =============================================================================
function Show-FortniteMenu {
    Clear-Host
    Show-Banner
    Write-Title 'OPTIMIZAR CONFIGURACION DE FORTNITE'
    $fn = Get-FortniteInfo
    if (-not $fn.Ini) {
        Write-Status WARN 'GameUserSettings.ini' 'No encontrado. Abre Fortnite una vez y cierralo.'
        Wait-Candy; return
    }
    if (Test-ProcessRunning $script:FnProcesses) {
        Write-Status FAIL 'Fortnite abierto' 'Cierra Fortnite por completo antes de continuar (lo sobrescribiria al salir).'
        Wait-Candy; return
    }
    $ini = Read-IniFile $fn.Ini
    $hz = (Get-MonitorRefresh).Current
    $fl = Get-IniValue $ini $script:FnRhiSection 'PreferredFeatureLevel'
    $rhi = Get-IniValue $ini $script:FnRhiSection 'PreferredRHI'
    $mode = 'DirectX 11'
    if ($fl -eq 'es31') { $mode = 'Modo Rendimiento' } elseif ($rhi -eq 'dx12') { $mode = 'DirectX 12' }
    Write-Status INFO 'Archivo' $fn.Ini
    Write-Status INFO 'Modo actual' $mode
    Write-Status INFO 'VSync' ([string](Get-IniValue $ini $script:FnMainSection 'bUseVSync'))
    Write-Status INFO 'Limite FPS' ([string](Get-IniValue $ini $script:FnMainSection 'FrameRateLimit'))
    Write-Status INFO 'Modo de ventana (0=completa)' ([string](Get-IniValue $ini $script:FnMainSection 'FullscreenMode'))
    Write-Status INFO 'Monitor' ('{0} Hz' -f $hz)
    Write-Host ''
    Write-Host '  PERFILES' -ForegroundColor Magenta
    Write-Host '  [1] Latencia minima    - solo VSync off, pantalla completa, limite FPS, sin aceleracion.' -ForegroundColor White
    Write-Host '                           No toca tu calidad grafica.  (RECOMENDADO)' -ForegroundColor DarkGray
    Write-Host '  [2] Competitivo DX12   - lo anterior + sombras/efectos/postproceso/follaje al minimo.' -ForegroundColor White
    Write-Host '                           Para GPUs modernas que quieren max FPS sin perder nitidez.' -ForegroundColor DarkGray
    Write-Host '  [3] Modo Rendimiento   - lo de [1] + renderizado "Performance" de Fortnite.' -ForegroundColor White
    Write-Host '                           Maximo FPS en PCs modestas o CPU limitadas. Graficos simples.' -ForegroundColor DarkGray
    Write-Host '  [R] Restaurar la ultima copia de seguridad del ini    [0] Volver' -ForegroundColor Gray
    $o = Read-Option 'Perfil'
    if ($o -eq 'R') { Restore-FortniteIni; return }
    if ($o -notin @('1', '2', '3')) { return }

    Write-Host ''
    Write-Host '  LIMITE DE FPS' -ForegroundColor Magenta
    $opts = @()
    if ($hz -gt 0) {
        $opts += @{ K = '1'; V = $hz; T = ('{0} FPS = frecuencia de tu monitor (recomendado)' -f $hz) }
        $opts += @{ K = '2'; V = [Math]::Max(30, $hz - 3); T = ('{0} FPS = monitor - 3 (para G-Sync / FreeSync)' -f [Math]::Max(30, $hz - 3)) }
        $opts += @{ K = '3'; V = $hz * 2; T = ('{0} FPS = doble del monitor (menos latencia si tu PC lo mantiene estable)' -f ($hz * 2)) }
    }
    $opts += @{ K = '4'; V = 0; T = 'Sin limite (usa NVIDIA Reflex On+Boost)' }
    $opts += @{ K = '5'; V = -1; T = 'Personalizado' }
    foreach ($x in $opts) { Write-Host ('  [{0}] {1}' -f $x.K, $x.T) -ForegroundColor White }
    $f = Read-Option 'Limite'
    $choice = $opts | Where-Object { $_.K -eq $f } | Select-Object -First 1
    if (-not $choice) { return }
    $fps = [int]$choice.V
    if ($fps -lt 0) {
        $c = Read-Option 'Escribe el limite de FPS (30-1000)'
        $tmp = 0
        if (-not [int]::TryParse($c, [ref]$tmp) -or $tmp -lt 30 -or $tmp -gt 1000) { Write-Status FAIL 'Valor invalido' $c; Wait-Candy; return }
        $fps = $tmp
    }

    # Copia de seguridad
    $stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $bk = Join-Path $script:BackupDir ('GameUserSettings_' + $stamp + '.ini')
    try { Copy-Item -LiteralPath $fn.Ini -Destination $bk -Force -ErrorAction Stop }
    catch { Write-Status FAIL 'Copia de seguridad' 'No se pudo crear; no se modifica nada.'; Wait-Candy; return }
    Add-Backup @{ Key = 'FortniteIni'; Type = 'Ini'; Target = $fn.Ini; BackupFile = $bk }
    Write-Status OK 'Copia de seguridad' $bk

    $changes = New-Object System.Collections.Generic.List[string]
    $set = {
        param($Section, $Key, $Value, [bool]$OnlyIfExists)
        if (Set-IniValue -Ini $ini -Section $Section -Key $Key -Value $Value -OnlyIfExists:$OnlyIfExists) { $changes.Add(('{0} = {1}' -f $Key, $Value)) }
    }
    & $set $script:FnMainSection 'bUseVSync' 'False' $false
    & $set $script:FnMainSection 'FrameRateLimit' ('{0}.000000' -f $fps) $false
    foreach ($k in @('FullscreenMode', 'LastConfirmedFullscreenMode', 'PreferredFullscreenMode')) { & $set $script:FnMainSection $k '0' $true }
    & $set $script:FnMainSection 'bDisableMouseAcceleration' 'True' $true
    if ($o -eq '2') {
        if ($fl -eq 'es31') {
            & $set $script:FnRhiSection 'PreferredRHI' 'dx12' $false
            if (Remove-IniValue -Ini $ini -Section $script:FnRhiSection -Key 'PreferredFeatureLevel') { $changes.Add('PreferredFeatureLevel (eliminado: Fortnite elegira el de DX12)') }
        } elseif ($rhi -ne 'dx12') { & $set $script:FnRhiSection 'PreferredRHI' 'dx12' $false }
        foreach ($k in @('sg.ShadowQuality', 'sg.GlobalIlluminationQuality', 'sg.ReflectionQuality', 'sg.PostProcessQuality', 'sg.EffectsQuality', 'sg.FoliageQuality')) { & $set $script:FnSgSection $k '0' $true }
    }
    if ($o -eq '3') {
        & $set $script:FnRhiSection 'PreferredRHI' 'dx11' $false
        & $set $script:FnRhiSection 'PreferredFeatureLevel' 'es31' $false
    }
    if ($changes.Count -eq 0) {
        Write-Status OK 'Sin cambios' 'Tu configuracion ya coincide con el perfil.'
        Wait-Candy; return
    }
    try {
        $ro = (Get-Item -LiteralPath $fn.Ini).IsReadOnly
        if ($ro) { Set-ItemProperty -LiteralPath $fn.Ini -Name IsReadOnly -Value $false }
        Write-IniFile -Ini $ini
        if ($ro) { Set-ItemProperty -LiteralPath $fn.Ini -Name IsReadOnly -Value $true }
        Write-Host ''
        Write-Host '  Cambios aplicados:' -ForegroundColor Green
        foreach ($c in $changes) { Write-Host ('    + ' + $c) -ForegroundColor Gray }
        Write-Host ''
        Write-Note 'Dentro de Fortnite revisa tambien: NVIDIA Reflex = Activado + Impulso (o AMD Anti-Lag en Adrenalin), Region de emparejamiento = tu mejor region, y "Mostrar FPS" para verificar.' 'Cyan' 2
        Write-CandyLog ('Fortnite ini perfil {0} aplicado ({1} cambios)' -f $o, $changes.Count)
    } catch {
        Write-Status FAIL 'Escritura' $_.Exception.Message
        try { Copy-Item -LiteralPath $bk -Destination $fn.Ini -Force } catch { }
    }
    Wait-Candy
}

function Restore-FortniteIni {
    $fn = Get-FortniteInfo
    $last = Get-ChildItem -LiteralPath $script:BackupDir -Filter 'GameUserSettings_*.ini' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $last -or -not $fn.Ini) { Write-Status WARN 'Restaurar' 'No hay copias de seguridad.'; Wait-Candy; return }
    if (Test-ProcessRunning $script:FnProcesses) { Write-Status FAIL 'Fortnite abierto' 'Cierralo primero.'; Wait-Candy; return }
    if (Confirm-Candy ('Restaurar ' + $last.Name + '?')) {
        Copy-Item -LiteralPath $last.FullName -Destination $fn.Ini -Force
        Write-Status OK 'Restaurado' $last.Name
    }
    Wait-Candy
}

# =============================================================================
#  LIMPIEZA DE BASURA
# =============================================================================
function Invoke-CleanPath {
    param([string]$Path, [double]$MinAgeHours = 0, [switch]$Delete)
    $res = [pscustomobject]@{ Bytes = [long]0; Files = 0; Failed = 0 }
    try {
        $root = New-Object IO.DirectoryInfo($Path)
        if (-not $root.Exists) { return $res }
        if ([int]($root.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return $res }
    } catch { return $res }
    $cutoff = (Get-Date).AddHours(-$MinAgeHours)
    $dirs = New-Object System.Collections.Generic.List[IO.DirectoryInfo]
    $stack = New-Object System.Collections.Generic.Stack[IO.DirectoryInfo]
    $stack.Push($root)
    while ($stack.Count -gt 0) {
        $d = $stack.Pop()
        $items = $null
        try { $items = $d.GetFileSystemInfos() } catch { $res.Failed++; continue }
        foreach ($it in $items) {
            # Nunca seguir enlaces simbolicos / junctions: evita borrar fuera de la carpeta
            if ([int]($it.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
            if ($it -is [IO.DirectoryInfo]) { $stack.Push($it); $dirs.Add($it); continue }
            if ($MinAgeHours -gt 0 -and $it.LastWriteTime -gt $cutoff) { continue }
            $len = [long]0
            try { $len = $it.Length } catch { }
            if ($Delete) {
                try {
                    if ($it.IsReadOnly) { $it.IsReadOnly = $false }
                    $it.Delete()
                    $res.Bytes += $len; $res.Files++
                } catch { $res.Failed++ }
            } else { $res.Bytes += $len; $res.Files++ }
        }
    }
    if ($Delete) {
        for ($i = $dirs.Count - 1; $i -ge 0; $i--) {
            try {
                $dd = $dirs[$i]; $dd.Refresh()
                if ($dd.Exists -and @($dd.GetFileSystemInfos()).Count -eq 0) { $dd.Delete() }
            } catch { }
        }
    }
    return $res
}

function Invoke-CleanFiles {
    param([string[]]$Patterns, [switch]$Delete)
    $res = [pscustomobject]@{ Bytes = [long]0; Files = 0; Failed = 0 }
    foreach ($pat in $Patterns) {
        foreach ($f in @(Get-ChildItem -Path $pat -File -Force -ErrorAction SilentlyContinue)) {
            if ([int]($f.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
            if ($Delete) {
                try { $len = $f.Length; Remove-Item -LiteralPath $f.FullName -Force -ErrorAction Stop; $res.Bytes += $len; $res.Files++ } catch { $res.Failed++ }
            } else { $res.Bytes += $f.Length; $res.Files++ }
        }
    }
    return $res
}

function Resolve-CleanDirs {
    param([string[]]$Patterns)
    $out = New-Object System.Collections.Generic.List[string]
    foreach ($p in $Patterns) {
        if (-not $p) { continue }
        if ($p -match '[\*\?]') {
            foreach ($r in @(Resolve-Path -Path $p -ErrorAction SilentlyContinue)) { if (Test-Path -LiteralPath $r.ProviderPath -PathType Container) { $out.Add($r.ProviderPath) } }
        } elseif (Test-Path -LiteralPath $p -PathType Container) { $out.Add($p) }
    }
    return , $out
}

function Get-CleanCatalog {
    $la = $env:LOCALAPPDATA; $ad = $env:APPDATA; $win = $env:SystemRoot; $pd = $env:ProgramData
    $browserProcs = @('chrome', 'msedge', 'brave', 'opera', 'firefox', 'vivaldi')
    $cats = @(
        @{ Id = 'usertemp'; Name = 'Temporales del usuario (%TEMP%)'; Rec = $true; Age = 24
            Dirs = @($env:TEMP) },
        @{ Id = 'wintemp'; Name = 'Temporales de Windows'; Rec = $true; Age = 24; Admin = $true
            Dirs = @("$win\Temp") },
        @{ Id = 'wu'; Name = 'Descargas viejas de Windows Update'; Rec = $true; Age = 0; Admin = $true; Services = @('wuauserv', 'bits')
            Dirs = @("$win\SoftwareDistribution\Download") },
        @{ Id = 'do'; Name = 'Cache de Optimizacion de distribucion'; Rec = $true; Age = 0; Admin = $true
            Dirs = @("$win\ServiceProfiles\NetworkService\AppData\Local\Microsoft\Windows\DeliveryOptimization\Cache") },
        @{ Id = 'dumps'; Name = 'Volcados de errores e informes (WER)'; Rec = $true; Age = 0; Admin = $true
            Dirs = @("$la\CrashDumps", "$win\Minidump", "$pd\Microsoft\Windows\WER\ReportArchive", "$pd\Microsoft\Windows\WER\ReportQueue", "$la\Microsoft\Windows\WER\ReportArchive", "$la\Microsoft\Windows\WER\ReportQueue")
            Files = @("$win\MEMORY.DMP") },
        @{ Id = 'winlogs'; Name = 'Logs antiguos de Windows (CBS/DISM, +7 dias)'; Rec = $true; Age = 168; Admin = $true
            Dirs = @("$win\Logs\CBS", "$win\Logs\DISM") },
        @{ Id = 'thumbs'; Name = 'Cache de miniaturas del Explorador'; Rec = $true; Age = 0
            Files = @("$la\Microsoft\Windows\Explorer\thumbcache_*.db") },
        @{ Id = 'fnlogs'; Name = 'Logs, crashes y webcache de Fortnite / Epic'; Rec = $true; Age = 0; Procs = @('FortniteClient-Win64-Shipping', 'EpicGamesLauncher')
            Dirs = @("$la\FortniteGame\Saved\Logs", "$la\FortniteGame\Saved\Crashes", "$la\EpicGamesLauncher\Saved\Logs", "$la\EpicGamesLauncher\Saved\webcache*", "$la\EpicGamesLauncher\Saved\Crashes") },
        @{ Id = 'browsers'; Name = 'Cache de navegadores (NO borra sesiones/contrasenas)'; Rec = $true; Age = 0; Procs = $browserProcs
            Dirs = @("$la\Google\Chrome\User Data\*\Cache", "$la\Google\Chrome\User Data\*\Code Cache", "$la\Google\Chrome\User Data\*\GPUCache",
                "$la\Microsoft\Edge\User Data\*\Cache", "$la\Microsoft\Edge\User Data\*\Code Cache", "$la\Microsoft\Edge\User Data\*\GPUCache",
                "$la\BraveSoftware\Brave-Browser\User Data\*\Cache", "$la\BraveSoftware\Brave-Browser\User Data\*\Code Cache",
                "$la\Vivaldi\User Data\*\Cache", "$la\Opera Software\Opera GX Stable\Cache", "$la\Opera Software\Opera Stable\Cache",
                "$ad\Opera Software\Opera GX Stable\Code Cache", "$la\Mozilla\Firefox\Profiles\*\cache2") },
        @{ Id = 'discord'; Name = 'Cache de Discord'; Rec = $true; Age = 0; Procs = @('Discord')
            Dirs = @("$ad\discord\Cache", "$ad\discord\Code Cache", "$ad\discord\GPUCache") },
        @{ Id = 'shader'; Name = 'Cache de shaders (DirectX / NVIDIA / AMD)'; Rec = $false; Age = 0; Procs = @('FortniteClient-Win64-Shipping')
            Warn = 'Solo tras actualizar el driver o si hay tirones/crasheos: las primeras partidas recompilaran shaders (stutter temporal).'
            Dirs = @("$la\D3DSCache", "$la\NVIDIA\DXCache", "$la\NVIDIA\GLCache", "$env:USERPROFILE\AppData\LocalLow\NVIDIA\PerDriverVersion\DXCache", "$la\AMD\DxCache", "$la\AMD\DxcCache", "$la\AMD\VkCache", "$la\AMD\GLCache") },
        @{ Id = 'recycle'; Name = 'Papelera de reciclaje'; Rec = $false; Age = 0; Special = 'recycle'
            Warn = 'Los archivos de la papelera no se podran recuperar.' },
        @{ Id = 'dism'; Name = 'Limpieza profunda de componentes de Windows (DISM)'; Rec = $false; Age = 0; Admin = $true; Special = 'dism'
            Warn = 'Tarda 5-15 minutos. Elimina versiones antiguas de actualizaciones (no podras desinstalarlas).' }
    )
    return $cats
}

function Get-RecycleBinSize {
    try {
        $sh = New-Object -ComObject Shell.Application
        $sum = [long]0; $count = 0
        foreach ($it in @($sh.NameSpace(10).Items())) { try { $sum += [long]$it.ExtendedProperty('Size') } catch { }; $count++ }
        return [pscustomobject]@{ Bytes = $sum; Files = $count; Failed = 0 }
    } catch { return [pscustomobject]@{ Bytes = [long]0; Files = 0; Failed = 0 } }
}

function Measure-CleanCategory {
    param($Cat, [switch]$Delete)
    $total = [pscustomobject]@{ Bytes = [long]0; Files = 0; Failed = 0 }
    if ($Cat.Special -eq 'recycle') {
        if ($Delete) {
            $before = Get-RecycleBinSize
            try { Clear-RecycleBin -Force -ErrorAction Stop } catch { }
            return $before
        }
        return (Get-RecycleBinSize)
    }
    if ($Cat.Special -eq 'dism') { return $total }
    foreach ($d in (Resolve-CleanDirs -Patterns @($Cat.Dirs))) {
        $r = Invoke-CleanPath -Path $d -MinAgeHours $Cat.Age -Delete:$Delete
        $total.Bytes += $r.Bytes; $total.Files += $r.Files; $total.Failed += $r.Failed
    }
    if ($Cat.Files) {
        $r = Invoke-CleanFiles -Patterns @($Cat.Files) -Delete:$Delete
        $total.Bytes += $r.Bytes; $total.Files += $r.Files; $total.Failed += $r.Failed
    }
    return $total
}

function Get-FreeSpace {
    try { return [double](Get-CimInstance Win32_LogicalDisk -Filter ("DeviceID='{0}'" -f $env:SystemDrive) -ErrorAction Stop).FreeSpace } catch { return 0 }
}

function Show-CleanMenu {
    Clear-Host
    Show-Banner
    Write-Title 'LIMPIEZA DE BASURA'
    Write-Step 'Analizando (no se borra nada todavia)...'
    $cats = @(Get-CleanCatalog | Where-Object { -not $_.Admin -or $script:IsAdmin })
    $scan = @{}
    $i = 0
    Write-Host ''
    Write-Host ('  {0,-3} {1,-4} {2,-52} {3,12}' -f '#', 'REC', 'CATEGORIA', 'TAMANO') -ForegroundColor DarkGray
    Write-Rule
    $sumRec = [long]0
    foreach ($c in $cats) {
        $i++
        $r = Measure-CleanCategory $c
        $scan[$c.Id] = $r
        $rec = ''; if ($c.Rec) { $rec = ' * '; $sumRec += $r.Bytes }
        $size = Format-Bytes $r.Bytes
        if ($c.Special -eq 'dism') { $size = '?' }
        $nm = $c.Name; if ($nm.Length -gt 52) { $nm = $nm.Substring(0, 51) + '.' }
        $col = 'White'; if ($r.Bytes -gt 500MB) { $col = 'Yellow' }
        Write-Host ('  {0,-3} {1,-4} {2,-52} {3,12}' -f $i, $rec, $nm, $size) -ForegroundColor $col
        if ($c.Procs -and (Test-ProcessRunning $c.Procs)) { Write-Host '               (programa abierto: se omitiran archivos en uso; cierralo para limpiar todo)' -ForegroundColor DarkGray }
    }
    Write-Rule
    if (Test-Path -LiteralPath "$env:SystemDrive\Windows.old") { Write-Note 'Se detecto Windows.old (instalacion anterior). Para borrarlo: Configuracion > Sistema > Almacenamiento > Archivos temporales > "Instalaciones previas de Windows".' 'Yellow' 2 }
    Write-Host ('  Recomendadas (*): ' + (Format-Bytes $sumRec)) -ForegroundColor Green
    Write-Host '  [A] Limpiar recomendadas   [1-n] Elegir (ej: 1,2,5)   [T] Todas   [0] Volver' -ForegroundColor Gray
    if (-not $script:IsAdmin) { Write-Note 'Sin permisos de administrador: solo se muestran categorias del usuario.' 'Yellow' 2 }
    $o = Read-Option
    if ($o -eq '0' -or $o -eq '') { return }
    $sel = @()
    if ($o -eq 'A') { $sel = @($cats | Where-Object { $_.Rec }) }
    elseif ($o -eq 'T') { $sel = $cats }
    else { foreach ($n in (Get-SelectionNumbers -Text $o -Max $cats.Count)) { $sel += $cats[$n - 1] } }
    if ($sel.Count -eq 0) { return }
    $warns = @($sel | Where-Object { $_.Warn })
    foreach ($w in $warns) { Write-Status WARN $w.Name $w.Warn }
    if ($warns.Count -gt 0 -and -not (Confirm-Candy 'Continuar con estas categorias?')) { return }

    $free0 = Get-FreeSpace
    $freed = [long]0; $files = 0; $failed = 0
    Write-Host ''
    foreach ($c in $sel) {
        Write-Step ($c.Name + '...') -NoNewline
        if ($c.Services) { foreach ($s in $c.Services) { Stop-Service -Name $s -Force -ErrorAction SilentlyContinue } }
        if ($c.Id -eq 'do') { try { Delete-DeliveryOptimizationCache -Force -ErrorAction Stop | Out-Null } catch { } }
        if ($c.Special -eq 'dism') {
            Write-Host ''
            & dism.exe /Online /Cleanup-Image /StartComponentCleanup
            Write-Host ''
            continue
        }
        $r = Measure-CleanCategory $c -Delete
        if ($c.Services) { foreach ($s in $c.Services) { Start-Service -Name $s -ErrorAction SilentlyContinue } }
        $freed += $r.Bytes; $files += $r.Files; $failed += $r.Failed
        Write-Host (' {0}' -f (Format-Bytes $r.Bytes)) -ForegroundColor Green
    }
    $free1 = Get-FreeSpace
    Write-Host ''
    Write-Rule 'Green'
    Write-Host ('  Liberado: {0}  |  {1} archivos  |  {2} en uso (omitidos)' -f (Format-Bytes $freed), $files, $failed) -ForegroundColor Green
    if ($free1 -gt 0) { Write-Host ('  Espacio libre en {0}: {1} -> {2}' -f $env:SystemDrive, (Format-Bytes $free0), (Format-Bytes $free1)) -ForegroundColor Gray }
    Write-CandyLog ('Limpieza: {0} liberados' -f (Format-Bytes $freed))
    Wait-Candy
}

# =============================================================================
#  APPS DE INICIO (mismo mecanismo que el Administrador de tareas: StartupApproved)
# =============================================================================
function Get-StartupItems {
    $items = New-Object System.Collections.Generic.List[object]
    $sources = @(
        @{ Scope = 'Usuario'; Run = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'; Approved = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' },
        @{ Scope = 'Equipo'; Run = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'; Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run' },
        @{ Scope = 'Equipo32'; Run = 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run'; Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\Run32' }
    )
    foreach ($s in $sources) {
        try {
            $k = Get-Item -LiteralPath $s.Run -ErrorAction Stop
            foreach ($n in $k.GetValueNames()) {
                if (-not $n) { continue }
                $cmd = [string]$k.GetValue($n)
                $items.Add([pscustomobject]@{ Name = $n; Command = $cmd; Scope = $s.Scope; Approved = $s.Approved; Enabled = (Test-StartupEnabled $s.Approved $n) })
            }
        } catch { }
    }
    $folders = @(
        @{ Scope = 'Carpeta usuario'; Path = [Environment]::GetFolderPath('Startup'); Approved = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder' },
        @{ Scope = 'Carpeta comun'; Path = [Environment]::GetFolderPath('CommonStartup'); Approved = 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Explorer\StartupApproved\StartupFolder' }
    )
    foreach ($f in $folders) {
        if (-not $f.Path -or -not (Test-Path -LiteralPath $f.Path)) { continue }
        foreach ($file in @(Get-ChildItem -LiteralPath $f.Path -File -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'desktop.ini' })) {
            $items.Add([pscustomobject]@{ Name = $file.Name; Command = $file.FullName; Scope = $f.Scope; Approved = $f.Approved; Enabled = (Test-StartupEnabled $f.Approved $file.Name) })
        }
    }
    return $items
}

function Test-StartupEnabled {
    param([string]$ApprovedKey, [string]$Name)
    $v = Get-RegValue $ApprovedKey $Name $null
    if ($v -is [byte[]] -and $v.Length -gt 0) { return (($v[0] % 2) -eq 0) }
    return $true
}

function Set-StartupItemState {
    param($Item, [bool]$Enable)
    $data = New-Object byte[] 12
    if ($Enable) { $data[0] = 2 } else {
        $data[0] = 3
        $ft = [BitConverter]::GetBytes((Get-Date).ToFileTime())
        [Array]::Copy($ft, 0, $data, 4, 8)
    }
    Set-RegTweak $Item.Approved $Item.Name $data 'Binary'
}

function Get-StartupHint {
    param($Item)
    $t = $Item.Name + ' ' + $Item.Command
    if ($t -match 'SecurityHealth|Windows Defender|MsMpEng|ctfmon|RtkAud|Realtek|Waves|Nahimic|igfx|Synaptics|ELAN|NvBackend|AMDNoiseSuppression|RadeonSoftware|cncmd') { return 'Sistema/driver' }
    if ($t -match 'Spotify|Discord|Steam|EpicGamesLauncher|OneDrive|Teams|ms-teams|MicrosoftEdgeAutoLaunch|Opera|Brave|Chrome|Adobe|CCXProcess|Creative Cloud|Skype|uTorrent|BitTorrent|qBittorrent|Battle\.net|EADesktop|Origin|Ubisoft|upc\.exe|Riot|GOG|Dropbox|GoogleDrive|iCloud|Zoom|Telegram|WhatsApp|Overwolf|Wallpaper|CCleaner') { return 'Recomendado desactivar' }
    return ''
}

function Show-StartupMenu {
    if (-not (Test-AdminOrWarn)) { return }
    while ($true) {
        Clear-Host
        Show-Banner
        Write-Title 'APPS QUE ARRANCAN CON WINDOWS'
        $items = @(Get-StartupItems | Sort-Object @{ Expression = { -not $_.Enabled } }, Name)
        if ($items.Count -eq 0) { Write-Status OK 'Inicio' 'No hay programas de inicio.'; Wait-Candy; return }
        Write-Host ('  {0,-3} {1,-10} {2,-34} {3,-15} {4}' -f '#', 'ESTADO', 'PROGRAMA', 'AMBITO', 'SUGERENCIA') -ForegroundColor DarkGray
        Write-Rule
        for ($i = 0; $i -lt $items.Count; $i++) {
            $it = $items[$i]
            $nm = $it.Name; if ($nm.Length -gt 34) { $nm = $nm.Substring(0, 33) + '.' }
            $hint = Get-StartupHint $it
            Write-Host ('  {0,-3} ' -f ($i + 1)) -NoNewline -ForegroundColor White
            if ($it.Enabled) { Write-Host ('{0,-10} ' -f 'ACTIVO') -NoNewline -ForegroundColor Yellow } else { Write-Host ('{0,-10} ' -f 'apagado') -NoNewline -ForegroundColor DarkGray }
            Write-Host ('{0,-34} {1,-15} ' -f $nm, $it.Scope) -NoNewline -ForegroundColor Gray
            $hc = 'DarkGray'; if ($hint -eq 'Recomendado desactivar') { $hc = 'Magenta' }
            Write-Host $hint -ForegroundColor $hc
        }
        Write-Rule
        Write-Host '  [R] Desactivar todos los "Recomendado desactivar"   [1-n] Alternar activo/apagado' -ForegroundColor Gray
        Write-Host '  [0] Volver      (Los cambios son reversibles aqui mismo o en el menu U)' -ForegroundColor Gray
        $o = Read-Option
        if ($o -eq '0' -or $o -eq '') { return }
        $targets = @()
        if ($o -eq 'R') { $targets = @($items | Where-Object { $_.Enabled -and (Get-StartupHint $_) -eq 'Recomendado desactivar' }) }
        else { foreach ($n in (Get-SelectionNumbers -Text $o -Max $items.Count)) { $targets += $items[$n - 1] } }
        foreach ($t in $targets) {
            $en = -not $t.Enabled
            if ($o -eq 'R') { $en = $false }
            try {
                Set-StartupItemState -Item $t -Enable $en
                $txt = 'desactivado'; if ($en) { $txt = 'activado' }
                Write-Status OK $t.Name $txt
            } catch { Write-Status FAIL $t.Name $_.Exception.Message }
        }
        if ($targets.Count -gt 0) { Start-Sleep -Milliseconds 900 }
    }
}

# =============================================================================
#  MODO PARTIDA (cerrar procesos de fondo antes de jugar)
# =============================================================================
function Get-GameModeCatalog {
    return @(
        @{ Proc = 'OneDrive'; Label = 'OneDrive'; Why = 'sincroniza archivos (disco y red)'; Rec = $true },
        @{ Proc = 'Dropbox'; Label = 'Dropbox'; Why = 'sincroniza archivos (disco y red)'; Rec = $true },
        @{ Proc = 'GoogleDriveFS'; Label = 'Google Drive'; Why = 'sincroniza archivos (disco y red)'; Rec = $true },
        @{ Proc = 'qbittorrent'; Label = 'qBittorrent'; Why = 'satura la red: sube el ping'; Rec = $true },
        @{ Proc = 'uTorrent'; Label = 'uTorrent'; Why = 'satura la red: sube el ping'; Rec = $true },
        @{ Proc = 'BitTorrent'; Label = 'BitTorrent'; Why = 'satura la red: sube el ping'; Rec = $true },
        @{ Proc = 'steam'; Label = 'Steam'; Why = 'launcher + descargas en segundo plano'; Rec = $true },
        @{ Proc = 'steamwebhelper'; Label = 'Steam (web helper)'; Why = 'navegador interno del launcher'; Rec = $true },
        @{ Proc = 'Battle.net'; Label = 'Battle.net'; Why = 'launcher + descargas'; Rec = $true },
        @{ Proc = 'EADesktop'; Label = 'EA App'; Why = 'launcher + descargas'; Rec = $true },
        @{ Proc = 'upc'; Label = 'Ubisoft Connect'; Why = 'launcher + descargas'; Rec = $true },
        @{ Proc = 'RiotClientServices'; Label = 'Riot Client'; Why = 'launcher'; Rec = $true; Game = 'Valorant' },
        @{ Proc = 'GalaxyClient'; Label = 'GOG Galaxy'; Why = 'launcher'; Rec = $true },
        @{ Proc = 'ms-teams'; Label = 'Microsoft Teams'; Why = 'RAM y CPU'; Rec = $true },
        @{ Proc = 'Teams'; Label = 'Microsoft Teams (clasico)'; Why = 'RAM y CPU'; Rec = $true },
        @{ Proc = 'Skype'; Label = 'Skype'; Why = 'RAM'; Rec = $true },
        @{ Proc = 'Widgets'; Label = 'Widgets de Windows'; Why = 'RAM y red'; Rec = $true },
        @{ Proc = 'PhoneExperienceHost'; Label = 'Enlace movil'; Why = 'RAM'; Rec = $true },
        @{ Proc = 'Creative Cloud'; Label = 'Adobe Creative Cloud'; Why = 'RAM y red'; Rec = $true },
        @{ Proc = 'CCXProcess'; Label = 'Adobe CCX'; Why = 'RAM'; Rec = $true },
        @{ Proc = 'AdobeIPCBroker'; Label = 'Adobe IPC'; Why = 'RAM'; Rec = $true },
        @{ Proc = 'wallpaper64'; Label = 'Wallpaper Engine'; Why = 'usa GPU constantemente'; Rec = $true },
        @{ Proc = 'wallpaper32'; Label = 'Wallpaper Engine (32)'; Why = 'usa GPU constantemente'; Rec = $true },
        @{ Proc = 'Lively'; Label = 'Lively Wallpaper'; Why = 'usa GPU constantemente'; Rec = $true },
        @{ Proc = 'Overwolf'; Label = 'Overwolf'; Why = 'overlay: latencia y stutter'; Rec = $true },
        @{ Proc = 'chrome'; Label = 'Google Chrome'; Why = 'mucha RAM (cierra pestanas abiertas)'; Rec = $false },
        @{ Proc = 'msedge'; Label = 'Microsoft Edge'; Why = 'mucha RAM'; Rec = $false },
        @{ Proc = 'firefox'; Label = 'Firefox'; Why = 'mucha RAM'; Rec = $false },
        @{ Proc = 'opera'; Label = 'Opera / Opera GX'; Why = 'mucha RAM'; Rec = $false },
        @{ Proc = 'brave'; Label = 'Brave'; Why = 'mucha RAM'; Rec = $false },
        @{ Proc = 'Spotify'; Label = 'Spotify'; Why = 'RAM (cierralo si no escuchas musica)'; Rec = $false },
        @{ Proc = 'Discord'; Label = 'Discord'; Why = 'desactiva su overlay y la aceleracion por hardware'; Rec = $false },
        @{ Proc = 'iCUE'; Label = 'Corsair iCUE'; Why = 'software RGB: CPU y DPC latency'; Rec = $false },
        @{ Proc = 'ArmouryCrate'; Label = 'Armoury Crate'; Why = 'software RGB/placa: CPU'; Rec = $false },
        @{ Proc = 'LightingService'; Label = 'ASUS Aura'; Why = 'software RGB'; Rec = $false },
        @{ Proc = 'SteelSeriesGG'; Label = 'SteelSeries GG'; Why = 'software de perifericos'; Rec = $false },
        @{ Proc = 'RazerCentral'; Label = 'Razer Synapse'; Why = 'software de perifericos'; Rec = $false }
    )
}

# =============================================================================
#  NATIVO (P/Invoke) - purga de memoria standby y ajustes temporales de sesion
# =============================================================================
function Initialize-CandyNative {
    if ('CandyNative' -as [type]) { return $true }
    $code = @'
using System;
using System.Runtime.InteropServices;
public static class CandyNative {
    [StructLayout(LayoutKind.Sequential, Pack = 1)]
    private struct TOKEN_PRIVILEGES { public int Count; public long Luid; public int Attr; }
    [StructLayout(LayoutKind.Sequential)]
    private struct SIMPLEKEYS { public uint cbSize; public uint dwFlags; }
    [StructLayout(LayoutKind.Sequential)]
    private struct FILTERKEYS { public uint cbSize; public uint dwFlags; public uint iWaitMSec; public uint iDelayMSec; public uint iRepeatMSec; public uint iBounceMSec; }

    [DllImport("advapi32.dll", SetLastError = true)] private static extern bool OpenProcessToken(IntPtr h, int access, out IntPtr token);
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)] private static extern bool LookupPrivilegeValue(string host, string name, out long luid);
    [DllImport("advapi32.dll", SetLastError = true)] private static extern bool AdjustTokenPrivileges(IntPtr token, bool disableAll, ref TOKEN_PRIVILEGES state, int len, IntPtr prev, IntPtr retLen);
    [DllImport("kernel32.dll")] private static extern IntPtr GetCurrentProcess();
    [DllImport("kernel32.dll")] private static extern bool CloseHandle(IntPtr h);
    [DllImport("ntdll.dll")] private static extern int NtSetSystemInformation(int infoClass, ref int info, int length);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool SystemParametersInfo(uint action, uint param, int[] vparam, uint winIni);
    [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfo")] private static extern bool SpiSimple(uint action, uint param, ref SIMPLEKEYS vparam, uint winIni);
    [DllImport("user32.dll", SetLastError = true, EntryPoint = "SystemParametersInfo")] private static extern bool SpiFilter(uint action, uint param, ref FILTERKEYS vparam, uint winIni);

    private static bool EnablePrivilege(string name) {
        IntPtr token;
        if (!OpenProcessToken(GetCurrentProcess(), 0x28, out token)) return false;
        try {
            TOKEN_PRIVILEGES tp;
            tp.Count = 1; tp.Attr = 2;
            if (!LookupPrivilegeValue(null, name, out tp.Luid)) return false;
            if (!AdjustTokenPrivileges(token, false, ref tp, 0, IntPtr.Zero, IntPtr.Zero)) return false;
            return Marshal.GetLastWin32Error() == 0;
        } finally { CloseHandle(token); }
    }

    // 0 = OK. Purga la lista de memoria standby (lo mismo que RAMMap / ISLC).
    public static int PurgeStandbyList() {
        if (!EnablePrivilege("SeProfileSingleProcessPrivilege")) return -1;
        int command = 4;
        return NtSetSystemInformation(80, ref command, 4);
    }

    // Cambia la aceleracion del raton SOLO para esta sesion (no se guarda en el registro).
    public static bool SetMouseSession(int threshold1, int threshold2, int speed) {
        return SystemParametersInfo(0x0004, 0, new int[] { threshold1, threshold2, speed }, 0);
    }

    // Desactiva/restaura los atajos de Teclas especiales, Filtro y Alternancia SOLO para esta sesion.
    public static bool SetAccessibilityHotkeys(bool enable) {
        bool ok = true;
        uint[,] pairs = new uint[,] { { 0x003A, 0x003B }, { 0x0034, 0x0035 } };
        for (int i = 0; i < 2; i++) {
            SIMPLEKEYS k = new SIMPLEKEYS(); k.cbSize = 8;
            if (SpiSimple(pairs[i, 0], 8, ref k, 0)) {
                if (enable) k.dwFlags |= 4u; else k.dwFlags &= ~4u;
                ok &= SpiSimple(pairs[i, 1], 8, ref k, 0);
            } else ok = false;
        }
        FILTERKEYS f = new FILTERKEYS(); f.cbSize = 24;
        if (SpiFilter(0x0032, 24, ref f, 0)) {
            if (enable) f.dwFlags |= 4u; else f.dwFlags &= ~4u;
            ok &= SpiFilter(0x0033, 24, ref f, 0);
        } else ok = false;
        return ok;
    }
}
'@
    try { Add-Type -TypeDefinition $code -Language CSharp -ErrorAction Stop; return $true }
    catch { Write-CandyLog ('Add-Type nativo fallo: ' + $_.Exception.Message); return $false }
}

function Invoke-PurgeStandby {
    if (-not (Initialize-CandyNative)) { return $false }
    try { return ([CandyNative]::PurgeStandbyList() -eq 0) } catch { return $false }
}

function Restore-SessionInputSettings {
    # Vuelve a aplicar lo que hay guardado en el registro (estado permanente del usuario)
    if (-not (Initialize-CandyNative)) { return }
    try {
        $m = 'HKCU:\Control Panel\Mouse'
        $t1 = [int](Get-RegValue $m 'MouseThreshold1' '6'); $t2 = [int](Get-RegValue $m 'MouseThreshold2' '10'); $sp = [int](Get-RegValue $m 'MouseSpeed' '1')
        [void][CandyNative]::SetMouseSession($t1, $t2, $sp)
    } catch { }
    try {
        $sk = [int](Get-RegValue 'HKCU:\Control Panel\Accessibility\StickyKeys' 'Flags' '510')
        $en = (($sk -band 4) -ne 0)
        [void][CandyNative]::SetAccessibilityHotkeys($en)
    } catch { }
}

# =============================================================================
#  JUEGOS: VALORANT
# =============================================================================
function Get-RiotClientPath {
    $json = Join-Path $env:ProgramData 'Riot Games\RiotClientInstalls.json'
    if (Test-Path -LiteralPath $json) {
        try {
            $j = Get-Content -LiteralPath $json -Raw | ConvertFrom-Json
            foreach ($k in @('rc_default', 'rc_live')) {
                if ($j.PSObject.Properties[$k] -and (Test-Path -LiteralPath $j.$k)) { return [string]$j.$k }
            }
        } catch { }
    }
    foreach ($d in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
        $c = Join-Path $d.Root 'Riot Games\Riot Client\RiotClientServices.exe'
        if (Test-Path -LiteralPath $c) { return $c }
    }
    return $null
}

function Get-ValorantInfo {
    $info = [ordered]@{ Installed = $false; Path = $null; Exe = $null; Drive = $null; RiotClient = (Get-RiotClientPath) }
    $yaml = Join-Path $env:ProgramData 'Riot Games\Metadata\valorant.live\valorant.live.product_settings.yaml'
    if (Test-Path -LiteralPath $yaml) {
        try {
            $t = Get-Content -LiteralPath $yaml -Raw
            $m = [regex]::Match($t, 'product_install_full_path:\s*"?([^"\r\n]+)"?')
            if ($m.Success) {
                $p = $m.Groups[1].Value.Trim().Replace('/', '\')
                if (Test-Path -LiteralPath $p) { $info.Path = $p }
            }
        } catch { }
    }
    if (-not $info.Path) {
        foreach ($d in @(Get-PSDrive -PSProvider FileSystem -ErrorAction SilentlyContinue)) {
            $c = Join-Path $d.Root 'Riot Games\VALORANT\live'
            if (Test-Path -LiteralPath (Join-Path $c 'ShooterGame')) { $info.Path = $c; break }
        }
    }
    if ($info.Path) {
        $info.Installed = $true
        $exe = Join-Path $info.Path 'ShooterGame\Binaries\Win64\VALORANT-Win64-Shipping.exe'
        if (Test-Path -LiteralPath $exe) { $info.Exe = $exe }
        $info.Drive = ([IO.Path]::GetPathRoot($info.Path)).TrimEnd('\')
    }
    return $info
}

function Invoke-DiagValorant {
    Write-Title 'VALORANT'
    $sec = 'Valorant'
    $v = Get-ValorantInfo
    if (-not $v.Installed) {
        Out-Diag INFO $sec 'Instalacion' 'No encontrada'
        return
    }
    Out-Diag OK $sec 'Instalacion' $v.Path
    $mt = Get-DriveMediaType $v.Drive
    $st = 'OK'; if ($mt.Type -eq 'HDD') { $st = 'FAIL' }
    Out-Diag $st $sec 'Disco' ($v.Drive + ' ' + $mt.Type)
    if ($mt.Type -eq 'HDD') { Add-Finding ALTO Juegos 'Valorant esta instalado en un disco duro mecanico.' 'Muevelo a un SSD: cargas mas rapidas y menos tirones al cargar mapas y agentes.' }
    if ($v.Exe) {
        $pref = [string](Get-RegValue 'HKCU:\Software\Microsoft\DirectX\UserGpuPreferences' $v.Exe '')
        if ($pref -match 'GpuPreference=2') { Out-Diag OK $sec 'Preferencia de GPU' 'Alto rendimiento' }
        else { Out-Diag WARN $sec 'Preferencia de GPU' 'Automatica'; Add-Finding BAJO Juegos 'Valorant no esta forzado a la GPU de alto rendimiento.' 'CandyOS lo configura en Optimizar Windows.' 'Menu 3' }
    }
    # Vanguard (anti-cheat de kernel): CandyOS solo lo verifica, nunca lo toca
    $vgk = $null
    try { $vgk = Get-CimInstance Win32_SystemDriver -Filter "Name='vgk'" -ErrorAction Stop } catch { }
    $vgc = Get-Service -Name 'vgc' -ErrorAction SilentlyContinue
    if (-not $vgk -and -not $vgc) {
        Out-Diag FAIL $sec 'Riot Vanguard' 'No instalado'
        Add-Finding ALTO Juegos 'Riot Vanguard no esta instalado: Valorant no podra iniciar partidas.' 'Abre el Riot Client: reinstalara Vanguard. Luego reinicia el PC.'
    } elseif ($vgk -and [string]$vgk.State -ne 'Running') {
        Out-Diag WARN $sec 'Riot Vanguard' 'Instalado pero no cargado (requiere reinicio)'
        Add-Finding MEDIO Juegos 'Vanguard no esta cargado.' 'Reinicia el PC antes de jugar Valorant (Vanguard se carga al arrancar Windows).'
    } else {
        Out-Diag OK $sec 'Riot Vanguard' 'Activo'
    }
    if ($script:Metrics.Contains('Build') -and $script:Metrics['Build'] -ge 22000 -and $script:IsAdmin) {
        try {
            $sb = Confirm-SecureBootUEFI -ErrorAction Stop
            if ($sb) { Out-Diag OK $sec 'Arranque seguro' 'Activado' } else { Out-Diag FAIL $sec 'Arranque seguro' 'Desactivado'; Add-Finding ALTO Juegos 'Arranque seguro (Secure Boot) desactivado.' 'En Windows 11, Vanguard exige Secure Boot y TPM 2.0 (error VAN 9003). Activalo en la BIOS.' }
        } catch { }
        try {
            $tpm = Get-Tpm -ErrorAction Stop
            if ($tpm.TpmPresent -and $tpm.TpmReady) { Out-Diag OK $sec 'TPM 2.0' 'Listo' } else { Out-Diag FAIL $sec 'TPM 2.0' 'No listo'; Add-Finding ALTO Juegos 'TPM no disponible/listo.' 'Vanguard en Windows 11 requiere TPM 2.0 (fTPM en AMD / PTT en Intel) activado en la BIOS (error VAN 9001).' }
        } catch { }
    }
    Add-Finding INFO Juegos 'Ajustes de Valorant para competitivo (se guardan en la nube de Riot, CandyOS no los edita).' 'Video: Pantalla completa, limite FPS = Hz del monitor o mas, NVIDIA Reflex = Activado + Impulso, Renderizado multihilo = SI, VSync = NO. Calidad: Material/Textura/Detalle Bajo, Antialiasing MSAA 2x o Ninguno, Filtrado anisotropico 2x-4x, Vineta/Bloom/Distorsion/Sombras = NO. Control: Buffer de entrada sin procesar (Raw Input Buffer) = SI. Revisa la guia completa en el menu 4.' 'Menu 4'
}

function Show-ValorantGuide {
    Clear-Host
    Show-Banner
    Write-Title 'VALORANT - AJUSTES COMPETITIVOS'
    $v = Get-ValorantInfo
    if ($v.Installed) { Write-Status OK 'Valorant' $v.Path } else { Write-Status WARN 'Valorant' 'No encontrado' }
    Write-Note 'Valorant guarda la configuracion en la nube de Riot (por cuenta), por eso CandyOS no edita archivos: aplica estos valores en el juego una vez y quedaran guardados.' 'Gray' 2
    $hz = (Get-MonitorRefresh).Current
    $rows = @(
        @('GENERAL', 'Mostrar FPS / estadisticas', 'Texto (para verificar)'),
        @('VIDEO', 'Modo de pantalla', 'Pantalla completa'),
        @('VIDEO', 'Limitar FPS siempre', ('SI, {0}+ (o NO si mantienes FPS muy altos)' -f $hz)),
        @('VIDEO', 'Limitar FPS en menus', 'SI, 60-144 (GPU fria en el lobby)'),
        @('VIDEO', 'NVIDIA Reflex', 'Activado + Impulso'),
        @('GRAFICOS', 'Renderizado multihilo', 'SI (CPU de 4+ nucleos)'),
        @('GRAFICOS', 'Calidad de material / textura / detalle', 'Baja'),
        @('GRAFICOS', 'Calidad de interfaz', 'Baja'),
        @('GRAFICOS', 'Vineta / VSync', 'NO / NO'),
        @('GRAFICOS', 'Antialiasing', 'MSAA 2x (o Ninguno en PC modesta)'),
        @('GRAFICOS', 'Filtrado anisotropico', '2x - 4x'),
        @('GRAFICOS', 'Mejorar claridad', 'SI (mejora visibilidad, coste bajo)'),
        @('GRAFICOS', 'Bloom / Distorsion / Sombras de primera persona', 'NO'),
        @('CONTROL', 'Buffer de entrada sin procesar (Raw Input Buffer)', 'SI (menos latencia de raton)'),
        @('RED', 'Servidor', 'El de menor ping (Ajustes > General > Region)')
    )
    Write-Host ''
    Write-Host ('  {0,-9} {1,-46} {2}' -f 'SECCION', 'AJUSTE', 'VALOR') -ForegroundColor DarkGray
    Write-Rule
    foreach ($r in $rows) {
        Write-Host ('  {0,-9} ' -f $r[0]) -ForegroundColor Cyan -NoNewline
        Write-Host ('{0,-46} ' -f $r[1]) -ForegroundColor Gray -NoNewline
        Write-Host $r[2] -ForegroundColor White
    }
    Write-Rule
    Write-Note 'Panel NVIDIA para VALORANT: Modo de baja latencia = Desactivado (Reflex lo reemplaza), Modo de gestion de energia = Maximo rendimiento. AMD: Anti-Lag activado, Radeon Chill desactivado.' 'Gray' 2
    Wait-Candy
}

function Show-GameProfilesMenu {
    Clear-Host
    Show-Banner
    Write-Title 'PERFILES DE JUEGO'
    $fn = Get-FortniteInfo; $v = Get-ValorantInfo
    $ft = 'no encontrado'; if ($fn.Installed) { $ft = 'detectado' }
    $vt = 'no encontrado'; if ($v.Installed) { $vt = 'detectado' }
    Write-Host ('  [1] Fortnite  - aplicar perfil al GameUserSettings.ini   ({0})' -f $ft) -ForegroundColor White
    Write-Host ('  [2] Valorant  - guia de ajustes competitivos            ({0})' -f $vt) -ForegroundColor White
    Write-Host '  [0] Volver' -ForegroundColor Gray
    switch (Read-Option) {
        '1' { Show-FortniteMenu }
        '2' { Show-ValorantGuide }
    }
}

function Start-CompetitiveGame {
    param([ValidateSet('Fortnite', 'Valorant')][string]$Game)
    # Se lanza a traves del Explorador para que el juego NO herede permisos de administrador
    if ($Game -eq 'Fortnite') {
        $uri = 'com.epicgames.launcher://apps/fn%3A4fe75bbc5a674f4f9b356b5c90567da5%3AFortnite?action=launch&silent=true'
        try { Start-Process 'explorer.exe' ('"' + $uri + '"'); Write-Status OK 'Lanzando' 'Fortnite (Epic Games Launcher)'; return $true } catch { }
        Write-Status FAIL 'Fortnite' 'No se pudo lanzar. Abrelo desde Epic Games.'
        return $false
    }
    $rc = Get-RiotClientPath
    if (-not $rc) { Write-Status FAIL 'Valorant' 'Riot Client no encontrado.'; return $false }
    try {
        $lnk = Join-Path $script:StateDir 'Lanzar VALORANT.lnk'
        $ws = New-Object -ComObject WScript.Shell
        $sc = $ws.CreateShortcut($lnk)
        $sc.TargetPath = $rc
        $sc.Arguments = '--launch-product=valorant --launch-patchline=live'
        $sc.WorkingDirectory = Split-Path $rc -Parent
        $sc.Save()
        Start-Process 'explorer.exe' ('"' + $lnk + '"')
        Write-Status OK 'Lanzando' 'Valorant (Riot Client)'
        return $true
    } catch {
        Write-Status FAIL 'Valorant' $_.Exception.Message
        return $false
    }
}

# =============================================================================
#  MODO ENFOQUE (ajustes TEMPORALES de sesion: se revierten al reiniciar/iniciar sesion)
# =============================================================================
function Get-FocusOptions {
    return @(
        @{ Id = 'apps'; Name = 'Cerrar apps de fondo (launchers, sync, torrents, wallpapers...)'; Def = $true; Admin = $false },
        @{ Id = 'services'; Name = 'Pausar servicios: Windows Update, BITS, Entrega optimizada, Indexador, Telemetria, Impresion'; Def = $true; Admin = $true },
        @{ Id = 'sysmain'; Name = 'Pausar SysMain (Superfetch) - util con HDD o poca RAM'; Def = $false; Admin = $true },
        @{ Id = 'power'; Name = 'Plan de energia Ultimate solo durante la sesion'; Def = $true; Admin = $false },
        @{ Id = 'priority'; Name = 'Bajar prioridad de apps que quedan abiertas (Discord, navegador, Spotify...)'; Def = $true; Admin = $false },
        @{ Id = 'standby'; Name = 'Purgar memoria standby (RAM en cache) ahora'; Def = $true; Admin = $true },
        @{ Id = 'mouse'; Name = 'Raton sin aceleracion (solo esta sesion)'; Def = $true; Admin = $false },
        @{ Id = 'hotkeys'; Name = 'Bloquear popups de Teclas especiales / filtro (Shift x5) en la sesion'; Def = $true; Admin = $false },
        @{ Id = 'dns'; Name = 'Vaciar cache DNS'; Def = $true; Admin = $false }
    )
}

function Get-FocusSession {
    $f = Join-Path $script:StateDir 'focus-session.json'
    if (Test-Path -LiteralPath $f) { try { return (Get-Content -LiteralPath $f -Raw | ConvertFrom-Json) } catch { } }
    return $null
}

function Write-FocusRevertScript {
    $path = Join-Path $script:StateDir 'focus-revert.ps1'
    $content = @'
# CandyOS - revierte el Modo Enfoque al iniciar sesion (generado automaticamente)
$ErrorActionPreference = 'SilentlyContinue'
$f = Join-Path $env:ProgramData 'CandyOS\focus-session.json'
if (Test-Path -LiteralPath $f) {
    $s = Get-Content -LiteralPath $f -Raw | ConvertFrom-Json
    if ($s.PowerPrev) { & powercfg.exe /setactive $s.PowerPrev | Out-Null }
    foreach ($svc in @($s.Services)) { if ($svc) { Start-Service -Name $svc } }
    Remove-Item -LiteralPath $f -Force
}
Unregister-ScheduledTask -TaskName 'CandyOS Focus Revert' -TaskPath '\CandyOS\' -Confirm:$false
'@
    Set-Content -LiteralPath $path -Value $content -Encoding ASCII
    return $path
}

function Register-FocusRevertTask {
    param([string]$ScriptPath)
    try {
        $user = [Security.Principal.WindowsIdentity]::GetCurrent().Name
        $action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument ('-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $ScriptPath)
        $trigger = New-ScheduledTaskTrigger -AtLogOn -User $user
        $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Highest
        $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 5)
        Register-ScheduledTask -TaskName 'CandyOS Focus Revert' -TaskPath '\CandyOS\' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force -ErrorAction Stop | Out-Null
        return $true
    } catch { Write-CandyLog ('No se pudo registrar la tarea de reversion: ' + $_.Exception.Message); return $false }
}

function Get-CandyPlanGuid {
    # Devuelve (creandolo si hace falta) el GUID del plan CandyOS Ultimate, sin activarlo
    $st = Get-CandyState
    if ($st.ContainsKey('PowerPlanGuid') -and $st['PowerPlanGuid']) {
        $list = (& powercfg.exe /list) | Out-String
        if ($list -match [regex]::Escape([string]$st['PowerPlanGuid'])) { return [string]$st['PowerPlanGuid'] }
    }
    foreach ($srcGuid in @('e9a42b02-d5df-448d-aa00-03f14749eb61', '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c')) {
        $o = (& powercfg.exe -duplicatescheme $srcGuid 2>$null) | Out-String
        $m = [regex]::Match($o, '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})')
        if ($m.Success) {
            $g = $m.Groups[1].Value.ToLower()
            & powercfg.exe -changename $g 'CandyOS Ultimate' 'Plan de maximo rendimiento creado por CandyOS' | Out-Null
            Set-CandyStateValue 'PowerPlanGuid' $g
            return $g
        }
    }
    return $null
}

function Start-FocusSession {
    param([hashtable]$Selected, [string]$Game = '')
    $sessFile = Join-Path $script:StateDir 'focus-session.json'
    $prev = Get-FocusSession
    $session = [ordered]@{ Started = (Get-Date).ToString('s'); Game = $Game; PowerPrev = $null; Services = @(); Priorities = @(); Input = $false }
    if ($prev) {
        # Sesion ya activa: se conservan los valores originales para no perderlos
        $session.PowerPrev = $prev.PowerPrev
        $session.Services = @($prev.Services | Where-Object { $_ })
        $session.Input = [bool]$prev.Input
    }
    Write-Host ''
    if ($Selected['apps']) {
        $closed = 0; $mem = [long]0
        foreach ($c in (Get-GameModeCatalog)) {
            if (-not $c.Rec) { continue }
            if ($c.Game -and ($c.Game -eq $Game -or (Test-ProcessRunning $script:ValProcesses))) { continue }
            $ps = @(Get-Process -Name $c.Proc -ErrorAction SilentlyContinue)
            if ($ps.Count -eq 0) { continue }
            $mem += ($ps | Measure-Object -Property WorkingSet64 -Sum).Sum
            foreach ($p in $ps) { try { [void]$p.CloseMainWindow() } catch { } }
            Start-Sleep -Milliseconds 600
            foreach ($p in @(Get-Process -Name $c.Proc -ErrorAction SilentlyContinue)) { try { $p.Kill() } catch { } }
            $closed++
        }
        Write-Status OK 'Apps de fondo' ('{0} cerradas (~{1} RAM)' -f $closed, (Format-Bytes $mem))
    }
    if ($script:IsAdmin -and ($Selected['services'] -or $Selected['sysmain'])) {
        $names = @()
        if ($Selected['services']) { $names += @('wuauserv', 'UsoSvc', 'BITS', 'DoSvc', 'WSearch', 'DiagTrack', 'Spooler', 'MapsBroker') }
        if ($Selected['sysmain']) { $names += 'SysMain' }
        $stopped = @()
        foreach ($n in $names) {
            $svc = Get-Service -Name $n -ErrorAction SilentlyContinue
            if ($svc -and $svc.Status -eq 'Running') {
                try { Stop-Service -Name $n -Force -ErrorAction Stop; $stopped += $n } catch { }
            }
        }
        $session.Services = @(@($session.Services) + $stopped | Select-Object -Unique)
        Write-Status OK 'Servicios en pausa' ('{0} ({1})' -f $stopped.Count, ($stopped -join ', '))
    }
    if ($Selected['power']) {
        $cur = Get-ActivePowerScheme
        if ($script:IsDualCcdX3D) {
            Write-Status INFO 'Energia' 'Ryzen X3D doble CCD: se mantiene el plan Equilibrado'
        } elseif ((Get-PowerSchemeKind $cur) -eq 'Alto') {
            Write-Status OK 'Energia' ('Ya en maximo rendimiento: ' + $cur.Name)
        } else {
            $g = Get-CandyPlanGuid
            if ($g) {
                if (-not $session.PowerPrev -and $cur) { $session.PowerPrev = $cur.Guid }
                & powercfg.exe /setactive $g | Out-Null
                Write-Status OK 'Energia' 'CandyOS Ultimate activo (temporal)'
            } else { Write-Status WARN 'Energia' 'No se pudo crear el plan' }
        }
    }
    if ($Selected['priority']) {
        $n = 0
        foreach ($pn in @('Discord', 'chrome', 'msedge', 'firefox', 'opera', 'brave', 'vivaldi', 'Spotify', 'steamwebhelper', 'EpicWebHelper', 'OneDrive', 'ms-teams', 'Teams', 'WhatsApp', 'Telegram')) {
            foreach ($p in @(Get-Process -Name $pn -ErrorAction SilentlyContinue)) {
                try { if ($p.PriorityClass -eq 'Normal' -or $p.PriorityClass -eq 'AboveNormal') { $p.PriorityClass = 'BelowNormal'; $n++ } } catch { }
            }
        }
        Write-Status OK 'Prioridad' ('{0} procesos de fondo en prioridad baja' -f $n)
    }
    if ($Selected['standby'] -and $script:IsAdmin) {
        $before = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).FreePhysicalMemory
        if (Invoke-PurgeStandby) {
            $after = (Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue).FreePhysicalMemory
            $gain = 0; if ($before -and $after) { $gain = [Math]::Max(0, ($after - $before) * 1KB) }
            Write-Status OK 'Memoria standby' ('Purgada (+{0} libres)' -f (Format-Bytes $gain))
        } else { Write-Status WARN 'Memoria standby' 'No se pudo purgar en este sistema' }
    }
    if ($Selected['mouse'] -or $Selected['hotkeys']) {
        if (Initialize-CandyNative) {
            if ($Selected['mouse']) {
                if ([CandyNative]::SetMouseSession(0, 0, 0)) { Write-Status OK 'Raton' 'Aceleracion desactivada (temporal)' } else { Write-Status WARN 'Raton' 'No se pudo aplicar' }
            }
            if ($Selected['hotkeys']) {
                if ([CandyNative]::SetAccessibilityHotkeys($false)) { Write-Status OK 'Teclas especiales' 'Atajos bloqueados (temporal)' } else { Write-Status WARN 'Teclas especiales' 'No se pudo aplicar' }
            }
            $session.Input = $true
        } else { Write-Status WARN 'Entrada' 'Funciones nativas no disponibles (modo de lenguaje restringido)' }
    }
    if ($Selected['dns']) { try { Clear-DnsClientCache -ErrorAction Stop; Write-Status OK 'DNS' 'Cache vaciada' } catch { } }

    try { ($session | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $sessFile -Encoding UTF8 } catch { }
    if ($script:IsAdmin) {
        $rp = Write-FocusRevertScript
        if (Register-FocusRevertTask -ScriptPath $rp) { Write-Status OK 'Reversion automatica' 'Programada para el proximo inicio de sesion' }
        else { Write-Status WARN 'Reversion automatica' 'No programada: usa "Terminar sesion" al acabar' }
    }
    Write-CandyLog ('Modo Enfoque activado ({0})' -f $Game)
}

function Stop-FocusSession {
    $s = Get-FocusSession
    if (-not $s) { Write-Status INFO 'Modo Enfoque' 'No hay una sesion activa.'; return }
    if ($s.PowerPrev) { & powercfg.exe /setactive $s.PowerPrev | Out-Null; Write-Status OK 'Energia' 'Plan anterior restaurado' }
    $started = 0
    foreach ($svc in @($s.Services)) { if ($svc) { try { Start-Service -Name $svc -ErrorAction Stop; $started++ } catch { } } }
    if (@($s.Services).Count -gt 0) { Write-Status OK 'Servicios' ('{0} reanudados' -f $started) }
    foreach ($pn in @('Discord', 'chrome', 'msedge', 'firefox', 'opera', 'brave', 'vivaldi', 'Spotify', 'steamwebhelper', 'EpicWebHelper', 'OneDrive', 'ms-teams', 'Teams', 'WhatsApp', 'Telegram')) {
        foreach ($p in @(Get-Process -Name $pn -ErrorAction SilentlyContinue)) { try { if ($p.PriorityClass -eq 'BelowNormal') { $p.PriorityClass = 'Normal' } } catch { } }
    }
    Write-Status OK 'Prioridad' 'Restaurada'
    if ($s.Input) { Restore-SessionInputSettings; Write-Status OK 'Raton / teclado' 'Ajustes originales restaurados' }
    Remove-Item -LiteralPath (Join-Path $script:StateDir 'focus-session.json') -Force -ErrorAction SilentlyContinue
    try { Unregister-ScheduledTask -TaskName 'CandyOS Focus Revert' -TaskPath '\CandyOS\' -Confirm:$false -ErrorAction Stop } catch { }
    Write-CandyLog 'Modo Enfoque terminado manualmente'
}

function Show-FocusMenu {
    $opts = @(Get-FocusOptions)
    $sel = @{}
    foreach ($o in $opts) { $sel[$o.Id] = ($o.Def -and (-not $o.Admin -or $script:IsAdmin)) }
    while ($true) {
        Clear-Host
        Show-Banner
        Write-Title 'MODO ENFOQUE (sesion competitiva)'
        Write-Note 'Activalo justo ANTES de abrir el juego. Todo es TEMPORAL: se revierte solo al reiniciar o al volver a iniciar sesion (o al instante con [X]). No toca el juego ni el anti-cheat (EAC / Vanguard).' 'Gray' 2
        $s = Get-FocusSession
        if ($s) { Write-Host ('   Sesion ACTIVA desde {0}' -f ([string]$s.Started).Replace('T', ' ')) -ForegroundColor Green } else { Write-Host '   Sin sesion activa' -ForegroundColor DarkGray }
        Write-Host ''
        for ($i = 0; $i -lt $opts.Count; $i++) {
            $o = $opts[$i]
            $mark = '[ ]'; $c = 'DarkGray'
            if ($sel[$o.Id]) { $mark = '[x]'; $c = 'White' }
            $suffix = ''
            if ($o.Admin -and -not $script:IsAdmin) { $suffix = '  (requiere admin)' }
            Write-Host ('  {0,2}. {1} {2}{3}' -f ($i + 1), $mark, $o.Name, $suffix) -ForegroundColor $c
        }
        Write-Rule
        Write-Host '  [F] Activar y lanzar FORTNITE   [V] Activar y lanzar VALORANT   [A] Solo activar' -ForegroundColor Magenta
        Write-Host '  [1-n] Marcar/desmarcar   [X] Terminar sesion ahora (revertir)   [0] Volver' -ForegroundColor Gray
        $o = Read-Option
        switch -Regex ($o) {
            '^(0|)$' { return }
            '^X$' { Write-Host ''; Stop-FocusSession; Wait-Candy; continue }
            '^[AFV]$' {
                $game = ''
                if ($o -eq 'F') { $game = 'Fortnite' } elseif ($o -eq 'V') { $game = 'Valorant' }
                Start-FocusSession -Selected $sel -Game $game
                if ($game) { Write-Host ''; [void](Start-CompetitiveGame -Game $game) }
                Write-Host ''
                Write-Host '  Modo Enfoque activo. GL HF!  Al terminar: menu 7 > [X], o simplemente reinicia.' -ForegroundColor Green
                Wait-Candy
                return
            }
            default {
                foreach ($n in (Get-SelectionNumbers -Text $o -Max $opts.Count)) {
                    $id = $opts[$n - 1].Id
                    if ($opts[$n - 1].Admin -and -not $script:IsAdmin) { continue }
                    $sel[$id] = -not $sel[$id]
                }
            }
        }
    }
}

# =============================================================================
#  MONITOR EN TIEMPO REAL
# =============================================================================
function Get-GpuUsage {
    try {
        $eng = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -Filter "Name LIKE '%engtype_3D'" -ErrorAction Stop)
        if ($eng.Count -eq 0) { return $null }
        $max = 0
        foreach ($g in ($eng | Group-Object { ([regex]::Match($_.Name, 'luid_0x[0-9a-fA-F]+_0x[0-9a-fA-F]+')).Value })) {
            $sum = ($g.Group | Measure-Object -Property UtilizationPercentage -Sum).Sum
            if ($sum -gt $max) { $max = $sum }
        }
        if ($max -gt 100) { $max = 100 }
        return [int]$max
    } catch { return $null }
}

function Write-At {
    param([int]$Row, [string]$Text, [string]$Color = 'Gray')
    try { [Console]::SetCursorPosition(0, $Row) } catch { }
    $w = $script:W
    if ($Text.Length -gt $w) { $Text = $Text.Substring(0, $w) }
    Write-Host $Text.PadRight($w) -ForegroundColor $Color
}

function Start-CandyMonitor {
    if ($Host.Name -match 'ISE') { Write-Status WARN 'Monitor' 'No compatible con PowerShell ISE. Usa la consola normal.'; Wait-Candy; return }
    $target = '1.1.1.1'; $tName = 'Cloudflare'
    if ($script:BestRegion) {
        $r = $script:EpicRegions | Where-Object { $_.Code -eq $script:BestRegion.Code } | Select-Object -First 1
        if ($r) { $target = $r.Host; $tName = 'Fortnite ' + $r.Name }
    }
    $hist = New-Object System.Collections.Generic.List[int]
    $ping = New-Object System.Net.NetworkInformation.Ping
    $cores = [Environment]::ProcessorCount
    $spark = ' .:-=+*#%@'
    $loops = 0; $lost = 0; $sent = 0
    $top = @()
    Clear-Host
    try { [Console]::CursorVisible = $false } catch { }
    try {
        while ($true) {
            if ([Console]::KeyAvailable) {
                $k = [Console]::ReadKey($true)
                if ($k.Key -eq 'Q' -or $k.Key -eq 'Escape') { break }
            }
            $cpu = 0
            try { $cpu = [int](Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'" -ErrorAction Stop).PercentProcessorTime } catch { }
            $os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
            $ramPct = 0; $ramTxt = ''
            if ($os) {
                $ramPct = [int][Math]::Round((1 - $os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100)
                $ramTxt = ('{0:N1}/{1:N1} GB' -f (($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / 1MB), ($os.TotalVisibleMemorySize / 1MB))
            }
            $gpu = Get-GpuUsage
            $ms = -1
            $sent++
            try { $pr = $ping.Send($target, 1000); if ($pr.Status -eq 'Success') { $ms = [int]$pr.RoundtripTime } else { $lost++ } } catch { $lost++ }
            if ($ms -ge 0) { $hist.Add($ms) } else { $hist.Add(-1) }
            while ($hist.Count -gt 60) { $hist.RemoveAt(0) }
            if ($loops % 3 -eq 0) {
                try {
                    $top = @(Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop |
                        Where-Object { $_.Name -ne '_Total' -and $_.Name -ne 'Idle' } |
                        Sort-Object PercentProcessorTime -Descending | Select-Object -First 6)
                } catch { $top = @() }
            }
            $loops++
            $valid = @($hist | Where-Object { $_ -ge 0 })
            $avg = 0; $jit = 0
            if ($valid.Count -gt 0) { $avg = [Math]::Round(($valid | Measure-Object -Average).Average, 1) }
            if ($valid.Count -gt 1) { $s = 0; for ($i = 1; $i -lt $valid.Count; $i++) { $s += [Math]::Abs($valid[$i] - $valid[$i - 1]) }; $jit = [Math]::Round($s / ($valid.Count - 1), 1) }
            $mx = 1; if ($valid.Count -gt 0) { $mx = [Math]::Max(1, ($valid | Measure-Object -Maximum).Maximum) }
            $sp = ''
            foreach ($h in $hist) { if ($h -lt 0) { $sp += '!' } else { $sp += $spark[[int][Math]::Min(9, [Math]::Floor($h / $mx * 9))] } }
            $lossPct = 0; if ($sent -gt 0) { $lossPct = [Math]::Round($lost / $sent * 100, 1) }

            $row = 0
            Write-At $row '  +--[ CANDYOS MONITOR EN TIEMPO REAL ]------------------------------------+' 'Magenta'; $row++
            Write-At $row ('   {0}    Q / ESC para salir' -f (Get-Date -Format 'HH:mm:ss')) 'DarkGray'; $row++
            Write-At $row '' ; $row++
            $c = 'Green'; if ($cpu -ge 70) { $c = 'Yellow' }; if ($cpu -ge 90) { $c = 'Red' }
            Write-At $row ('   CPU  {0,3}%  {1}' -f $cpu, (Get-Bar $cpu 40)) $c; $row++
            if ($null -ne $gpu) {
                $c = 'Green'; if ($gpu -ge 95) { $c = 'Yellow' }
                Write-At $row ('   GPU  {0,3}%  {1}' -f $gpu, (Get-Bar $gpu 40)) $c; $row++
            } else { Write-At $row '   GPU   n/d' 'DarkGray'; $row++ }
            $c = 'Green'; if ($ramPct -ge 75) { $c = 'Yellow' }; if ($ramPct -ge 90) { $c = 'Red' }
            Write-At $row ('   RAM  {0,3}%  {1} {2}' -f $ramPct, (Get-Bar $ramPct 40), $ramTxt) $c; $row++
            Write-At $row ''; $row++
            $pt = 'timeout'; if ($ms -ge 0) { $pt = ('{0} ms' -f $ms) }
            $c = 'Green'; if ($ms -gt 60 -or $ms -lt 0) { $c = 'Yellow' }; if ($ms -gt 120 -or $lossPct -gt 2) { $c = 'Red' }
            Write-At $row ('   PING {0}: {1,-8} prom {2} ms | jitter {3} ms | perdida {4}%' -f $tName, $pt, $avg, $jit, $lossPct) $c; $row++
            Write-At $row ('   [' + $sp.PadRight(60) + ']') 'Cyan'; $row++
            Write-At $row ('    ultimos 60 s (escala 0-{0} ms, ! = paquete perdido)' -f $mx) 'DarkGray'; $row++
            Write-At $row ''; $row++
            Write-At $row '   PROCESOS QUE MAS CPU USAN' 'Magenta'; $row++
            for ($i = 0; $i -lt 6; $i++) {
                if ($i -lt $top.Count) {
                    $pcpu = [Math]::Round([double]$top[$i].PercentProcessorTime / $cores, 1)
                    Write-At $row ('    {0,-36} {1,6}%  {2,10}' -f $top[$i].Name, $pcpu, (Format-Bytes ([double]$top[$i].WorkingSetPrivate))) 'Gray'
                } else { Write-At $row '' }
                $row++
            }
            Write-At $row ''; $row++
            Write-At $row '   Para medir FPS y frametimes dentro de Fortnite usa CapFrameX o' 'DarkGray'; $row++
            Write-At $row '   NVIDIA FrameView (Centro de herramientas, menu 9).' 'DarkGray'; $row++
            Start-Sleep -Milliseconds 600
        }
    } finally {
        $ping.Dispose()
        try { [Console]::CursorVisible = $true } catch { }
    }
}

# =============================================================================
#  CENTRO DE HERRAMIENTAS EXTERNAS (winget, desde las fuentes oficiales)
# =============================================================================
function Get-ToolCatalog {
    return @(
        @{ Id = 'REALiX.HWiNFO'; Name = 'HWiNFO64'; Cat = 'Diagnostico'; Why = 'Temperaturas, throttling, voltajes y relojes reales de CPU/GPU.'; Pack = $true },
        @{ Id = 'Resplendence.LatencyMon'; Name = 'LatencyMon'; Cat = 'Diagnostico'; Why = 'Detecta drivers con latencia DPC/ISR alta (causa de micro-stutter).'; Pack = $true },
        @{ Id = 'CXWorld.CapFrameX'; Name = 'CapFrameX'; Cat = 'Benchmark'; Why = 'Mide FPS, 1% low y frametimes en Fortnite (basado en PresentMon).'; Pack = $true },
        @{ Id = 'Nvidia.FrameView'; Name = 'NVIDIA FrameView'; Cat = 'Benchmark'; Why = 'FPS, latencia del sistema (PC Latency) y consumo.'; Pack = $false },
        @{ Id = 'CPUID.CPU-Z'; Name = 'CPU-Z'; Cat = 'Diagnostico'; Why = 'Confirma XMP/EXPO, canales de RAM y modelo exacto de CPU/placa.'; Pack = $false },
        @{ Id = 'TechPowerUp.GPU-Z'; Name = 'GPU-Z'; Cat = 'Diagnostico'; Why = 'Info de la GPU, ancho PCIe real y sensores.'; Pack = $false },
        @{ Id = 'CrystalDewWorld.CrystalDiskInfo'; Name = 'CrystalDiskInfo'; Cat = 'Diagnostico'; Why = 'Salud SMART de SSD/HDD.'; Pack = $false },
        @{ Id = 'CrystalDewWorld.CrystalDiskMark'; Name = 'CrystalDiskMark'; Cat = 'Benchmark'; Why = 'Velocidad real del SSD/HDD.'; Pack = $false },
        @{ Id = 'Wagnardsoft.DisplayDriverUninstaller'; Name = 'DDU'; Cat = 'Drivers'; Why = 'Desinstalacion 100% limpia de drivers de GPU antes de instalar uno nuevo.'; Pack = $true },
        @{ Id = 'TechPowerUp.NVCleanstall'; Name = 'NVCleanstall'; Cat = 'Drivers'; Why = 'Instala el driver NVIDIA solo con lo necesario (sin telemetria ni extras).'; Pack = $false; Vendor = 'NVIDIA' },
        @{ Id = 'Wagnardsoft.ISLC'; Name = 'ISLC'; Cat = 'Rendimiento'; Why = 'Limpia la memoria standby: evita tirones en equipos con poca RAM.'; Pack = $true },
        @{ Id = 'BitSum.ProcessLasso'; Name = 'Process Lasso'; Cat = 'Rendimiento'; Why = 'ProBalance: evita que procesos de fondo acaparen el CPU mientras juegas.'; Pack = $false },
        @{ Id = 'Guru3D.Afterburner'; Name = 'MSI Afterburner'; Cat = 'Rendimiento'; Why = 'Curvas de ventilador, undervolt y overlay de rendimiento.'; Pack = $false },
        @{ Id = 'Guru3D.RTSS'; Name = 'RivaTuner Statistics Server'; Cat = 'Rendimiento'; Why = 'Limitador de FPS de frametime muy preciso + overlay.'; Pack = $false },
        @{ Id = 'Microsoft.Sysinternals.Autoruns'; Name = 'Autoruns'; Cat = 'Limpieza'; Why = 'Control total de todo lo que arranca con Windows (servicios, tareas, drivers).'; Pack = $true },
        @{ Id = 'AntibodySoftware.WizTree'; Name = 'WizTree'; Cat = 'Limpieza'; Why = 'Encuentra en segundos que ocupa tu disco.'; Pack = $true },
        @{ Id = 'BleachBit.BleachBit'; Name = 'BleachBit'; Cat = 'Limpieza'; Why = 'Limpiador avanzado de codigo abierto (GPL).'; Pack = $false },
        @{ Id = 'OO-Software.ShutUp10'; Name = 'O&O ShutUp10++'; Cat = 'Privacidad'; Why = 'Desactiva telemetria y funciones innecesarias con perfiles recomendados.'; Pack = $false },
        @{ Id = 'Cloudflare.Warp'; Name = 'Cloudflare WARP'; Cat = 'Red'; Why = 'Ruta alternativa gratuita; a veces mejora rutas malas del ISP (compara el ping).'; Pack = $false },
        @{ Id = 'EpicGames.EpicGamesLauncher'; Name = 'Epic Games Launcher'; Cat = 'Juego'; Why = 'Launcher oficial de Fortnite.'; Pack = $false }
    )
}

function Get-WebLinks {
    return @(
        @{ Name = 'NVIDIA App (drivers oficiales)'; Url = 'https://www.nvidia.com/es-la/software/nvidia-app/' },
        @{ Name = 'AMD Software Adrenalin (drivers oficiales)'; Url = 'https://www.amd.com/es/support/download/drivers.html' },
        @{ Name = 'Intel Arc / Driver & Support Assistant'; Url = 'https://www.intel.com/content/www/us/en/support/detect.html' },
        @{ Name = 'Prueba de bufferbloat (Waveform)'; Url = 'https://www.waveform.com/tools/bufferbloat' },
        @{ Name = 'Test de monitor / Hz (TestUFO)'; Url = 'https://www.testufo.com/' },
        @{ Name = 'Estado de servidores de Fortnite'; Url = 'https://status.epicgames.com/' }
    )
}

function Get-InstalledWingetIds {
    $set = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
    $tmp = Join-Path $env:TEMP ('candyos_winget_' + [guid]::NewGuid().ToString('N') + '.json')
    try {
        & winget.exe export -o $tmp --source winget --accept-source-agreements --disable-interactivity 2>$null | Out-Null
        if (Test-Path -LiteralPath $tmp) {
            $j = Get-Content -LiteralPath $tmp -Raw | ConvertFrom-Json
            foreach ($src in @($j.Sources)) { foreach ($p in @($src.Packages)) { [void]$set.Add([string]$p.PackageIdentifier) } }
        }
    } catch { } finally { Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue }
    return , $set
}

function Install-CandyTool {
    param($Tool)
    Write-Step ('Instalando {0} ({1})...' -f $Tool.Name, $Tool.Id)
    & winget.exe install --id $Tool.Id --exact --source winget --accept-source-agreements --accept-package-agreements
    $code = $LASTEXITCODE
    if ($code -eq 0) { Write-Status OK $Tool.Name 'Instalado'; Write-CandyLog ('Instalado {0}' -f $Tool.Id); return $true }
    if ($code -eq -1978335189) { Write-Status OK $Tool.Name 'Ya estaba instalado y actualizado'; return $true }
    Write-Status FAIL $Tool.Name ('winget devolvio el codigo {0}' -f $code)
    return $false
}

function Show-ToolsMenu {
    Clear-Host
    Show-Banner
    Write-Title 'CENTRO DE HERRAMIENTAS EXTERNAS'
    $hasWinget = [bool](Get-Command winget.exe -ErrorAction SilentlyContinue)
    $tools = @(Get-ToolCatalog)
    $vendor = ''
    try { $vendor = [string]((Get-CimInstance Win32_VideoController | Where-Object { Test-DedicatedGpu $_.Name } | Select-Object -First 1).Name) } catch { }
    $installed = $null
    if ($hasWinget) {
        Write-Step 'Consultando programas instalados (winget)...'
        $installed = Get-InstalledWingetIds
    } else {
        Write-Status WARN 'winget' 'No disponible. Instala "Instalador de aplicaciones" desde Microsoft Store.'
    }
    Write-Host ''
    Write-Host ('  {0,-3} {1,-4} {2,-27} {3,-12} {4}' -f '#', 'PACK', 'HERRAMIENTA', 'CATEGORIA', 'ESTADO') -ForegroundColor DarkGray
    Write-Rule
    for ($i = 0; $i -lt $tools.Count; $i++) {
        $t = $tools[$i]
        $pk = ''; if ($t.Pack) { $pk = ' * ' }
        $stt = '?'; $sc = 'DarkGray'
        if ($installed) { if ($installed.Contains($t.Id)) { $stt = 'instalado'; $sc = 'Green' } else { $stt = '-'; $sc = 'DarkGray' } }
        Write-Host ('  {0,-3} {1,-4} {2,-27} {3,-12} ' -f ($i + 1), $pk, $t.Name, $t.Cat) -ForegroundColor White -NoNewline
        Write-Host $stt -ForegroundColor $sc
        Write-Host ('                ' + $t.Why) -ForegroundColor DarkGray
    }
    $links = Get-WebLinks
    Write-Rule
    Write-Host '  ENLACES OFICIALES' -ForegroundColor Magenta
    for ($j = 0; $j -lt $links.Count; $j++) { Write-Host ('  W{0}  {1}' -f ($j + 1), $links[$j].Name) -ForegroundColor Gray }
    Write-Rule
    Write-Host '  [P] Instalar pack recomendado (*)   [1-n] Instalar seleccion   [W1-W6] Abrir enlace' -ForegroundColor Magenta
    Write-Host '  [0] Volver' -ForegroundColor Gray
    Write-Note 'Todo se descarga desde el repositorio oficial de winget (Microsoft) y la web de cada fabricante. Cada herramienta tiene su propia licencia.' 'DarkGray' 2
    $o = Read-Option
    if ($o -eq '0' -or $o -eq '') { return }
    if ($o -match '^W(\d+)$') {
        $n = [int]$matches[1]
        if ($n -ge 1 -and $n -le $links.Count) { Start-Process $links[$n - 1].Url }
        return
    }
    if (-not $hasWinget) {
        if (Confirm-Candy 'Abrir Microsoft Store para instalar winget (Instalador de aplicaciones)?') { Start-Process 'ms-windows-store://pdp/?productid=9NBLGGH4NNS1' }
        return
    }
    $sel = @()
    if ($o -eq 'P') {
        $sel = @($tools | Where-Object { $_.Pack })
        if ($vendor -match 'NVIDIA|GeForce|RTX|GTX') { $sel += ($tools | Where-Object { $_.Id -eq 'TechPowerUp.NVCleanstall' }) }
    } else { foreach ($n in (Get-SelectionNumbers -Text $o -Max $tools.Count)) { $sel += $tools[$n - 1] } }
    if ($installed) { $sel = @($sel | Where-Object { -not $installed.Contains($_.Id) }) }
    if ($sel.Count -eq 0) { Write-Status OK 'Herramientas' 'Todo lo seleccionado ya esta instalado.'; Wait-Candy; return }
    Write-Host ''
    Write-Host ('  Se instalaran: ' + (($sel | ForEach-Object { $_.Name }) -join ', ')) -ForegroundColor White
    if (-not (Confirm-Candy 'Continuar?')) { return }
    foreach ($t in $sel) { [void](Install-CandyTool $t) }
    Wait-Candy
}

# =============================================================================
#  DESHACER / RESTAURAR
# =============================================================================
function Show-UndoMenu {
    Clear-Host
    Show-Banner
    Write-Title 'DESHACER CAMBIOS / RESTAURAR'
    $store = @(Get-BackupStore)
    Write-Status INFO 'Cambios registrados' ('{0} valores originales guardados' -f $store.Count)
    foreach ($t in @($store | Group-Object Type)) { Write-Host ('      {0,-10} {1}' -f $t.Name, $t.Count) -ForegroundColor DarkGray }
    Write-Host ''
    Write-Host '  [1] Deshacer TODOS los cambios de CandyOS (restaura los valores originales)' -ForegroundColor White
    Write-Host '  [2] Abrir Restaurar sistema de Windows (puntos de restauracion)' -ForegroundColor White
    Write-Host '  [3] Abrir carpeta de copias de seguridad' -ForegroundColor White
    Write-Host '  [0] Volver' -ForegroundColor Gray
    $o = Read-Option
    switch ($o) {
        '1' {
            if ($store.Count -eq 0) { Write-Status OK 'Deshacer' 'No hay cambios que deshacer.'; Wait-Candy; return }
            if (-not (Test-AdminOrWarn)) { return }
            if (-not (Confirm-Candy 'Restaurar todos los valores originales?')) { return }
            Invoke-UndoAll -Store $store
            Wait-Candy
        }
        '2' { Start-Process 'rstrui.exe' }
        '3' { Start-Process 'explorer.exe' $script:StateDir }
    }
}

function Invoke-UndoAll {
    param([object[]]$Store)
    $ok = 0; $fail = 0
    for ($i = $Store.Count - 1; $i -ge 0; $i--) {
        $e = $Store[$i]
        try {
            switch ($e.Type) {
                'Reg' { Restore-RegEntry $e }
                'PowerPlan' { & powercfg.exe /setactive $e.Guid | Out-Null; if ($LASTEXITCODE -ne 0) { throw 'powercfg' } }
                'DNS' {
                    if ($e.Dhcp -or @($e.Servers).Count -eq 0) { Set-DnsClientServerAddress -InterfaceIndex $e.IfIndex -ResetServerAddresses -ErrorAction Stop }
                    else { Set-DnsClientServerAddress -InterfaceIndex $e.IfIndex -ServerAddresses @($e.Servers) -ErrorAction Stop }
                }
                'NicProp' { Set-NetAdapterAdvancedProperty -Name $e.Adapter -RegistryKeyword $e.Keyword -RegistryValue ([string]$e.Value) -NoRestart -ErrorAction Stop }
                'NicPM' { Set-NetAdapterPowerManagement -Name $e.Adapter -AllowComputerToTurnOffDevice Enabled -NoRestart -ErrorAction Stop }
                'Ini' {
                    if (Test-ProcessRunning $script:FnProcesses) { throw 'Fortnite esta abierto' }
                    if (Test-Path -LiteralPath $e.BackupFile) { Copy-Item -LiteralPath $e.BackupFile -Destination $e.Target -Force -ErrorAction Stop }
                }
            }
            $ok++
        } catch {
            $fail++
            Write-Status FAIL ([string]$e.Key) $_.Exception.Message
        }
    }
    $st = Get-CandyState
    if ($st.ContainsKey('PowerPlanGuid')) {
        & powercfg.exe /delete ([string]$st['PowerPlanGuid']) 2>$null | Out-Null
        Set-CandyStateValue 'PowerPlanGuid' $null
    }
    $archive = Join-Path $script:BackupDir ('undo_restaurado_' + (Get-Date -Format 'yyyyMMdd_HHmmss') + '.json')
    try { Move-Item -LiteralPath $script:BackupFile -Destination $archive -Force } catch { }
    Write-Host ''
    Write-Status OK 'Restaurados' ('{0} valores' -f $ok)
    if ($fail -gt 0) { Write-Status WARN 'Con errores' ('{0} (ver arriba)' -f $fail) }
    Write-Host '  Reinicia el PC para que todo vuelva a su estado original.' -ForegroundColor Yellow
    Write-CandyLog ('Deshacer: {0} ok, {1} fallos' -f $ok, $fail)
}

# =============================================================================
#  INFORMES / INFO
# =============================================================================
function Show-ReportsMenu {
    Clear-Host
    Show-Banner
    Write-Title 'INFORMES GUARDADOS'
    $files = @(Get-ChildItem -LiteralPath $script:ReportDir -Filter 'CandyOS_Diagnostico_*.txt' -ErrorAction SilentlyContinue | Sort-Object Name -Descending | Select-Object -First 15)
    if ($files.Count -eq 0) { Write-Status INFO 'Informes' 'Aun no hay informes. Ejecuta un diagnostico (menu 1).'; Wait-Candy; return }
    for ($i = 0; $i -lt $files.Count; $i++) { Write-Host ('  {0,2}. {1}' -f ($i + 1), $files[$i].Name) -ForegroundColor White }
    Write-Host ''
    Write-Host '  [1-n] Abrir informe   [C] Abrir carpeta   [0] Volver' -ForegroundColor Gray
    $o = Read-Option
    if ($o -eq 'C') { Start-Process 'explorer.exe' $script:ReportDir; return }
    $n = 0
    if ([int]::TryParse($o, [ref]$n) -and $n -ge 1 -and $n -le $files.Count) { Start-Process 'notepad.exe' $files[$n - 1].FullName }
}

function Show-About {
    Clear-Host
    Show-Banner
    Write-Title 'ACERCA DE CANDYOS'
    Write-Note ('CandyOS v{0} - Optimizador competitivo para Fortnite y Valorant (PC de escritorio).' -f $script:CandyVersion) 'White' 2
    Write-Host ''
    Write-Note 'Principios: 1) Diagnosticar antes de tocar. 2) Solo cambios con efecto medible, nada de placebo. 3) Todo reversible. 4) Cero riesgo con los anti-cheat (EAC / Vanguard): no se modifican archivos ni procesos de los juegos. 5) Lo temporal (Modo Enfoque) se revierte solo.' 'Gray' 2
    Write-Host ''
    Write-Note 'Lo que CandyOS NO hace a proposito: desactivar Windows Defender o actualizaciones, "limpiadores de RAM", hacks de bcdedit/timer, desactivar Nagle (Fortnite usa UDP), ni tocar archivos del juego.' 'Gray' 2
    Write-Host ''
    Write-Status INFO 'Manual' $script:CandySite
    Write-Status INFO 'Datos y copias' $script:StateDir
    Write-Status INFO 'Informes' $script:ReportDir
    Write-Status INFO 'Licencia' '(c) 2026 LukOffMon. Todos los derechos reservados.'
    Wait-Candy
}

# =============================================================================
#  MENU PRINCIPAL Y ARRANQUE
# =============================================================================
function Show-MainMenu {
    while ($true) {
        Clear-Host
        Show-Banner
        $st = Get-CandyState
        $adm = 'NO (limitado)'; $ac = 'Yellow'
        if ($script:IsAdmin) { $adm = 'SI'; $ac = 'Green' }
        $games = @()
        if ((Get-FortniteInfo).Installed) { $games += 'Fortnite' }
        if ((Get-ValorantInfo).Installed) { $games += 'Valorant' }
        $gt = 'ninguno detectado'; if ($games.Count -gt 0) { $gt = $games -join ' + ' }
        $last = 'nunca'
        if ($st.ContainsKey('LastScore') -and $null -ne $st['LastScore']) { $last = ('{0}/100 ({1})' -f $st['LastScore'], $st['LastDiag']) }
        $focus = Get-FocusSession
        Write-Host '   Admin: ' -NoNewline -ForegroundColor DarkGray; Write-Host $adm -NoNewline -ForegroundColor $ac
        Write-Host '  |  Juegos: ' -NoNewline -ForegroundColor DarkGray; Write-Host $gt -ForegroundColor White
        Write-Host '   Ultimo diagnostico: ' -NoNewline -ForegroundColor DarkGray; Write-Host $last -NoNewline -ForegroundColor White
        Write-Host '  |  Modo Enfoque: ' -NoNewline -ForegroundColor DarkGray
        if ($focus) { Write-Host 'ACTIVO' -ForegroundColor Green } else { Write-Host 'inactivo' -ForegroundColor DarkGray }
        Write-Host ''
        Write-Host '   DIAGNOSTICO' -ForegroundColor Magenta
        Write-Host '    [1] Diagnostico completo (PC + Windows + Red + Juegos + benchmarks)  ~3 min' -ForegroundColor White
        Write-Host '    [2] Diagnostico rapido (sin velocidad/bufferbloat ni benchmarks)     ~1 min' -ForegroundColor White
        Write-Host '   OPTIMIZACION PERMANENTE (reversible)' -ForegroundColor Magenta
        Write-Host '    [3] Optimizar Windows para competitivo' -ForegroundColor White
        Write-Host '    [4] Perfiles de juego (Fortnite / Valorant)' -ForegroundColor White
        Write-Host '    [5] Limpieza de basura' -ForegroundColor White
        Write-Host '    [6] Apps que arrancan con Windows' -ForegroundColor White
        Write-Host '   ANTES DE JUGAR' -ForegroundColor Magenta
        Write-Host '    [7] MODO ENFOQUE - ajustes temporales de sesion + lanzar juego' -ForegroundColor Green
        Write-Host '   HERRAMIENTAS' -ForegroundColor Magenta
        Write-Host '    [8] Monitor en tiempo real (CPU / GPU / RAM / ping)' -ForegroundColor White
        Write-Host '    [9] Centro de herramientas externas (winget)' -ForegroundColor White
        Write-Host '    [U] Deshacer cambios     [R] Informes     [I] Acerca de     [Q] Salir' -ForegroundColor Gray
        $o = Read-Option 'Elige una opcion'
        switch ($o) {
            '1' { Invoke-FullDiagnostic }
            '2' { Invoke-FullDiagnostic -Quick }
            '3' { Show-OptimizeMenu }
            '4' { Show-GameProfilesMenu }
            '5' { Show-CleanMenu }
            '6' { Show-StartupMenu }
            '7' { Show-FocusMenu }
            '8' { Start-CandyMonitor }
            '9' { Show-ToolsMenu }
            'U' { Show-UndoMenu }
            'R' { Show-ReportsMenu }
            'I' { Show-About }
            'Q' { return }
        }
    }
}

function Start-CandyOS {
    param([string]$Mode, [bool]$NoElevate, [string]$ScriptPath)

    if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT) {
        Write-Host 'CandyOS solo funciona en Windows 10/11.' -ForegroundColor Red
        return
    }
    $script:IsAdmin = Test-IsAdmin
    if (-not $script:IsAdmin -and -not $NoElevate) {
        Write-Host ''
        Write-Host '  CandyOS necesita permisos de Administrador. Solicitando...' -ForegroundColor Yellow
        $path = $ScriptPath
        if (-not $path -or -not (Test-Path -LiteralPath $path)) {
            $path = Join-Path $env:TEMP 'CandyOS.ps1'
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                (New-Object Net.WebClient).DownloadFile($script:CandyUrl, $path)
            } catch { $path = $null }
        }
        if ($path) {
            try {
                $argList = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ('"{0}"' -f $path), '-Mode', $Mode)
                Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList $argList -ErrorAction Stop | Out-Null
                return
            } catch {
                Write-Host '  Permiso denegado. Continuando con funciones limitadas...' -ForegroundColor Yellow
                Start-Sleep -Seconds 2
            }
        }
    }

    Initialize-CandyPaths
    try { $Host.UI.RawUI.WindowTitle = ('CandyOS v{0} - Competitive Optimizer (Fortnite + Valorant)' -f $script:CandyVersion) } catch { }
    try {
        $raw = $Host.UI.RawUI
        if ($raw.BufferSize.Width -lt 82) {
            $raw.BufferSize = New-Object Management.Automation.Host.Size(82, [Math]::Max($raw.BufferSize.Height, 3000))
            $raw.WindowSize = New-Object Management.Automation.Host.Size(82, [Math]::Min($raw.MaxPhysicalWindowSize.Height, 45))
        }
    } catch { }
    if ($ScriptPath -and $script:IsAdmin) { try { Unblock-File -LiteralPath $ScriptPath -ErrorAction Stop } catch { } }
    Write-CandyLog ('Inicio CandyOS v{0} (admin={1}, modo={2}, PS {3})' -f $script:CandyVersion, $script:IsAdmin, $Mode, $PSVersionTable.PSVersion)

    switch ($Mode) {
        'Diagnose'      { Invoke-FullDiagnostic }
        'QuickDiagnose' { Invoke-FullDiagnostic -Quick }
        'Optimize'      { Show-OptimizeMenu }
        'Games'         { Show-GameProfilesMenu }
        'Fortnite'      { Show-FortniteMenu }
        'Valorant'      { Show-ValorantGuide }
        'Clean'         { Show-CleanMenu }
        'Startup'       { Show-StartupMenu }
        'Focus'         { Show-FocusMenu }
        'FocusStop'     { Stop-FocusSession; Wait-Candy }
        'Monitor'       { Start-CandyMonitor }
        'Tools'         { Show-ToolsMenu }
        'Undo'          { Show-UndoMenu }
        default         { Show-MainMenu }
    }
    Write-Host ''
    Write-Host '  Gracias por usar CandyOS. GG!' -ForegroundColor Magenta
}

$candyScriptPath = $null
if ($PSCommandPath) { $candyScriptPath = $PSCommandPath }
Start-CandyOS -Mode $Mode -NoElevate:([bool]$NoElevate) -ScriptPath $candyScriptPath
