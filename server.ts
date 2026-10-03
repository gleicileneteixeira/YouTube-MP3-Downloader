import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

/**
 * Remove any leftover temporary files, partial downloads (.part, .ytdl),
 * and zero-byte or aborted files from downloads and temporary directories.
 */
function cleanupTemporaryArtifacts() {
  const dirsToClean = [
    path.join(process.cwd(), 'downloads'),
    '/tmp',
  ];

  for (const dir of dirsToClean) {
    try {
      if (!fs.existsSync(dir)) continue;
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (
          file.endsWith('.part') ||
          file.endsWith('.ytdl') ||
          file.endsWith('.crdownload') ||
          file.endsWith('.tmp') ||
          file.endsWith('.temp')
        ) {
          const filePath = path.join(dir, file);
          try {
            fs.unlinkSync(filePath);
            console.log(`[Cleanup] Arquivo temporário removido com sucesso: ${file}`);
          } catch {}
        }
      }
    } catch (err) {
      console.warn(`[Cleanup] Erro ao inspecionar diretório ${dir}:`, (err as Error).message);
    }
  }
}

/**
 * Clean and sanitize filenames on the server
 * Strips YouTube clutter, removes duplicate artist prefixes, and ensures clean extension.
 */
function cleanAudioFilenameServer(
  rawArtist: string = '',
  rawTitle: string = '',
  format: string = 'mp3'
): string {
  let artist = (rawArtist || '').trim();
  let title = (rawTitle || '').trim();

  if (!title) title = 'Audio';

  const noisePatterns = [
    /\s*[\(\[]\s*(official\s*(music\s*)?video|clipe\s*oficial|vídeo\s*oficial|video\s*oficial|áudio\s*oficial|audio\s*oficial|visualizer|lyric\s*video|letra|4k|hd|hq|remaster(ed)?|ao\s*vivo|live|oficial|inédito)\s*[\)\]]/gi,
    /\s*[\(\[]\s*(official\s*audio|faixa\s*oficial|completo|full\s*album|alta\s*qualidade)\s*[\)\]]/gi,
    /\s*\|\s*(clipe\s*oficial|áudio\s*oficial|vídeo\s*oficial|official\s*video).*$/gi,
    /\s*-\s*(clipe\s*oficial|áudio\s*oficial|vídeo\s*oficial|official\s*video).*$/gi,
  ];

  for (const pattern of noisePatterns) {
    title = title.replace(pattern, '').trim();
  }

  let cleanArtist = artist
    .replace(/^(fã\s*clube|fa\s*clube|canal\s*oficial\s*de|canal)\s+/i, '')
    .trim();

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
  if (
    (normArtist.length > 3 && normTitle.includes(normArtist)) ||
    (normRawArtist.length > 3 && normTitle.includes(normRawArtist)) ||
    !cleanArtist ||
    cleanArtist.toLowerCase() === 'youtube'
  ) {
    finalName = title;
  } else {
    finalName = `${cleanArtist} - ${title}`;
  }

  finalName = finalName
    .replace(/[\/\\?%*:|"<>~#&]/g, ' ')
    .replace(/\s*-\s*-\s*/g, ' - ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-]+|[\s\-]+$/g, '')
    .trim();

  if (!finalName) finalName = 'Audio';
  finalName = finalName.replace(/\.(mp3|m4a|wav|flac|part|ytdl|webm|ogg)$/i, '');

  const ext = format.toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp3';
  return `${finalName}.${ext}`;
}

// Helper to extract YouTube video ID
function extractVideoId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();

  // If already 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Standard or shortened YouTube URLs
  const patterns = [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|music\.youtube\.com\/watch\?v=)([^"&?\/\s]{11})/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

// Format duration helper
function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hrs > 0) {
    return `${hrs}:${remMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Video info endpoint via oEmbed and direct metadata
app.get('/api/info', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL do YouTube é obrigatória' });
    }

    const videoId = extractVideoId(rawUrl);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Link do YouTube inválido ou não reconhecido' });
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(standardUrl)}&format=json`;

    let title = 'Áudio do YouTube';
    let author = 'YouTube';
    let authorUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let hqThumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    try {
      const response = await fetch(oembedUrl, { signal: AbortSignal.timeout(6000) });
      if (response.ok) {
        const data = await response.json();
        title = data.title || title;
        author = data.author_name || author;
        authorUrl = data.author_url || authorUrl;
        if (data.thumbnail_url) {
          thumbnailUrl = data.thumbnail_url;
        }
      }
    } catch (err) {
      console.warn('oEmbed fetch fallback:', (err as Error).message);
    }

    return res.json({
      success: true,
      metadata: {
        id: videoId,
        url: standardUrl,
        title,
        author,
        authorUrl,
        thumbnailUrl,
        hqThumbnailUrl,
      },
    });
  } catch (error) {
    console.error('Error fetching video info:', error);
    return res.status(500).json({
      success: false,
      error: 'Não foi possível obter informações do vídeo. Verifique o link e tente novamente.',
    });
  }
});

// Conversion initiation endpoint
app.post('/api/convert', async (req, res) => {
  try {
    const { url, format = 'mp3' } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'URL é obrigatória' });
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      return res.status(400).json({ success: false, error: 'Link do YouTube inválido' });
    }

    const standardUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const validFormats = ['mp3', 'm4a', 'wav', 'flac'];
    const chosenFormat = validFormats.includes(format) ? format : 'mp3';

    // Primary and secondary endpoints
    const endpoints = [
      `https://loader.to/ajax/download.php?format=${chosenFormat}&url=${encodeURIComponent(standardUrl)}`,
      `https://p.savenow.to/ajax/download.php?format=${chosenFormat}&url=${encodeURIComponent(standardUrl)}`,
    ];

    let initData: any = null;
    let usedEndpoint = '';

    for (const ep of endpoints) {
      try {
        const response = await fetch(ep, {
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data.id || data.success) {
            initData = data;
            usedEndpoint = ep;
            break;
          }
        }
      } catch (e) {
        console.warn('Endpoint failed:', ep, (e as Error).message);
      }
    }

    if (!initData || !initData.id) {
      return res.status(502).json({
        success: false,
        error: 'Serviço de conversão temporariamente indisponível. Tente novamente em instantes.',
      });
    }

    const progressUrl = initData.progress_url || `https://lto2.affadaffa.com/api/progress.php?id=${initData.id}`;

    return res.json({
      success: true,
      jobId: initData.id,
      progressUrl,
      title: initData.title || initData.info?.title || 'Áudio YouTube',
      thumbnailUrl: initData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      format: chosenFormat,
    });
  } catch (error) {
    console.error('Error in /api/convert:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao iniciar conversão.',
    });
  }
});

// Progress polling endpoint
app.get('/api/progress', async (req, res) => {
  try {
    const id = req.query.id as string;
    const customProgressUrl = req.query.progressUrl as string;

    if (!id) {
      return res.status(400).json({ success: false, error: 'ID da conversão é obrigatório' });
    }

    const pollUrls = [
      customProgressUrl,
      `https://lto2.affadaffa.com/api/progress?id=${id}`,
      `https://lto2.affadaffa.com/api/progress.php?id=${id}`,
      `https://p.savenow.to/api/progress?id=${id}`,
    ].filter(Boolean) as string[];

    let pollData: any = null;

    for (const pUrl of pollUrls) {
      try {
        const response = await fetch(pUrl, {
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          },
        });
        if (response.ok) {
          const text = await response.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed && (parsed.success !== undefined || parsed.progress !== undefined || parsed.download_url)) {
              pollData = parsed;
              break;
            }
          } catch {
            // response was not json
          }
        }
      } catch {
        // try next
      }
    }

    if (!pollData) {
      return res.json({
        success: true,
        status: 'converting',
        progress: 45,
        text: 'Extraindo e codificando áudio...',
      });
    }

    // Success check
    const rawDownloadUrl = typeof pollData.download_url === 'string' ? pollData.download_url.replace(/\\\//g, '/') : '';
    const isFinished = pollData.success === 1 || pollData.success === true || rawDownloadUrl.length > 5;
    const progressRaw = Number(pollData.progress) || 0;

    // Check for error in pollData
    if (pollData.success === -1 || (pollData.text && /error|failed|bot|blocked/i.test(pollData.text))) {
      return res.json({
        success: false,
        status: 'error',
        progress: 0,
        error: pollData.text || 'O servidor de conversão encontrou um erro com este vídeo.',
        text: pollData.text || 'Erro no processamento',
      });
    }

    if (isFinished && rawDownloadUrl) {
      return res.json({
        success: true,
        status: 'ready',
        progress: 100,
        downloadUrl: rawDownloadUrl,
        title: pollData.title || pollData.info?.title || '',
        text: 'Áudio pronto para download!',
      });
    }

    // Calculate realistic normalized progress (20 to 92 max while converting)
    let progressPercent = 30;
    if (progressRaw > 100) {
      progressPercent = Math.min(92, Math.round(progressRaw / 11));
    } else if (progressRaw > 0) {
      progressPercent = Math.min(90, Math.round(progressRaw * 0.7 + 25));
    }

    return res.json({
      success: true,
      status: 'converting',
      progress: Math.max(25, progressPercent),
      text: pollData.text || 'Codificando faixas de áudio MP3...',
    });
  } catch (error) {
    console.error('Error polling progress:', error);
    return res.json({
      success: true,
      status: 'converting',
      progress: 50,
      text: 'Processando faixas...',
    });
  }
});

// Endpoint to manually or automatically trigger cleanup of temporary files
app.post('/api/cleanup', (req, res) => {
  try {
    cleanupTemporaryArtifacts();
    return res.json({ success: true, message: 'Arquivos temporários e incompletos limpos com sucesso.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Proxy download with optional FFmpeg trimming & bitrate adjustment
app.get('/api/download-proxy', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    const filenameParam = (req.query.filename as string) || '';
    const bitrate = (req.query.bitrate as string) || '320k';
    const trim = req.query.trim === 'true';
    const trimStart = (req.query.trimStart as string) || '00:00';
    const trimEnd = (req.query.trimEnd as string) || '';
    const customTitle = (req.query.title as string) || '';
    const customArtist = (req.query.artist as string) || '';
    const customAlbum = (req.query.album as string) || 'YouTube MP3';
    const format = (req.query.format as string) || 'mp3';

    if (!rawUrl) {
      return res.status(400).json({ success: false, error: 'URL de download não fornecida' });
    }

    // Generate pristine, deduplicated filename
    const cleanFinalName = cleanAudioFilenameServer(customArtist, customTitle || filenameParam, format);

    const safeAsciiFilename = cleanFinalName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || `audio.${format}`;

    const safeFilenameUtf8 = cleanFinalName
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || `audio.${format}`;

    // Only pipe through ffmpeg if trimming is explicitly enabled
    if (trim) {
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilenameUtf8)}`
      );
      res.setHeader('Content-Type', 'audio/mpeg');

      const ffmpegArgs: string[] = ['-hide_banner', '-loglevel', 'error'];

      if (trimStart) {
        ffmpegArgs.push('-ss', trimStart);
      }

      ffmpegArgs.push('-i', rawUrl);

      if (trimEnd) {
        ffmpegArgs.push('-to', trimEnd);
      }

      ffmpegArgs.push('-vn', '-b:a', bitrate);

      if (customTitle) {
        ffmpegArgs.push('-metadata', `title=${customTitle}`);
      }
      if (customArtist) {
        ffmpegArgs.push('-metadata', `artist=${customArtist}`);
      }
      if (customAlbum) {
        ffmpegArgs.push('-metadata', `album=${customAlbum}`);
      }

      ffmpegArgs.push('-f', 'mp3', 'pipe:1');

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      ffmpegProcess.stdout.pipe(res);

      ffmpegProcess.stderr.on('data', (d) => {
        console.warn('ffmpeg stderr:', d.toString());
      });

      ffmpegProcess.on('error', (err) => {
        console.error('ffmpeg process error:', err);
        if (!res.headersSent) {
          res.redirect(rawUrl);
        }
        cleanupTemporaryArtifacts();
      });

      res.on('close', () => {
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch {}
        cleanupTemporaryArtifacts();
      });

      ffmpegProcess.on('close', () => {
        cleanupTemporaryArtifacts();
      });

      return;
    }

    // Direct streaming for fast downloads with strict anti-corruption validation
    try {
      const fileResponse = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'audio/*, application/octet-stream, */*',
        },
      });

      if (!fileResponse.ok) {
        return res.status(502).json({
          success: false,
          error: `Servidor de origem retornou status HTTP ${fileResponse.status}.`,
        });
      }

      const contentType = (fileResponse.headers.get('content-type') || '').toLowerCase();
      
      // Critical check: if remote server returned an HTML error/protection page, DO NOT STREAM AS MP3!
      // This prevents the small 11 KB corrupted file issue.
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        console.warn('[Proxy] Servidor remoto retornou HTML/JSON em vez de áudio.');
        return res.status(502).json({
          success: false,
          error: 'O servidor remoto de conversão retornou uma página de verificação ou erro. O download corrompido foi bloqueado com sucesso.',
        });
      }

      const contentLength = fileResponse.headers.get('content-length');
      const numLength = contentLength ? parseInt(contentLength, 10) : 0;

      // If payload is suspiciously tiny (< 25 KB), read first chunk to ensure it's not a disguised error page
      if (numLength > 0 && numLength < 25000) {
        const buffer = await fileResponse.arrayBuffer();
        const sample = Buffer.from(buffer.slice(0, 500)).toString('utf-8');
        if (sample.includes('<html') || sample.includes('<!DOCTYPE') || sample.includes('error')) {
          console.warn('[Proxy] Arquivo incompleto ou página de erro detectada nos primeiros bytes.');
          return res.status(502).json({
            success: false,
            error: 'Arquivo de áudio incompleto retornado pelo servidor remoto. O download foi cancelado para evitar arquivos defeituosos.',
          });
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilenameUtf8)}`
        );
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', buffer.byteLength);
        res.send(Buffer.from(buffer));
        cleanupTemporaryArtifacts();
        return;
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilenameUtf8)}`
      );
      res.setHeader('Content-Type', 'audio/mpeg');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (fileResponse.body) {
        const reader = fileResponse.body.getReader();
        let isAborted = false;

        res.on('close', () => {
          isAborted = true;
          try {
            reader.cancel();
          } catch {}
          cleanupTemporaryArtifacts();
        });

        while (!isAborted) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
        cleanupTemporaryArtifacts();
      } else {
        res.status(502).json({ success: false, error: 'Fluxo de dados de áudio vazio.' });
      }
    } catch (e: any) {
      console.warn('Direct stream error:', e.message);
      if (!res.headersSent) {
        res.status(502).json({ success: false, error: 'Erro ao conectar ao servidor de áudio.' });
      }
      cleanupTemporaryArtifacts();
    }
  } catch (error) {
    console.error('Download proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Erro ao processar download do áudio' });
    }
    cleanupTemporaryArtifacts();
  }
});

// Vite integration
async function start() {
  // Clean any residual files on server boot
  cleanupTemporaryArtifacts();

  // Periodic cleanup every 10 minutes
  setInterval(cleanupTemporaryArtifacts, 10 * 60 * 1000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`YouTube MP3 Downloader Server running on http://localhost:${PORT}`);
  });
}

start();
