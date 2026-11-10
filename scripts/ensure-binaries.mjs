import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { execFileSync } from 'node:child_process';

const BIN_DIR = path.resolve('bin', 'win');

if (!fs.existsSync(BIN_DIR)) {
  fs.mkdirSync(BIN_DIR, { recursive: true });
}

const BINARY_SPECS = [
  {
    name: 'yt-dlp.exe',
    url: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
    versionArgs: ['--version'],
    minSize: 15 * 1024 * 1024 // ~23MB
  },
  {
    name: 'gallery-dl.exe',
    url: 'https://github.com/mikf/gallery-dl/releases/download/v1.31.10/gallery-dl.exe',
    versionArgs: ['--version'],
    minSize: 15 * 1024 * 1024 // ~22MB
  },
  {
    name: 'ffmpeg.exe',
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    isZip: true,
    zipSubpath: 'ffmpeg.exe',
    versionArgs: ['-version'],
    minSize: 50 * 1024 * 1024
  },
  {
    name: 'ffprobe.exe',
    url: 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip',
    isZip: true,
    zipSubpath: 'ffprobe.exe',
    versionArgs: ['-version'],
    minSize: 50 * 1024 * 1024
  },
  {
    name: 'aria2c.exe',
    url: 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip',
    isZip: true,
    zipSubpath: 'aria2c.exe',
    versionArgs: ['--version'],
    minSize: 3 * 1024 * 1024
  }
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Falha HTTP ${res.statusCode} ao baixar: ${url}`));
      }
      const stream = fs.createWriteStream(destPath);
      res.pipe(stream);
      stream.on('finish', () => resolve(destPath));
      stream.on('error', reject);
    }).on('error', reject);
  });
}

async function verifyOrDownload() {
  console.log('=====================================================');
  console.log('CRANKO DROP — VERIFICAÇÃO AUTOMÁTICA DE DEPENDÊNCIAS');
  console.log('=====================================================');

  for (const spec of BINARY_SPECS) {
    const targetFile = path.join(BIN_DIR, spec.name);
    let needsDownload = false;

    if (!fs.existsSync(targetFile)) {
      console.log(`[!] ${spec.name} ausente em bin/win/`);
      needsDownload = true;
    } else {
      const stat = fs.statSync(targetFile);
      if (stat.size < spec.minSize) {
        console.log(`[!] ${spec.name} tamanho inválido (${stat.size} bytes < ${spec.minSize} bytes)`);
        needsDownload = true;
      }
    }

    if (needsDownload) {
      console.log(`Baixando fonte oficial para ${spec.name}...`);
      if (spec.isZip) {
        const tempZip = path.join(BIN_DIR, `temp_${spec.name}.zip`);
        await downloadFile(spec.url, tempZip);
        // Extract using PowerShell Tar / Expand-Archive
        execFileSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -Path '${tempZip}' -DestinationPath '${BIN_DIR}\\temp_extract' -Force`]);
        // Find the executable
        const found = execFileSync('powershell', ['-NoProfile', '-Command', `Get-ChildItem -Path '${BIN_DIR}\\temp_extract' -Filter '${spec.zipSubpath}' -Recurse | Select-Object -First 1 -ExpandProperty FullName`], { encoding: 'utf-8' }).trim();
        if (found && fs.existsSync(found)) {
          fs.copyFileSync(found, targetFile);
        }
        // Cleanup temp
        try {
          fs.rmSync(path.join(BIN_DIR, 'temp_extract'), { recursive: true, force: true });
          fs.unlinkSync(tempZip);
        } catch {}
      } else {
        await downloadFile(spec.url, targetFile);
      }
    }

    // Verify execution
    try {
      const verOut = execFileSync(targetFile, spec.versionArgs, { encoding: 'utf-8', timeout: 5000 });
      const firstLine = verOut.split('\n')[0].trim();
      const sizeMb = (fs.statSync(targetFile).size / 1024 / 1024).toFixed(2);
      console.log(`✓ ${spec.name} (${sizeMb} MB) operacional: ${firstLine}`);
    } catch (err) {
      console.error(`✗ Erro ao executar ${spec.name}: ${err.message}`);
    }
  }

  console.log('=====================================================');
  console.log('Todos os binários foram verificados com sucesso!');
  console.log('=====================================================\n');
}

verifyOrDownload().catch(console.error);
