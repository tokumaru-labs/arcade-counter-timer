# Composes the 1280x800 Chrome Web Store screenshots from real popup captures.
#
# Input  : store-assets/source/popup-main.png   (360x540)
#          store-assets/source/popup-stats.png  (360x540)
# Output : store-assets/screenshot-main-1280x800.png
#          store-assets/screenshot-stats-1280x800.png
#
# Produce the inputs with `npm run capture`, which screenshots the real popup
# with headless Chrome, or drop in your own captures of the installed
# extension. The popup image is only scaled and centred — never redrawn,
# retouched or recomposed. If an input is missing this script fails loudly
# rather than inventing a picture.
#
#   powershell -ExecutionPolicy Bypass -File scripts/build-store-screenshots.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcDir = Join-Path $root 'store-assets/source'
$outDir = Join-Path $root 'store-assets'

$WIDTH = 1280
$HEIGHT = 800

$shots = @(
    @{
        Source  = Join-Path $srcDir 'popup-main.png'
        Out     = Join-Path $outDir 'screenshot-main-1280x800.png'
        Title   = 'Arcade Counter Timer'
        Copy    = 'A timer and counter that rewards your rhythm.'
        Details = @('Count-up timer that keeps running when the popup closes',
                    'One press, one count', 'Brief milestone effects, all switchable')
    },
    @{
        Source  = Join-Path $srcDir 'popup-stats.png'
        Out     = Join-Path $outDir 'screenshot-stats-1280x800.png'
        Title   = 'Your totals, kept local'
        Copy    = 'Local statistics. No account. No tracking.'
        Details = @('TODAY, WEEK, MONTH and YEAR at a glance',
                    'Derived from one local daily history', 'Permissions: storage only')
    }
)

foreach ($shot in $shots) {
    if (-not (Test-Path $shot.Source)) {
        throw "Missing source capture: $($shot.Source)`nRun 'npm run capture', or place a real 360x540 popup screenshot there. This script will not fabricate one."
    }
}

function New-Background {
    param([System.Drawing.Graphics]$g, [int]$w, [int]$h)

    # Same palette as the extension: near-black to deep navy.
    # The gradient vector must reach the far corner, otherwise GDI+ tiles it
    # back on itself and leaves a visible diagonal seam.
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($w, $h)),
        [System.Drawing.Color]::FromArgb(255, 4, 6, 13),
        [System.Drawing.Color]::FromArgb(255, 11, 20, 48))
    $g.FillRectangle($bg, 0, 0, $w, $h)
    $bg.Dispose()

    # Faint scanlines, echoing the popup's optional CRT effect.
    $line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(10, 255, 255, 255), 1)
    for ($y = 0; $y -lt $h; $y += 3) { $g.DrawLine($line, 0, $y, $w, $y) }
    $line.Dispose()
}

foreach ($shot in $shots) {
    $popup = [System.Drawing.Image]::FromFile($shot.Source)
    try {
        if ($popup.Width -ne 360 -or $popup.Height -ne 540) {
            throw "Unexpected source size for $($shot.Source): $($popup.Width)x$($popup.Height), expected 360x540"
        }

        $canvas = New-Object System.Drawing.Bitmap($WIDTH, $HEIGHT, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        $g = [System.Drawing.Graphics]::FromImage($canvas)
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

        New-Background -g $g -w $WIDTH -h $HEIGHT

        # Popup, scaled uniformly. No cropping and no distortion.
        $scale = 1.3
        $pw = [int]($popup.Width * $scale)
        $ph = [int]($popup.Height * $scale)
        $px = 118
        $py = [int](($HEIGHT - $ph) / 2)

        $glow = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 120, 190, 255), 2)
        $g.DrawRectangle($glow, ($px - 6), ($py - 6), ($pw + 11), ($ph + 11))
        $glow.Dispose()
        $g.DrawImage($popup, (New-Object System.Drawing.Rectangle($px, $py, $pw, $ph)))

        # Copy block on the right.
        $tx = $px + $pw + 90
        # Keep titles short: at this size the canvas fits roughly 26 characters.
        $titleFont = New-Object System.Drawing.Font('Consolas', 28, [System.Drawing.FontStyle]::Regular)
        $copyFont = New-Object System.Drawing.Font('Consolas', 17, [System.Drawing.FontStyle]::Regular)
        $detailFont = New-Object System.Drawing.Font('Consolas', 13, [System.Drawing.FontStyle]::Regular)

        $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 213, 234, 255))
        $dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 143, 168, 205))
        $orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 176, 99))

        $y = 232
        $g.DrawString($shot.Title, $titleFont, $blue, $tx, $y)
        $y += 62
        $g.DrawString($shot.Copy, $copyFont, $orange, $tx, $y)
        $y += 58

        foreach ($detail in $shot.Details) {
            $bullet = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 120, 190, 255))
            $g.FillRectangle($bullet, $tx, ($y + 8), 6, 6)
            $bullet.Dispose()
            $g.DrawString($detail, $detailFont, $dim, ($tx + 18), $y)
            $y += 34
        }

        $canvas.Save($shot.Out, [System.Drawing.Imaging.ImageFormat]::Png)

        $titleFont.Dispose(); $copyFont.Dispose(); $detailFont.Dispose()
        $blue.Dispose(); $dim.Dispose(); $orange.Dispose()
        $g.Dispose(); $canvas.Dispose()
        Write-Output ("  {0} ({1}x{2})" -f $shot.Out, $WIDTH, $HEIGHT)
    }
    finally {
        $popup.Dispose()
    }
}

Write-Output 'Store screenshots composed from real popup captures.'
