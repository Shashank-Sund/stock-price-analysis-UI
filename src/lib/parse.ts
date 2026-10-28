/**
 * Parses the analysis API response body. The backend returns an HTML document whose
 * <body> holds matplotlib charts as base64 PNG <img> tags, or an error marker.
 *
 * Server HTML is never injected into the page: we parse it with DOMParser (which does
 * not execute scripts) and copy out only the data we trust.
 */

export interface Chart {
  title: string;
  src: string;
}

export type ParsedResponse = { kind: 'charts'; charts: Chart[] } | { kind: 'error'; message: string };

const PNG_PREFIX = 'data:image/png;base64,';
const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export const NO_CHARTS_MESSAGE =
  'The analysis service responded, but the response did not contain any charts.';

function isSafePngDataUrl(src: string): boolean {
  if (!src.startsWith(PNG_PREFIX)) return false;
  const payload = src.slice(PNG_PREFIX.length).replace(/\s+/g, '');
  return payload.length > 0 && BASE64_RE.test(payload);
}

/** Extracts a message from the JSON error shapes we know about, or null. */
export function messageFromJson(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.errorMessage === 'string' && obj.errorMessage.trim()) {
    const type = typeof obj.errorType === 'string' && obj.errorType.trim() ? ` (${obj.errorType.trim()})` : '';
    return `The analysis service failed: ${obj.errorMessage.trim()}${type}`;
  }
  // API Gateway errors, e.g. {"message": "Endpoint request timed out"}.
  if (typeof obj.message === 'string' && obj.message.trim()) {
    return `The analysis service returned an error: ${obj.message.trim()}`;
  }
  return null;
}

export function parseAnalysisResponse(body: string): ParsedResponse {
  const text = (body ?? '').trim();
  if (!text) return { kind: 'error', message: NO_CHARTS_MESSAGE };

  if (text.startsWith('{')) {
    try {
      const json: unknown = JSON.parse(text);
      // A proxy-style envelope that was not unwrapped: {"statusCode":200,"body":"<html>..."}.
      if (json && typeof json === 'object' && typeof (json as { body?: unknown }).body === 'string') {
        return parseAnalysisResponse((json as { body: string }).body);
      }
      const message = messageFromJson(json);
      if (message) return { kind: 'error', message };
      return { kind: 'error', message: NO_CHARTS_MESSAGE };
    } catch {
      // Not JSON after all; fall through to HTML parsing.
    }
  }

  const doc = new DOMParser().parseFromString(text, 'text/html');

  const errorEl = doc.querySelector('.eda-error');
  if (errorEl) {
    const message = (errorEl.textContent ?? '').replace(/\s+/g, ' ').trim();
    return { kind: 'error', message: message || 'The analysis service reported an error.' };
  }

  const charts: Chart[] = [];
  doc.querySelectorAll('img').forEach((img) => {
    const src = (img.getAttribute('src') ?? '').trim();
    if (!isSafePngDataUrl(src)) return;
    const alt = (img.getAttribute('alt') ?? '').replace(/\s+/g, ' ').trim();
    charts.push({ title: alt || `Chart ${charts.length + 1}`, src: src.replace(/\s+/g, '') });
  });

  if (charts.length === 0) return { kind: 'error', message: NO_CHARTS_MESSAGE };
  return { kind: 'charts', charts };
}
