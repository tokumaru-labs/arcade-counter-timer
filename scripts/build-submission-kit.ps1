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
    @{ Source = Join-Path $root 'store-assets/screenshot-main-1280x800.png'; Name = 'screenshot-main-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-machinery-1280x800.png'; Name = 'screenshot-machinery-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-style-1280x800.png'; Name = 'screenshot-style-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-arcade-1280x800.png'; Name = 'screenshot-arcade-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-undo-1280x800.png'; Name = 'screenshot-undo-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-main-ja-1280x800.png'; Name = 'screenshot-main-ja-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-machinery-ja-1280x800.png'; Name = 'screenshot-machinery-ja-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-style-ja-1280x800.png'; Name = 'screenshot-style-ja-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-arcade-ja-1280x800.png'; Name = 'screenshot-arcade-ja-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/screenshot-undo-ja-1280x800.png'; Name = 'screenshot-undo-ja-1280x800.png' },
    @{ Source = Join-Path $root 'store-assets/store-icon-128.png'; Name = 'store-icon-128.png' },
    @{ Source = Join-Path $root 'store-assets/small-promo-440x280.png'; Name = 'small-promo-440x280.png' },
    @{ Source = Join-Path $root 'store-assets/marquee-promo-1400x560.png'; Name = 'marquee-promo-1400x560.png' },
    @{ Source = Join-Path $root "store-listing/update-v$version.md"; Name = 'README-FIRST.md' },
    @{ Source = Join-Path $root 'store-listing/en-US.md'; Name = 'listing-en-US.md' },
    @{ Source = Join-Path $root 'store-listing/ja.md'; Name = 'listing-ja.md' },
    @{ Source = Join-Path $root 'store-listing/privacy-declarations.md'; Name = 'privacy-declarations.md' },
    @{ Source = Join-Path $root 'store-listing/urls.md'; Name = 'urls.md' },
    @{ Source = Join-Path $root 'store-listing/review-notes.md'; Name = 'review-notes.md' },
    @{ Source = Join-Path $root 'store-listing/review-instructions-short.txt'; Name = 'review-instructions-short.txt' }
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

foreach ($locale in @('en-US','ja')) {
    $listing = Get-Content (Join-Path $root "store-listing/$locale.md") -Raw -Encoding UTF8
    $match = [regex]::Match($listing, '(?s)## Detailed description\s+```\s*\r?\n(.*?)\r?\n```')
    if (-not $match.Success) { throw "Detailed description missing for $locale" }
    [System.IO.File]::WriteAllText((Join-Path $kitDir "description-$locale.txt"), $match.Groups[1].Value, [System.Text.UTF8Encoding]::new($false))
}
$short = Get-Content (Join-Path $kitDir 'review-instructions-short.txt') -Raw -Encoding UTF8
if ($short.Trim().Length -gt 500) { throw 'Reviewer instructions exceed 500 characters' }

$hashLines = Get-ChildItem -LiteralPath $kitDir -File | Sort-Object Name | ForEach-Object {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($_.FullName)
    try {
        $hash = [System.BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()
    } finally {
        $stream.Dispose()
        $sha.Dispose()
    }
    "$hash  $($_.Name)"
}
[System.IO.File]::WriteAllLines((Join-Path $kitDir 'submission-files.sha256'), $hashLines, [System.Text.UTF8Encoding]::new($false))

Write-Output "Chrome Web Store submission kit: $kitDir"
Get-ChildItem -LiteralPath $kitDir -File | Sort-Object Name | ForEach-Object {
    Write-Output ("  {0} ({1:N0} bytes)" -f $_.Name, $_.Length)
}
