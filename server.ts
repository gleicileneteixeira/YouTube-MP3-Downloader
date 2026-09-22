import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json());

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

// Proxy download with optional FFmpeg trimming & bitrate adjustment
app.get('/api/download-proxy', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    const filenameParam = (req.query.filename as string) || 'audio.mp3';
    const bitrate = (req.query.bitrate as string) || '320k';
    const trim = req.query.trim === 'true';
    const trimStart = (req.query.trimStart as string) || '00:00';
    const trimEnd = (req.query.trimEnd as string) || '';
    const customTitle = (req.query.title as string) || '';
    const customArtist = (req.query.artist as string) || '';
    const customAlbum = (req.query.album as string) || 'YouTube MP3';

    if (!rawUrl) {
      return res.status(400).send('URL de download não fornecida');
    }

    // Sanitize filename
    const safeAsciiFilename = filenameParam
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/[^\x20-\x7E]/g, '')
      .replace(/\s+/g, ' ')
      .trim() || 'audio.mp3';

    const safeFilenameUtf8 = filenameParam
      .replace(/[\/\\?%*:|"<>]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'audio.mp3';

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
      });

      res.on('close', () => {
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch {}
      });

      return;
    }

    // Direct streaming for fast downloads
    try {
      const fileResponse = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        },
      });

      if (!fileResponse.ok) {
        return res.redirect(rawUrl);
      }

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeAsciiFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilenameUtf8)}`
      );
      res.setHeader('Content-Type', fileResponse.headers.get('content-type') || 'audio/mpeg');
      const contentLength = fileResponse.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      if (fileResponse.body) {
        // Stream directly
        const reader = fileResponse.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      } else {
        res.redirect(rawUrl);
      }
    } catch (e) {
      console.warn('Direct stream error, redirecting:', (e as Error).message);
      res.redirect(rawUrl);
    }
  } catch (error) {
    console.error('Download proxy error:', error);
    if (!res.headersSent) {
      res.status(500).send('Erro ao processar download do áudio');
    }
  }
});

// Vite integration
async function start() {
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
