export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'chart'
  );
}

export function chartFilename(tickers: string[], title: string): string {
  const prefix = tickers.map((t) => t.replace(/[^A-Za-z0-9.^=-]/g, '')).filter(Boolean).join('-') || 'chart';
  return `${prefix}_${slugify(title)}.png`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',', 2);
  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/png';
  const bin = atob(payload);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const url = URL.createObjectURL(dataUrlToBlob(dataUrl));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
