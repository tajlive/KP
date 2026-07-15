# Skriv til C:\Users\taj\build-kp.ps1 — PowerShell script
# Henter token via curl til GitHub API
# Kloner repo, bygger, og kopierer artefakter til C:\Users\taj\build-output\

$ErrorActionPreference = "Stop"

$repoUrl = "https://github.com/tajlive/KP.git"
$buildDir = "$env:USERPROFILE\kp-build"
$outputDir = "$env:USERPROFILE\build-output"
$token = ""

Write-Host "=== Klarpakke Build Script ==="

# Hent GH token via API
try {
    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/tajlive/KP/actions/runners/registration-token" -Method POST -Headers @{
        "Accept" = "application/vnd.github+json"
        "Authorization" = "Bearer __GH_TOKEN__"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $token = $response.token
    Write-Host "Token obtained"
} catch {
    Write-Host "WARNING: Could not get GH token, continuing without runner registration"
}

# Rydd og klon
if (Test-Path $buildDir) { Remove-Item -Recurse -Force $buildDir }
Write-Host "Cloning repo..."
git clone --depth 1 $repoUrl $buildDir 2>&1 | Out-Null
Write-Host "Repo cloned"

# Installer avhengigheter
Set-Location $buildDir
npm ci 2>&1 | Out-Null
Write-Host "npm ci done"

# Bygg
$env:NEXT_PUBLIC_SUPABASE_URL = "https://pskhryjzkobytnfwucrb.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__"
$env:SUPABASE_SERVICE_ROLE_KEY = "__SERVICE_ROLE_KEY__"
$env:CLOUDFLARE_API_TOKEN = "__CF_TOKEN__"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

Write-Host "Building..."
npm run cf:build 2>&1 | Out-Null
Write-Host "Build complete"

# Pakk artefakter
if (Test-Path $outputDir) { Remove-Item -Recurse -Force $outputDir }
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

if (Test-Path ".open-next") {
    Copy-Item -Recurse ".open-next" "$outputDir\.open-next"
}
if (Test-Path ".next") {
    Copy-Item -Recurse ".next" "$outputDir\.next"
}

Write-Host "Artifacts ready at $outputDir"
Write-Host "BUILD_COMPLETE"
