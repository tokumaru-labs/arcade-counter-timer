# Builds the Chrome Web Store upload ZIP, then verifies what it actually built.
#
# Output : dist/arcade-counter-timer-v0.1.1-chrome-web-store.zip
#          dist/arcade-counter-timer-v0.1.1-chrome-web-store.zip.sha256
#
# Only runtime files are included, and manifest.json sits at the archive root
# with no wrapper directory. Everything is staged into a clean temporary folder
# first, so nothing stray from the working tree can slip in.
#
#   npm run package

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$distDir = Join-Path $root 'dist'
$zipName = "arcade-counter-timer-v$version-chrome-web-store.zip"
$zipPath = Join-Path $distDir $zipName

# The complete contents of the published extension.
$runtimeFiles = @(
    'manifest.json',
    'popup.html',
    'popup.css',
    'popup.js',
    'src/time.js',
    'src/storage.js',
    'src/effects.js',
    'src/input.js',
    '_locales/en/messages.json',
    '_locales/ja/messages.json',
    'assets/icons/icon16.png',
    'assets/icons/icon32.png',
    'assets/icons/icon48.png',
    'assets/icons/icon128.png',
    'LICENSE'
)

Write-Output "Packaging Arcade Counter Timer v$version"

# --- zip --------------------------------------------------------------------

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Entries are created one by one rather than with CreateFromDirectory: on .NET
# Framework that helper writes Windows path separators into the archive, and
# the ZIP format requires forward slashes. Naming each entry explicitly also
# guarantees there is no wrapper directory.
foreach ($rel in $runtimeFiles) {
    if (-not (Test-Path (Join-Path $root $rel))) { throw "Missing runtime file: $rel" }
}

$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($rel in $runtimeFiles) {
        $entryName = $rel -replace '\\', '/'
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $zip, (Join-Path $root $rel), $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
    }
}
finally {
    $zip.Dispose()
}

# --- verify what was built --------------------------------------------------

Write-Output ''
Write-Output 'Verifying the archive:'

$problems = @()
function Assert-Release {
    param([string]$label, [bool]$ok, [string]$detail = '')
    if ($ok) {
        Write-Output "  PASS  $label"
    } else {
        $script:problems += $label
        Write-Output ("  FAIL  $label" + $(if ($detail) { " - $detail" } else { '' }))
    }
}

Assert-Release 'ZIP exists' (Test-Path $zipPath)

$zipInfo = Get-Item $zipPath
$sizeKb = [math]::Round($zipInfo.Length / 1KB, 1)
Write-Output "  ZIP size: $sizeKb KB ($($zipInfo.Length) bytes)"

$archive = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
try {
    $names = @($archive.Entries | ForEach-Object { $_.FullName })
    Assert-Release 'entry names use forward slashes' (-not ($names | Where-Object { $_ -like '*\*' }))

    Write-Output '  Contents:'
    $names | Sort-Object | ForEach-Object { Write-Output "    $_" }

    Assert-Release 'manifest.json is at the archive root' ($names -contains 'manifest.json')
    Assert-Release 'no wrapper directory' (-not ($names | Where-Object { $_ -like 'arcade-counter-timer/*' }))

    $unexpected = $names | Where-Object { $runtimeFiles -notcontains $_ }
    Assert-Release 'only runtime files are included' ($unexpected.Count -eq 0) ($unexpected -join ', ')

    $missing = $runtimeFiles | Where-Object { $names -notcontains $_ }
    Assert-Release 'every runtime file is included' ($missing.Count -eq 0) ($missing -join ', ')

    foreach ($icon in @('assets/icons/icon16.png', 'assets/icons/icon32.png', 'assets/icons/icon48.png', 'assets/icons/icon128.png')) {
        Assert-Release "includes $icon" ($names -contains $icon)
    }
    foreach ($banned in @('tests/', 'scripts/', 'store-assets/', 'store-listing/', 'dist/', 'node_modules/', '.git/', '.claude/')) {
        Assert-Release "excludes $banned" (-not ($names | Where-Object { $_ -like "$banned*" }))
    }
    foreach ($banned in @('package.json', 'package-lock.json', 'README.md', 'README_JA.md', 'PRIVACY.md', 'PRIVACY_JA.md', 'CHANGELOG.md', 'SECURITY.md', '.gitignore')) {
        Assert-Release "excludes $banned" ($names -notcontains $banned)
    }

    # Read manifest.json back out of the archive rather than trusting the source.
    $entry = $archive.GetEntry('manifest.json')
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $zipManifestText = $reader.ReadToEnd()
    $reader.Close()

    $zipManifest = $null
    try {
        $zipManifest = $zipManifestText | ConvertFrom-Json
        Assert-Release 'manifest.json inside the ZIP is valid JSON' $true
    } catch {
        Assert-Release 'manifest.json inside the ZIP is valid JSON' $false $_.Exception.Message
    }

    if ($zipManifest) {
        Assert-Release "ZIP manifest version is $version" ($zipManifest.version -eq $version) $zipManifest.version
        Assert-Release 'ZIP manifest_version is 3' ($zipManifest.manifest_version -eq 3)
        Assert-Release 'ZIP manifest default_locale is en' ($zipManifest.default_locale -eq 'en') $zipManifest.default_locale
        Assert-Release 'ZIP manifest name is __MSG_extensionName__' ($zipManifest.name -eq '__MSG_extensionName__') $zipManifest.name
        Assert-Release 'ZIP manifest description is __MSG_extensionDescription__' ($zipManifest.description -eq '__MSG_extensionDescription__') $zipManifest.description
        Assert-Release 'ZIP manifest action.default_title is __MSG_extensionName__' ($zipManifest.action.default_title -eq '__MSG_extensionName__') $zipManifest.action.default_title
        $perms = @($zipManifest.permissions)
        Assert-Release 'ZIP permissions are exactly ["storage"]' ($perms.Count -eq 1 -and $perms[0] -eq 'storage') ($perms -join ', ')
        Assert-Release 'ZIP manifest has no host_permissions' ($null -eq $zipManifest.host_permissions)
        Assert-Release 'ZIP manifest has no background' ($null -eq $zipManifest.background)
        Assert-Release 'ZIP manifest has no content_scripts' ($null -eq $zipManifest.content_scripts)
    }

    # The localized name and description the Store will actually display.
    foreach ($locale in @('en', 'ja')) {
        $rel = "_locales/$locale/messages.json"
        Assert-Release "includes $rel" ($names -contains $rel)
        if ($names -notcontains $rel) { continue }

        $e = $archive.GetEntry($rel)
        $r = New-Object System.IO.StreamReader($e.Open(), [System.Text.UTF8Encoding]::new($false))
        $messagesText = $r.ReadToEnd()
        $r.Close()

        $messages = $null
        try {
            $messages = $messagesText | ConvertFrom-Json
            Assert-Release "$rel inside the ZIP is valid JSON" $true
        } catch {
            Assert-Release "$rel inside the ZIP is valid JSON" $false $_.Exception.Message
        }

        if ($messages) {
            Assert-Release "$rel defines extensionName" (-not [string]::IsNullOrWhiteSpace($messages.extensionName.message))
            Assert-Release "$rel defines extensionDescription" (-not [string]::IsNullOrWhiteSpace($messages.extensionDescription.message))
            $len = "$($messages.extensionDescription.message)".Length
            Assert-Release "$rel description is within 132 characters" ($len -le 132) "$len characters"
        }
    }

    # No packaged code may reach out to the network.
    $remote = @()
    foreach ($name in $names) {
        if ($name -notmatch '\.(js|html|css|json)$') { continue }
        $e = $archive.GetEntry($name)
        $r = New-Object System.IO.StreamReader($e.Open())
        $text = $r.ReadToEnd()
        $r.Close()
        if ($text -match 'https?://') { $remote += $name }
    }
    Assert-Release 'no packaged code references http(s) URLs' ($remote.Count -eq 0) ($remote -join ', ')
}
finally {
    $archive.Dispose()
}

# --- checksum ---------------------------------------------------------------

$hash = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToLower()
$shaPath = "$zipPath.sha256"
"$hash  $zipName" | Out-File -FilePath $shaPath -Encoding ascii -NoNewline
Write-Output ''
Write-Output "  SHA-256: $hash"
Write-Output "  Written: $shaPath"

Write-Output ''
if ($problems.Count -gt 0) {
    throw "package-release: $($problems.Count) check(s) failed"
}
Write-Output "Package ready: $zipPath"
