import { describe, it, expect } from 'vitest';
import { resolveLiveWebSocketUrl } from '../url-resolver.ts';

describe('BDD: Live WebSocket URL Resolution for GitHub Pages & Full-Stack', () => {
  describe('Given standard same-origin hosting (Cloud Run / Localhost Express)', () => {
    it('When host is localhost:3000 and protocol is http:, Then returns ws://localhost:3000/ws/live', () => {
      const url = resolveLiveWebSocketUrl({
        currentLocation: {
          protocol: 'http:',
          host: 'localhost:3000',
          hostname: 'localhost',
        },
      });
      expect(url).toBe('ws://localhost:3000/ws/live');
    });

    it('When host is https and same origin, Then returns wss://.../ws/live', () => {
      const url = resolveLiveWebSocketUrl({
        currentLocation: {
          protocol: 'https:',
          host: 'ais-dev-app.run.app',
          hostname: 'ais-dev-app.run.app',
        },
      });
      expect(url).toBe('wss://ais-dev-app.run.app/ws/live');
    });
  });

  describe('Given static GitHub Pages hosting (*.github.io)', () => {
    it('When running on username.github.io without custom URL, Then points to default Cloud Run backend wss URL', () => {
      const url = resolveLiveWebSocketUrl({
        currentLocation: {
          protocol: 'https:',
          host: 'username.github.io',
          hostname: 'username.github.io',
        },
        defaultRemoteServer: 'https://ais-dev-jqj6t5cy3u5mtbzjzyhuqm-707600859009.asia-east1.run.app',
      });
      expect(url).toBe('wss://ais-dev-jqj6t5cy3u5mtbzjzyhuqm-707600859009.asia-east1.run.app/ws/live');
    });

    it('When user specifies a custom server URL (https://my-backend.run.app), Then correctly formats to wss://my-backend.run.app/ws/live', () => {
      const url = resolveLiveWebSocketUrl({
        currentLocation: {
          protocol: 'https:',
          host: 'username.github.io',
          hostname: 'username.github.io',
        },
        customServerUrl: 'https://my-backend.run.app',
      });
      expect(url).toBe('wss://my-backend.run.app/ws/live');
    });

    it('When user specifies a direct wss URL (wss://my-backend.run.app/ws/live), Then preserves path without duplicating', () => {
      const url = resolveLiveWebSocketUrl({
        currentLocation: {
          protocol: 'https:',
          host: 'username.github.io',
          hostname: 'username.github.io',
        },
        customServerUrl: 'wss://my-backend.run.app/ws/live',
      });
      expect(url).toBe('wss://my-backend.run.app/ws/live');
    });
  });
});
