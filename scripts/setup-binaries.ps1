$winBinDir = "bin\win"
if (!(Test-Path $winBinDir)) {
    New-Item -ItemType Directory -Path $winBinDir -Force | Out-Null
}

Write-Host "Baixando yt-dlp portátil oficial..."
$ytDlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
$ytDlpPath = Join-Path $winBinDir "yt-dlp.exe"
if (!(Test-Path $ytDlpPath)) {
    Invoke-WebRequest -Uri $ytDlpUrl -OutFile $ytDlpPath -UseBasicParsing
    Write-Host "yt-dlp.exe baixado com sucesso!"
} else {
    Write-Host "yt-dlp.exe já presente."
}

Write-Host "Baixando gallery-dl portátil oficial..."
$galleryUrl = "https://github.com/mikf/gallery-dl/releases/latest/download/gallery-dl.exe"
$galleryPath = Join-Path $winBinDir "gallery-dl.exe"
if (!(Test-Path $galleryPath)) {
    Invoke-WebRequest -Uri $galleryUrl -OutFile $galleryPath -UseBasicParsing
    Write-Host "gallery-dl.exe baixado com sucesso!"
} else {
    Write-Host "gallery-dl.exe já presente."
}

Write-Host "Concluído o setup dos binários portáteis em $winBinDir"
