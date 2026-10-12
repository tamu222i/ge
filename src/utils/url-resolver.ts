/**
 * Resolves the WebSocket URL for Gemini Live API
 * Handles same-origin full-stack deployments (Express/Cloud Run)
 * as well as static GitHub Pages deployments (*.github.io).
 */

export interface LocationInfo {
  protocol: string;
  host: string;
  hostname: string;
}

export interface ResolveLiveWebSocketUrlOptions {
  currentLocation?: LocationInfo;
  customServerUrl?: string;
  defaultRemoteServer?: string;
}

const DEFAULT_CLOUD_RUN_SERVER =
  'https://ais-dev-jqj6t5cy3u5mtbzjzyhuqm-707600859009.asia-east1.run.app';

export function normalizeToWsUrl(inputUrl: string): string {
  let url = inputUrl.trim();

  // If http(s) -> convert to ws(s)
  if (url.startsWith('https://')) {
    url = 'wss://' + url.slice('https://'.length);
  } else if (url.startsWith('http://')) {
    url = 'ws://' + url.slice('http://'.length);
  } else if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    // If no protocol specified, assume wss
    url = 'wss://' + url;
  }

  // Ensure path ends with /ws/live
  const urlObj = new URL(url);
  if (!urlObj.pathname || urlObj.pathname === '/') {
    urlObj.pathname = '/ws/live';
  }

  return urlObj.toString();
}

export function resolveLiveWebSocketUrl(options?: ResolveLiveWebSocketUrlOptions): string {
  const loc: LocationInfo = options?.currentLocation ?? (typeof window !== 'undefined'
    ? {
        protocol: window.location.protocol,
        host: window.location.host,
        hostname: window.location.hostname,
      }
    : {
        protocol: 'https:',
        host: 'localhost:3000',
        hostname: 'localhost',
      });

  // 1. Explicit user-configured server URL
  if (options?.customServerUrl && options.customServerUrl.trim()) {
    return normalizeToWsUrl(options.customServerUrl);
  }

  // 2. Check if running on GitHub Pages or external static domain
  const isGitHubPages = loc.hostname.endsWith('github.io');
  if (isGitHubPages) {
    const remote = options?.defaultRemoteServer || DEFAULT_CLOUD_RUN_SERVER;
    return normalizeToWsUrl(remote);
  }

  // 3. Fallback: Same-origin WebSocket endpoint
  const wsProtocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${loc.host}/ws/live`;
}
