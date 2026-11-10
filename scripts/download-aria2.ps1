$zipUrl = "https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip"
$zipDest = "bin\win\aria2.zip"
Write-Host "Baixando aria2c portátil..."
curl.exe -sL $zipUrl -o $zipDest

if (Test-Path $zipDest) {
    Expand-Archive -Path $zipDest -DestinationPath "bin\win\aria2_tmp" -Force
    $exe = Get-ChildItem -Path "bin\win\aria2_tmp" -Filter "aria2c.exe" -Recurse | Select-Object -First 1
    if ($exe) {
        Move-Item $exe.FullName "bin\win\aria2c.exe" -Force
        Write-Host "aria2c.exe configurado com sucesso!"
    }
    Remove-Item -Recurse -Force "bin\win\aria2_tmp" -ErrorAction SilentlyContinue
    Remove-Item -Force $zipDest -ErrorAction SilentlyContinue
}

$ver = cmd /c "bin\win\aria2c.exe -v"
Write-Host "Versão do aria2c:"
$ver | Select-Object -First 1
