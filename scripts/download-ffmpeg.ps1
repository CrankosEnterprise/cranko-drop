$ffmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$zipPath = "bin\win\ffmpeg_essentials.zip"

Write-Host "Baixando FFmpeg Essentials..."
curl.exe -sL $ffmpegUrl -o $zipPath

if (Test-Path $zipPath) {
    Write-Host "Extraindo ffmpeg.exe e ffprobe.exe..."
    # Use 7za from node_modules/7zip-bin if available, or Expand-Archive
    $7z = "node_modules\7zip-bin\win\x64\7za.exe"
    if (Test-Path $7z) {
        & $7z e $zipPath "*/bin/ffmpeg.exe" "*/bin/ffprobe.exe" -o"bin\win" -y
    } else {
        Expand-Archive -Path $zipPath -DestinationPath "bin\win\ffmpeg_tmp" -Force
        $f1 = Get-ChildItem -Path "bin\win\ffmpeg_tmp" -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
        $f2 = Get-ChildItem -Path "bin\win\ffmpeg_tmp" -Filter "ffprobe.exe" -Recurse | Select-Object -First 1
        if ($f1) { Move-Item $f1.FullName "bin\win\ffmpeg.exe" -Force }
        if ($f2) { Move-Item $f2.FullName "bin\win\ffprobe.exe" -Force }
        Remove-Item -Recurse -Force "bin\win\ffmpeg_tmp" -ErrorAction SilentlyContinue
    }
    Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
}

Write-Host "Verificando FFmpeg instalado:"
& "bin\win\ffmpeg.exe" -version | Select-Object -First 1
& "bin\win\ffprobe.exe" -version | Select-Object -First 1
