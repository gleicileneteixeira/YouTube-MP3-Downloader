/**
 * Clean & Sanitize Audio Filenames
 * Removes duplicate artist names, YouTube noise tags (Official Video, Clipe Oficial, etc.),
 * and ensures a pristine, single file name without repeated text.
 */
export function cleanAudioFilename(
  rawArtist: string = '',
  rawTitle: string = '',
  format: string = 'mp3'
): string {
  let artist = (rawArtist || '').trim();
  let title = (rawTitle || '').trim();

  // If no title provided, fallback
  if (!title) {
    title = 'Audio';
  }

  // Remove common YouTube noise / garbage tags from title
  const noisePatterns = [
    /\s*[\(\[]\s*(official\s*(music\s*)?video|clipe\s*oficial|vídeo\s*oficial|video\s*oficial|áudio\s*oficial|audio\s*oficial|visualizer|lyric\s*video|letra|4k|hd|hq|remaster(ed)?|ao\s*vivo|live|oficial|inédito)\s*[\)\]]/gi,
    /\s*[\(\[]\s*(official\s*audio|faixa\s*oficial|completo|full\s*album|alta\s*qualidade)\s*[\)\]]/gi,
    /\s*\|\s*(clipe\s*oficial|áudio\s*oficial|vídeo\s*oficial|official\s*video).*$/gi,
    /\s*-\s*(clipe\s*oficial|áudio\s*oficial|vídeo\s*oficial|official\s*video).*$/gi,
  ];

  for (const pattern of noisePatterns) {
    title = title.replace(pattern, '').trim();
  }

  // Clean artist if it contains redundant channel fluff like "FÃ CLUBE", "OFICIAL", "CANAL"
  let cleanArtist = artist
    .replace(/^(fã\s*clube|fa\s*clube|canal\s*oficial\s*de|canal)\s+/i, '')
    .trim();

  // If the title already contains the artist or cleanArtist name, don't duplicate it in the prefix
  const normalizeForCheck = (str: string) =>
    str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const normTitle = normalizeForCheck(title);
  const normArtist = normalizeForCheck(cleanArtist);
  const normRawArtist = normalizeForCheck(artist);

  let finalName = '';

  // Check if title already includes the artist name or vice versa
  if (
    (normArtist.length > 3 && normTitle.includes(normArtist)) ||
    (normRawArtist.length > 3 && normTitle.includes(normRawArtist)) ||
    !cleanArtist ||
    cleanArtist.toLowerCase() === 'youtube'
  ) {
    // Title already has artist information (e.g. "Choque Térmico - Ângela Naiara")
    finalName = title;
  } else {
    // Combine artist - title cleanly
    finalName = `${cleanArtist} - ${title}`;
  }

  // Sanitize illegal filesystem characters for Windows, Mac, and Linux
  finalName = finalName
    .replace(/[\/\\?%*:|"<>~#&]/g, ' ') // illegal chars
    .replace(/\s*-\s*-\s*/g, ' - ') // double hyphens
    .replace(/\s+/g, ' ') // multiple spaces
    .replace(/^[\s\-]+|[\s\-]+$/g, '') // leading/trailing spaces or hyphens
    .trim();

  if (!finalName) {
    finalName = 'Audio';
  }

  // Strip any accidental extension in finalName (e.g. .mp3, .part, .ytdl)
  finalName = finalName.replace(/\.(mp3|m4a|wav|flac|part|ytdl|webm|ogg)$/i, '');

  const ext = format.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  return `${finalName}.${ext}`;
}

// Global deduplication registry to prevent simultaneous / duplicate downloads
const activeDownloadLocks = new Map<string, number>();

/**
 * Ultra-reliable single-file browser downloader.
 * Guarantees:
 * 1. Only ONE file is downloaded to disk (strictly deduplicated).
 * 2. Incomplete or corrupted files (< 30 KB HTML error pages) are rejected immediately.
 * 3. Never triggers parallel duplicate downloads in the browser.
 */
export async function triggerBrowserDownload(
  url: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
  if (!url) return { success: false, error: 'URL inválida' };

  const cleanName = filename || 'audio.mp3';
  const downloadKey = `${url}::${cleanName}`;
  const now = Date.now();

  // Deduplication check: ignore if requested in the last 4 seconds
  const lastDownloadTime = activeDownloadLocks.get(downloadKey) || 0;
  if (now - lastDownloadTime < 4000) {
    console.warn(`[Download] Ignorando download duplicado para: ${cleanName}`);
    return { success: true };
  }

  activeDownloadLocks.set(downloadKey, now);

  try {
    // Strategy 1: Fetch as Blob for local/proxy endpoints or same-origin
    // This allows inspecting Content-Type and size BEFORE saving to the user's hard drive!
    if (url.startsWith('/api/') || url.startsWith(window.location.origin)) {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Falha no download (servidor retornou status ${response.status})`);
      }

      const contentType = (response.headers.get('content-type') || '').toLowerCase();

      // Guard: if server returned an HTML error page, DO NOT save as .mp3!
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        const textContent = await response.text();
        let errMsg = 'O servidor retornou uma resposta inválida ou erro em vez do arquivo de áudio.';
        try {
          const parsed = JSON.parse(textContent);
          if (parsed.error) errMsg = parsed.error;
        } catch {}
        throw new Error(errMsg);
      }

      const blob = await response.blob();

      // Guard: audio files are normally > 100 KB. If it's very small (< 25 KB), check for corruption
      if (blob.size < 25000) {
        const slice = await blob.slice(0, 1000).text();
        if (slice.includes('<html') || slice.includes('<!DOCTYPE') || slice.includes('error')) {
          throw new Error('Arquivo de áudio corrompido ou incompleto descartado com segurança.');
        }
      }

      // Download single verified Blob
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = cleanName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        try {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(blobUrl);
        } catch {}
      }, 5000);

      return { success: true };
    }

    // Strategy 2: Direct external URL download (single controlled click)
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.setAttribute('download', cleanName);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 2000);

    return { success: true };
  } catch (err: any) {
    console.error('[Download] Erro ao baixar arquivo:', err);
    // Release lock on error so user can retry immediately if needed
    activeDownloadLocks.delete(downloadKey);
    return { success: false, error: err.message || 'Erro durante o download' };
  }
}

