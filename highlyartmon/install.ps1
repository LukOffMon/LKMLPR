# HighlyArtMon - Windows installer (no admin needed).
#   irm https://raw.githubusercontent.com/LukOffMon/LKMLPR/main/highlyartmon/install.ps1 | iex
# Installs the app for your user, adds Start Menu + Desktop shortcuts, connects it to Claude (Code + Desktop) and opens it.
$ErrorActionPreference = "Stop"
$Src = "https://github.com/LukOffMon/LKMLPR/archive/refs/heads/main.zip#subdirectory=highlyartmon/app"
if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "app\pyproject.toml"))) { $Src = Join-Path $PSScriptRoot "app" }

function Find-Python {
  foreach ($c in @(@("py", "-3"), @("python"), @("python3"))) {
    try {
      $v = & $c[0] $c[1..9] -c "import sys; print(sys.version_info >= (3, 9))" 2>$null
      if ($v -eq "True") { return ,$c }
    } catch {}
  }
  return $null
}

Write-Host "-> Installing HighlyArtMon" -ForegroundColor Magenta
$py = Find-Python
if (-not $py) {
  Write-Host "-> Python 3 not found; installing it with winget (one time)..."
  winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements | Out-Null
  $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
  $py = Find-Python
  if (-not $py) { throw "Python 3.9+ is required. Install it from https://www.python.org/downloads/ and run this again." }
}
$PyExe = $py[0]; $PyArgs = @($py | Select-Object -Skip 1)

& $PyExe @PyArgs -m pip install --user --upgrade --quiet --disable-pip-version-check $Src
if ($LASTEXITCODE -ne 0) { throw "pip install failed" }

$info = & $PyExe @PyArgs -c "import sys, os; d=os.path.dirname(sys.executable); print(os.path.join(d,'pythonw.exe')); print(sys.executable)"
$Pythonw, $Python = $info[0], $info[1]
if (-not (Test-Path $Pythonw)) { $Pythonw = $Python }

$shell = New-Object -ComObject WScript.Shell
foreach ($lnkPath in @((Join-Path ([Environment]::GetFolderPath("Programs")) "HighlyArtMon.lnk"), (Join-Path ([Environment]::GetFolderPath("Desktop")) "HighlyArtMon.lnk"))) {
  $lnk = $shell.CreateShortcut($lnkPath)
  $lnk.TargetPath = $Pythonw
  $lnk.Arguments = "-m highlyartmon"
  $lnk.Description = "HighlyArtMon - pixel-art studio for you and Claude"
  $lnk.WorkingDirectory = $env:USERPROFILE
  $lnk.Save()
}
Write-Host "-> Shortcuts added to the Start Menu and Desktop"

& $Python -m highlyartmon connect
Start-Process -FilePath $Pythonw -ArgumentList "-m highlyartmon"
Write-Host "Done. HighlyArtMon is open. Ask Claude: 'disena un sprite de 32x32 de un caballero con HighlyArtMon'." -ForegroundColor Magenta
