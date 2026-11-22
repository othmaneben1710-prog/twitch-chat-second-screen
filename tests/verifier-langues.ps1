# Checks every _locales/<lang>/messages.json:
#  - valid JSON, UTF-8 without BOM
#  - exactly the same keys as "en"
#  - same $1/$2/$3 substitutions as "en"
#  - extName <= 75 characters, extDescription <= 132 characters (Chrome Web Store)
#  - every __MSG_x__ used in manifest.json and every data-i18n / t("x") in the code exists
# Usage: powershell -ExecutionPolicy Bypass -File tests\verifier-langues.ps1
$ErrorActionPreference = "Stop"
$racine = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$attendues = @("en","fr","es","pt_BR","de","it","ru","zh_CN","zh_TW","ja","ko","ar","hi","bn","id","tr","pl","uk","vi","nl")
$erreurs = New-Object Collections.Generic.List[string]

function Read-Messages($code) {
  $chemin = Join-Path $racine "_locales\$code\messages.json"
  if (-not (Test-Path $chemin)) { $erreurs.Add("$code : fichier manquant"); return $null }
  $octets = [IO.File]::ReadAllBytes($chemin)
  if ($octets.Length -ge 3 -and $octets[0] -eq 0xEF -and $octets[1] -eq 0xBB -and $octets[2] -eq 0xBF) { $erreurs.Add("$code : BOM UTF-8") }
  try { return ([Text.Encoding]::UTF8.GetString($octets) | ConvertFrom-Json) }
  catch { $erreurs.Add("$code : JSON invalide ($($_.Exception.Message))"); return $null }
}
function Get-Substitutions([string]$s) { ([regex]::Matches($s, '\$[1-9]') | ForEach-Object { $_.Value } | Sort-Object -Unique) -join "," }

$present = Get-ChildItem (Join-Path $racine "_locales") -Directory | ForEach-Object { $_.Name }
foreach ($c in $attendues) { if ($present -notcontains $c) { $erreurs.Add("langue manquante : $c") } }
foreach ($c in $present) { if ($attendues -notcontains $c) { $erreurs.Add("langue inattendue : $c") } }

$en = Read-Messages "en"
$clesEn = @($en.PSObject.Properties.Name | Sort-Object)
$rapport = @()
foreach ($code in $attendues) {
  $m = Read-Messages $code
  if (-not $m) { continue }
  $cles = @($m.PSObject.Properties.Name | Sort-Object)
  $diff = Compare-Object $clesEn $cles
  if ($diff) { $erreurs.Add("$code : cles differentes de en -> " + (($diff | ForEach-Object { "$($_.SideIndicator)$($_.InputObject)" }) -join " ")) }
  foreach ($k in $clesEn) {
    $p = $m.$k
    if (-not $p -or -not $p.message) { $erreurs.Add("$code.$k : message vide"); continue }
    if ((Get-Substitutions $p.message) -ne (Get-Substitutions $en.$k.message)) { $erreurs.Add("$code.$k : substitutions differentes de en") }
  }
  $lgNom = $m.extName.message.Length
  $lgDesc = $m.extDescription.message.Length
  if ($lgNom -gt 75) { $erreurs.Add("$code : extName trop long ($lgNom > 75)") }
  if ($lgDesc -gt 132) { $erreurs.Add("$code : extDescription trop longue ($lgDesc > 132)") }
  $rapport += "{0,-6} nom={1,3}  description={2,3}" -f $code, $lgNom, $lgDesc
}

# Keys used by the code must exist.
$utilisees = New-Object Collections.Generic.HashSet[string]
$manifest = [IO.File]::ReadAllText((Join-Path $racine "manifest.json"))
[regex]::Matches($manifest, '__MSG_(\w+)__') | ForEach-Object { [void]$utilisees.Add($_.Groups[1].Value) }
foreach ($f in "popup.html","popup.js","content.js","service-worker.js","lib\ecrans.js") {
  $txt = [IO.File]::ReadAllText((Join-Path $racine $f))
  [regex]::Matches($txt, 'data-i18n="(\w+)"') | ForEach-Object { [void]$utilisees.Add($_.Groups[1].Value) }
  [regex]::Matches($txt, '\b(?:t|getMessage)\("(\w+)"') | ForEach-Object { [void]$utilisees.Add($_.Groups[1].Value) }
}
foreach ($k in $utilisees) { if ($clesEn -notcontains $k) { $erreurs.Add("cle utilisee mais absente : $k") } }
foreach ($k in $clesEn) { if (-not $utilisees.Contains($k)) { $erreurs.Add("cle jamais utilisee : $k") } }

$rapport
"cles: $($clesEn.Count), langues: $($present.Count), cles utilisees par le code: $($utilisees.Count)"
if ($erreurs.Count) { $erreurs | ForEach-Object { "ERREUR  $_" }; exit 1 } else { "RESULTAT: toutes les langues sont valides" }
