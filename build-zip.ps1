# Builds dist/twitch-chat-second-screen.zip, ready to install or upload.
# Only the files the extension needs are included (no tests/, README, dist/).
# Entry names use "/" and manifest.json sits at the root of the archive.
# Usage: powershell -ExecutionPolicy Bypass -File build-zip.ps1
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$racine = Split-Path -Parent $MyInvocation.MyCommand.Path
$inclus = @("manifest.json", "service-worker.js", "content.js", "content.css",
            "popup.html", "popup.js", "popup.css", "LICENSE", "lib", "icons", "_locales")

$dist = Join-Path $racine "dist"
New-Item -ItemType Directory -Force $dist | Out-Null
$zip = Join-Path $dist "twitch-chat-second-screen.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

$fichiers = foreach ($e in $inclus) {
  $p = Join-Path $racine $e
  if (-not (Test-Path $p)) { throw "Missing: $e" }
  if (Test-Path $p -PathType Container) { Get-ChildItem $p -Recurse -File } else { Get-Item $p }
}

$archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($f in $fichiers | Sort-Object FullName) {
    $nom = $f.FullName.Substring($racine.Length + 1) -replace '\\', '/'
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $f.FullName, $nom, [IO.Compression.CompressionLevel]::Optimal)
  }
} finally { $archive.Dispose() }

# Check the result.
$lecture = [IO.Compression.ZipFile]::OpenRead($zip)
try {
  $noms = @($lecture.Entries | ForEach-Object { $_.FullName })
  if ($noms -notcontains "manifest.json") { throw "manifest.json is not at the root of the ZIP" }
  if ($noms | Where-Object { $_ -like "tests/*" -or $_ -like "dist/*" -or $_ -match '\\' }) { throw "Unexpected entries in ZIP" }
  "{0} files, {1:N1} KB -> {2}" -f $noms.Count, ((Get-Item $zip).Length / 1KB), $zip
} finally { $lecture.Dispose() }
