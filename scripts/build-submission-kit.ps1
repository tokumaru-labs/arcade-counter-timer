# Collects every file needed for a manual Chrome Web Store update into one
# versioned folder under dist/. It does not upload or submit anything.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version
$distDir = Join-Path $root 'dist'
$kitDir = Join-Path $distDir "chrome-web-store-v$version"

# Resolve and fence the generated directory before clearing an older kit.
$distFull = [System.IO.Path]::GetFullPath($distDir).TrimEnd('\')
$kitFull = [System.IO.Path]::GetFullPath($kitDir)
if (-not $kitFull.StartsWith("$distFull\", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clear a submission directory outside dist/: $kitFull"
}

$zipName = "arcade-counter-timer-v$version-chrome-web-store.zip"
$zipPath = Join-Path $distDir $zipName

$files = @(
    @{ Source = $zipPath; Name = $zipName },
    @{ Source = "$zipPath.sha256"; Name = "$zipName.sha256" },
    @{ Source = Join-Path $root 'store-assets/screenshot-main-1280x800.png'; Name = '01-screenshot-original-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-arcade-1280x800.png'; Name = '02-screenshot-arcade-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-editorial-1280x800.png'; Name = '03-screenshot-editorial-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-stats-1280x800.png'; Name = '04-screenshot-stats-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/store-icon-128.png'; Name = 'store-icon-128.png' },
    @{ Source = Join-Path $root 'store-assets/small-promo-440x280.png'; Name = 'small-promo-440x280.png' },
    @{ Source = Join-Path $root 'store-assets/marquee-promo-1400x560.png'; Name = 'marquee-promo-1400x560.png' },
    @{ Source = Join-Path $root "store-listing/update-v$version.md"; Name = 'README-FIRST.md' },
    @{ Source = Join-Path $root 'store-listing/en-US.md'; Name = 'listing-en-US.md' },
    @{ Source = Join-Path $root 'store-listing/ja.md'; Name = 'listing-ja.md' },
    @{ Source = Join-Path $root 'store-listing/privacy-declarations.md'; Name = 'privacy-declarations.md' },
    @{ Source = Join-Path $root 'store-listing/urls.md'; Name = 'urls.md' },
    @{ Source = Join-Path $root 'store-listing/review-notes.md'; Name = 'review-notes.md' }
)

foreach ($item in $files) {
    if (-not (Test-Path -LiteralPath $item.Source)) {
        throw "Missing submission file: $($item.Source)"
    }
}

if (Test-Path -LiteralPath $kitDir) {
    Remove-Item -LiteralPath $kitDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $kitDir | Out-Null
foreach ($item in $files) {
    Copy-Item -LiteralPath $item.Source -Destination (Join-Path $kitDir $item.Name) -Force
}

Write-Output "Chrome Web Store submission kit: $kitDir"
Get-ChildItem -LiteralPath $kitDir -File | Sort-Object Name | ForEach-Object {
    Write-Output ("  {0} ({1:N0} bytes)" -f $_.Name, $_.Length)
}
