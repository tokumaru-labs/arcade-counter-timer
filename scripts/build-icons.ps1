# Renders assets/icon-source.svg to PNG using System.Drawing (no external tools).
# The geometry below mirrors the SVG; keep the two in step if the design changes.
#
#   powershell -ExecutionPolicy Bypass -File scripts/build-icons.ps1

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root 'assets/icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

# Design constants, expressed on the 128-unit grid used by the SVG.
$GRID = 128.0
$SUPERSAMPLE = 8

function New-RoundedPath {
    param([float]$x, [float]$y, [float]$w, [float]$h, [float]$r)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-IconBitmap {
    param([int]$size)

    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $s = $size / $GRID  # grid unit -> pixels

    # Panel with the dark navy gradient and a thin cool outline.
    $panel = New-RoundedPath ([float](2 * $s)) ([float](2 * $s)) ([float](124 * $s)) ([float](124 * $s)) ([float](26 * $s))
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point($size, $size)),
        [System.Drawing.Color]::FromArgb(255, 5, 7, 15),
        [System.Drawing.Color]::FromArgb(255, 11, 20, 48))
    $g.FillPath($brush, $panel)
    $outline = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 42, 61, 99), [float](2 * $s))
    $g.DrawPath($outline, $panel)

    # Timer ring: open at the top right.
    $ringPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 185, 221, 255), [float](11 * $s))
    $ringPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $ringPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $r = 40 * $s
    $g.DrawArc($ringPen, [float](64 * $s - $r), [float](64 * $s - $r), [float]($r * 2), [float]($r * 2), 125, 280)

    # Counter plus, kept clear of the ring so both read at 16px.
    $plusPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 255, 176, 99), [float](12 * $s))
    $plusPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $plusPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($plusPen, [float](50 * $s), [float](64 * $s), [float](78 * $s), [float](64 * $s))
    $g.DrawLine($plusPen, [float](64 * $s), [float](50 * $s), [float](64 * $s), [float](78 * $s))

    $g.Dispose()
    $brush.Dispose(); $outline.Dispose(); $ringPen.Dispose(); $plusPen.Dispose(); $panel.Dispose()
    return $bmp
}

function Save-Icon {
    param([int]$size, [string]$path)

    # Draw large, then downscale: small sizes stay legible instead of aliasing.
    $large = New-IconBitmap -size ($size * $SUPERSAMPLE)
    $out = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($out)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($large, (New-Object System.Drawing.Rectangle(0, 0, $size, $size)))
    $g.Dispose()
    $out.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $large.Dispose()
    Write-Output ("  {0} ({1}x{1})" -f $path, $size)
}

Write-Output 'Rendering icons:'
foreach ($size in 16, 32, 48, 128) {
    Save-Icon -size $size -path (Join-Path $iconDir "icon$size.png")
}

# The store listing uses the same 128px mark.
$storeDir = Join-Path $root 'store-assets'
New-Item -ItemType Directory -Force -Path $storeDir | Out-Null
Copy-Item (Join-Path $iconDir 'icon128.png') (Join-Path $storeDir 'store-icon-128.png') -Force
Write-Output ("  {0} (128x128)" -f (Join-Path $storeDir 'store-icon-128.png'))
