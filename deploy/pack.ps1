# Build the upload package on Windows:  powershell -ExecutionPolicy Bypass -File deploy\pack.ps1
# Creates daily-closing.tar.gz (without node_modules). Add -WithData to include your current database.
# (tar.gz, not zip: Windows zip files can extract with broken folder names on Linux)
param([switch]$WithData)
$root = Split-Path $PSScriptRoot -Parent
$out = Join-Path $root 'daily-closing.tar.gz'
$stage = Join-Path $env:TEMP ('dc-pack-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$items = 'server.js', 'db.js', 'package.json', 'package-lock.json', 'public', 'deploy', 'scripts', 'README.md', 'DEPLOY.md', 'DEPLOY-RENDER.md'
foreach ($i in $items) { $p = Join-Path $root $i; if (Test-Path $p) { Copy-Item $p -Destination $stage -Recurse } }
if ($WithData) {
  # a consistent copy even while the app is running (SQLite online backup)
  New-Item -ItemType Directory -Path (Join-Path $stage 'data') | Out-Null
  $dst = (Join-Path $stage 'data\shrakh.db') -replace '\\', '/'
  $src = (Join-Path $root 'data\shrakh.db') -replace '\\', '/'
  Push-Location $root
  node -e "require('better-sqlite3')('$src',{readonly:true}).backup('$dst').then(()=>console.log('database included'))"
  Pop-Location
}
if (Test-Path $out) { Remove-Item $out }
tar -czf $out -C $stage .
Remove-Item $stage -Recurse -Force
Write-Host "Created: $out"
