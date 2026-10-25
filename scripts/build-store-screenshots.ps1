# Compose localized 1280x800 store images from complete, real extension captures.
# Only uniform scaling and caption framing; no UI redraw, crop or retouch.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $root 'store-assets/source'
$out = Join-Path $root 'store-assets'
$slides = @(
 @{Key='main'; En='Six themes. Your kind of focus.'; Ja='6つのテーマで、自分らしい集中。'; EnSub='A count-up timer, a counter, and room to undo.'; JaSub='時間を計る。数を重ねる。押し間違いは戻せる。'; Shots=@(,@('popup-main.png',65,220,600,520)); Side=$true},
 @{Key='machinery'; En='Mechanics with character'; Ja='機械の手応えを、画面の中に。'; EnSub='STEAMPUNK / split flaps     NIXIE / photographed cathodes'; JaSub='STEAMPUNKのパタパタ表示、NIXIEのガラスと光。'; Shots=@(@('popup-steampunk-main.png',55,225,555,481),@('popup-nixie-main.png',670,225,555,481))},
 @{Key='style'; En='Two ways to be elegant'; Ja='エレガンスにも、ふたつの表情。'; EnSub='ART DECO / emerald and gold     EDITORIAL / black and white'; JaSub='ART DECOの深緑と金。EDITORIALの白と黒。'; Shots=@(@('popup-art-deco-main.png',55,225,600,520),@('popup-editorial-main.png',830,200,360,540))},
 @{Key='arcade'; En='Keep a little momentum'; Ja='作業に、小さな勢いを。'; EnSub='ARCADE / neon feedback     Local totals / today, week, month, year'; JaSub='ARCADEのネオン演出。日・週・月・年の記録は端末内へ。'; Shots=@(@('popup-arcade-main.png',165,205,360,540),@('popup-arcade-stats.png',755,205,360,540))},
 @{Key='undo'; En='UNDO. Again. And again.'; Ja='UNDOは、何度でも。'; EnSub='42 → 41 → 40. Repeat while history remains. Resets clear undo history.'; JaSub='42 → 41 → 40。履歴がある限り戻せます。リセットで取り消し履歴は消去。'; Shots=@(@('popup-main.png',55,225,555,481),@('popup-undo.png',670,225,555,481))}
)
foreach($locale in @('en','ja')) {
 foreach($slide in $slides) {
  $bmp = New-Object System.Drawing.Bitmap(1280,800,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush([System.Drawing.Point]::new(0,0),[System.Drawing.Point]::new(1280,800),[System.Drawing.Color]::FromArgb(7,12,21),[System.Drawing.Color]::FromArgb(24,30,43))
  $g.FillRectangle($bg,0,0,1280,800); $bg.Dispose()
  $fontName = if($locale -eq 'ja'){'Yu Gothic'}else{'Segoe UI'}
  $heading = New-Object System.Drawing.Font($fontName,32,[System.Drawing.FontStyle]::Bold)
  $body = New-Object System.Drawing.Font($fontName,16)
  $tag = New-Object System.Drawing.Font('Segoe UI',11)
  $light = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(236,239,243))
  $dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(179,190,207))
  $accent = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(250,176,99))
  $title = if($locale -eq 'ja'){$slide.Ja}else{$slide.En}
  $sub = if($locale -eq 'ja'){$slide.JaSub}else{$slide.EnSub}
  $g.DrawString('TOKUMARU LABS  /  ARCADE COUNTER TIMER 0.3.0',$tag,$accent,55,28)
  $g.DrawString($title,$heading,$light,[System.Drawing.RectangleF]::new(52,60,1180,72))
  $g.DrawString($sub,$body,$dim,[System.Drawing.RectangleF]::new(55,143,1170,60))
  foreach($shot in $slide.Shots) {
   $path=Join-Path $src $shot[0]
   $img=[System.Drawing.Image]::FromFile($path)
   try {
    if(-not (($img.Width -eq 600 -and $img.Height -eq 520) -or ($img.Width -eq 360 -and $img.Height -eq 540))) {throw "Invalid capture size: $path"}
    if([Math]::Abs(($img.Width/$img.Height)-([double]$shot[3]/$shot[4])) -gt .002){throw "Distorted capture rectangle: $path"}
    $g.DrawImage($img,[System.Drawing.Rectangle]::new($shot[1],$shot[2],$shot[3],$shot[4]))
   } finally {$img.Dispose()}
  }
  if($slide.Side) {
   $lines = if($locale -eq 'ja'){@('SPACE AGE','ARCADE / EDITORIAL','STEAMPUNK / ART DECO / NIXIE','','ポップアップ・自由配置・サイドパネル','繰り返せるCOUNTの取り消し','記録はローカル。アカウント不要。')}else{@('SPACE AGE','ARCADE / EDITORIAL','STEAMPUNK / ART DECO / NIXIE','','Popup, floating view or side panel','Repeatable COUNT undo','Local records. No account.')}
   $y=305
   foreach($line in $lines){$g.DrawString($line,$body,$light,[System.Drawing.RectangleF]::new(715,$y,510,50));$y+=47}
  }
  $footer=if($locale -eq 'ja'){'サンプル記録による実際の拡張画面。UIの操作ラベルは英語です。'}else{'Actual extension UI with sample records. No account or runtime downloads.'}
  $g.DrawString($footer,$tag,$dim,55,768)
  $suffix=if($locale -eq 'ja'){'-ja'}else{''}
  $target=Join-Path $out "screenshot-$($slide.Key)$suffix-1280x800.png"
  $bmp.Save($target,[System.Drawing.Imaging.ImageFormat]::Png)
  $heading.Dispose();$body.Dispose();$tag.Dispose();$light.Dispose();$dim.Dispose();$accent.Dispose();$g.Dispose();$bmp.Dispose()
  Write-Output $target
 }
}
