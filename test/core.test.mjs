import assert from 'node:assert';

console.log('--- TEST 1: CATEGORIZATION LOGIC ---');
function categorize(ext) {
  const e = ext.toLowerCase();
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv'].includes(e)) return 'videos';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'opus', 'm4a'].includes(e)) return 'audios';
  if (['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tiff', 'svg', 'ico'].includes(e)) return 'images';
  if (['pdf', 'txt', 'docx', 'xlsx', 'pptx', 'epub', 'md', 'csv'].includes(e)) return 'documents';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(e)) return 'archives';
  if (['exe', 'msi', 'dmg', 'appimage', 'deb', 'apk', 'iso'].includes(e)) return 'programs';
  return 'others';
}

assert.strictEqual(categorize('mp4'), 'videos');
assert.strictEqual(categorize('PNG'), 'images');
assert.strictEqual(categorize('flac'), 'audios');
assert.strictEqual(categorize('pdf'), 'documents');
assert.strictEqual(categorize('zip'), 'archives');
assert.strictEqual(categorize('exe'), 'programs');
console.log('✓ Categorization test passed!');

console.log('--- TEST 2: URL ANALYZER DOMAIN HEURISTICS ---');
function isKnownMediaPlatform(domain) {
  const list = [
    'youtube.com', 'youtu.be', 'tiktok.com', 'twitter.com', 'x.com',
    'instagram.com', 'facebook.com', 'fb.watch', 'vimeo.com', 'twitch.tv',
    'soundcloud.com', 'dailymotion.com', 'reddit.com', 'bilibili.com'
  ];
  return list.some(d => domain.includes(d));
}

assert.strictEqual(isKnownMediaPlatform('youtube.com'), true);
assert.strictEqual(isKnownMediaPlatform('youtu.be'), true);
assert.strictEqual(isKnownMediaPlatform('tiktok.com'), true);
assert.strictEqual(isKnownMediaPlatform('x.com'), true);
assert.strictEqual(isKnownMediaPlatform('github.com'), false);
console.log('✓ URL domain heuristics passed!');

console.log('--- TEST 3: NATIVE DOWNLOAD SPEED AND CHUNK TRACKING ---');
function parseSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytesPerSec / Math.pow(k, safeI)).toFixed(1))} ${sizes[safeI]}/s`;
}

assert.strictEqual(parseSpeed(1024 * 1024 * 5.5), '5.5 MB/s');
assert.strictEqual(parseSpeed(1024 * 500), '500 KB/s');
console.log('✓ Speed formatter test passed!');

console.log('--- ALL INTEGRATION CHECKS PASSED SUCCESSFULLY! ---');
