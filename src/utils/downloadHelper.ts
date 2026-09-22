/**
 * Ultra-reliable browser & device downloader
 * Handles desktop, iOS, Android, iframe sandbox contexts, and synthetic events.
 */
export async function triggerBrowserDownload(url: string, filename: string) {
  if (!url) return;

  // Strategy 1: If it's a relative URL or same-origin /api/download-proxy, fetch blob and save with objectURL
  // This bypasses iframe sandbox restrictions and mobile browser redirects completely!
  if (url.startsWith('/api/') || url.startsWith(window.location.origin)) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = blobUrl;
        a.download = filename || 'audio.mp3';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          try {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
          } catch {}
        }, 3000);
        return;
      }
    } catch (e) {
      console.warn('Blob fetch failed, falling back to direct navigation/anchor:', e);
    }
  }

  // Strategy 2: Standard anchor click with download attribute
  try {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.setAttribute('download', filename || 'audio.mp3');
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      try {
        document.body.removeChild(a);
      } catch {}
    }, 1500);
    return;
  } catch (err) {
    console.warn('Anchor click error:', err);
  }

  // Strategy 3: Direct window location fallback
  try {
    window.location.href = url;
  } catch (err) {
    console.error('All download methods failed:', err);
  }
}
