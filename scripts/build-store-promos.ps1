# Builds the Chrome Web Store promotional tiles with System.Drawing.
#
# Output : store-assets/small-promo-440x280.png     (required by the store)
#          store-assets/marquee-promo-1400x560.png  (optional)
#
# Original artwork only: the same icon mark, palette and monospace treatment as
# the extension itself. No product screenshots and no claims about features
# that do not exist.
#
#   powershell -ExecutionPolicy Bypass -File scripts/build-store-promos.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'store-assets'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Draw-Mark {
    # The icon mark: open blue-white ring plus an orange cross.
    param([System.Drawing.Graphics]$g, [float]$cx, [float]$cy, [float]$size)

    $u = $size / 128.0
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 185, 221, 255), [float](11 * $u))
    $ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $r = 40 * $u
    $g.DrawArc($ringPen, [float]($cx - $r), [float]($cy - $r), [float]($r * 2), [float]($r * 2), 125, 280)

    $plusPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 176, 99), [float](12 * $u))
    $plusPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $plusPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arm = 14 * $u
    $g.DrawLine($plusPen, [float]($cx - $arm), [float]$cy, [float]($cx + $arm), [float]$cy)
    $g.DrawLine($plusPen, [float]$cx, [float]($cy - $arm), [float]$cx, [float]($cy + $arm))

    $ringPen.Dispose(); $plusPen.Dispose()
}

function New-Tile {
    param(
        [int]$w, [int]$h, [string]$path,
        [float]$markSize, [float]$markX,
        [float]$textX, [float]$titleSize, [float]$copySize
    )

    $bmp = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

    # Gradient vector reaches the far corner so GDI+ does not tile it back.
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($w, $h)),
        [System.Drawing.Color]::FromArgb(255, 4, 6, 13),
        [System.Drawing.Color]::FromArgb(255, 12, 22, 52))
    $g.FillRectangle($bg, 0, 0, $w, $h)
    $bg.Dispose()

    $line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(9, 255, 255, 255), 1)
    for ($y = 0; $y -lt $h; $y += 3) { $g.DrawLine($line, 0, $y, $w, $y) }
    $line.Dispose()

    Draw-Mark -g $g -cx $markX -cy ($h / 2.0) -size $markSize

    $titleFont = New-Object System.Drawing.Font('Consolas', $titleSize, [System.Drawing.FontStyle]::Regular)
    $copyFont = New-Object System.Drawing.Font('Consolas', $copySize, [System.Drawing.FontStyle]::Regular)
    $blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 213, 234, 255))
    $orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 176, 99))
    $dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 143, 168, 205))

    $block = $titleSize * 2.6 + $copySize * 2.4
    $y = ($h / 2.0) - ($block / 2.0)

    $g.DrawString('ARCADE', $titleFont, $blue, $textX, $y)
    $y += $titleSize * 2.0
    $g.DrawString('COUNTER TIMER', $titleFont, $blue, $textX, $y)
    $y += $titleSize * 2.3
    $g.DrawString('TIME IT.  COUNT IT.', $copyFont, $orange, $textX, $y)
    $y += $copySize * 2.1
    $g.DrawString('Local statistics. No account.', $copyFont, $dim, $textX, $y)

    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

    $titleFont.Dispose(); $copyFont.Dispose()
    $blue.Dispose(); $orange.Dispose(); $dim.Dispose()
    $g.Dispose(); $bmp.Dispose()
    Write-Output ("  {0} ({1}x{2})" -f $path, $w, $h)
}

Write-Output 'Rendering promo tiles:'
New-Tile -w 440 -h 280 -path (Join-Path $outDir 'small-promo-440x280.png') `
    -markSize 104 -markX 86 -textX 158 -titleSize 15 -copySize 8.5

New-Tile -w 1400 -h 560 -path (Join-Path $outDir 'marquee-promo-1400x560.png') `
    -markSize 300 -markX 300 -textX 540 -titleSize 42 -copySize 21
