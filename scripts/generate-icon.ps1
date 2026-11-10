Add-Type -AssemblyName System.Drawing

if (!(Test-Path "build")) {
    New-Item -ItemType Directory -Path "build" -Force | Out-Null
}

$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background dark purple
$p1 = New-Object System.Drawing.Point 0, 0
$p2 = New-Object System.Drawing.Point 256, 256
$c1 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)
$c2 = [System.Drawing.Color]::FromArgb(255, 6, 182, 212)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $p1, $p2, $c1, $c2
$g.FillEllipse($brush, 16, 16, 224, 224)

# Inner circle dark
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 14, 11, 28))
$g.FillEllipse($darkBrush, 36, 36, 184, 184)

# Draw download arrow
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 192, 132, 252)), 16
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

# Vertical line
$g.DrawLine($pen, 128, 70, 128, 155)
# Arrow head
$g.DrawLine($pen, 90, 125, 128, 160)
$g.DrawLine($pen, 166, 125, 128, 160)

# Bottom tray
$trayPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 6, 182, 212)), 14
$trayPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$trayPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawLine($trayPen, 80, 185, 176, 185)

$bmp.Save("build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

$hIcon = $bmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::OpenWrite("build/icon.ico")
$icon.Save($fs)
$fs.Close()

$g.Dispose()
$bmp.Dispose()
Write-Host "Icons generated successfully in build/"
