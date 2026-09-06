import Foundation

enum BridgeScript {
    static let source = #"""
    (() => {
      if (window.__ECHOTYPE_IOS_BRIDGE_INSTALLED__) return;
      window.__ECHOTYPE_IOS_BRIDGE_INSTALLED__ = true;

      const bridge = window.webkit?.messageHandlers?.echoTypeBridge;
      if (!bridge) return;

      // The native shell owns the single iOS AI entry point. Hide stale or
      // cached Web header actions until the Web bundle is refreshed.
      const hideInlineChatActions = () => {
        if (document.getElementById('echotype-ios-chat-style')) return;
        const style = document.createElement('style');
        style.id = 'echotype-ios-chat-style';
        style.textContent = `
          button[aria-label="Open AI chat"] { display: none !important; }
          main[data-native-host="ios"] > div.relative {
            padding-top: calc(env(safe-area-inset-top, 0px) + 3.5rem) !important;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      };
      hideInlineChatActions();

      const post = (type, payload = {}) => bridge.postMessage({ type, payload });

      const normalizeQAState = (payload) => {
        if (!payload || typeof payload !== 'object') return {};
        return payload;
      };

      const notifyQAState = (payload) => {
        post('qaState', normalizeQAState(payload));
      };

      const syncRouteMetadataFromPage = () => {
        post('routeChanged', {
          href: window.location.href,
          title: resolveNativeTitle()
        });
      };

      const resolveNativeTitle = () => {
        const selectors = [
          '[data-native-title]',
          '[data-page-title]',
          'main h1',
          '[role="main"] h1',
          'main h2',
          '[role="main"] h2',
          'h1',
          'h2'
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          const text = element?.textContent?.replace(/\s+/g, ' ').trim();
          if (text) return text;
        }

        return document.title || '';
      };

      const syncQAStateFromPage = () => {
        if (window.__ECHOTYPE_LAST_QA_STATE__ && typeof window.__ECHOTYPE_LAST_QA_STATE__ === 'object') {
          notifyQAState(window.__ECHOTYPE_LAST_QA_STATE__);
          return;
        }

        const serialized = document.documentElement?.dataset?.nativeQaState;
        if (!serialized) return;

        const payload = serialized.split(';').reduce((acc, entry) => {
          const separatorIndex = entry.indexOf('=');
          if (separatorIndex <= 0) return acc;
          const key = entry.slice(0, separatorIndex);
          const value = entry.slice(separatorIndex + 1);
          acc[key] = value;
          return acc;
        }, {});
        notifyQAState(payload);
      };

      const notifyRouteChange = () => {
        syncRouteMetadataFromPage();
        window.setTimeout(syncRouteMetadataFromPage, 50);
        window.setTimeout(syncRouteMetadataFromPage, 250);
        window.setTimeout(syncRouteMetadataFromPage, 1000);
        window.setTimeout(syncQAStateFromPage, 50);
        window.setTimeout(syncQAStateFromPage, 250);
        window.setTimeout(syncQAStateFromPage, 1000);
      };

      const notifyUpcomingRoute = (href) => {
        if (typeof href !== 'string' || href.length === 0) return;
        post('routeChanged', {
          href,
          title: resolveNativeTitle()
        });
      };

      window.__ECHOTYPE_NATIVE_HOST__ = 'ios';
      window.__ECHOTYPE_IOS_BRIDGE__ = {
        post,
      };

      window.EchoTypeNative = {
        isNativeApp: true,
        platform: 'ios',
        postMessage: post,
        share(payload) {
          post('share', payload);
        },
        shareFile(payload) {
          post('shareFile', payload);
        },
        openExternal(payload) {
          post('openExternal', payload);
        },
        haptic(payload) {
          post('haptic', payload);
        },
        reportQAState(payload) {
          post('qaState', payload);
        },
        startSpeechRecognition(payload) {
          post('startSpeechRecognition', payload);
        },
        stopSpeechRecognition() {
          post('stopSpeechRecognition');
        },
        requestMicrophonePermission() {
          post('requestMicrophonePermission');
        },
        pickFile(payload) {
          post('pickFile', payload);
        }
      };

      const applyNativeAuthCallback = (urlString) => {
        try {
          const url = new URL(urlString);
          const flow = url.searchParams.get('flow');
          if (flow === 'provider-oauth') {
            const callbackUrl = new URL('/settings', window.location.origin);
            for (const key of ['auth_error', 'auth_provider', 'auth_code', 'auth_state']) {
              const value = url.searchParams.get(key);
              if (value) {
                callbackUrl.searchParams.set(key, value);
              }
            }
            window.location.assign(callbackUrl.toString());
            return;
          }

          const next = url.searchParams.get('next') || '/dashboard';
          const code = url.searchParams.get('code');
          const authError = url.searchParams.get('error');
          if (authError) {
            const callbackUrl = new URL('/login', window.location.origin);
            callbackUrl.searchParams.set('auth_error', authError);
            window.location.assign(callbackUrl.toString());
            return;
          }
          if (!code) return;

          const callbackUrl = new URL('/auth/callback', window.location.origin);
          callbackUrl.searchParams.set('code', code);
          callbackUrl.searchParams.set('next', next);
          window.location.assign(callbackUrl.toString());
        } catch (error) {
          console.error('Failed to apply native auth callback', error);
        }
      };

      window.addEventListener('echotype:native-auth-callback', (event) => {
        const url = event.detail?.url;
        if (typeof url === 'string' && url.length > 0) {
          applyNativeAuthCallback(url);
        }
      });

      window.addEventListener('echotype:qa-state-changed', (event) => {
        notifyQAState(event.detail || {});
      });

      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        class NativeSpeechRecognition {
          constructor() {
            this.lang = 'en-US';
            this.continuous = true;
            this.interimResults = true;
            this.maxAlternatives = 1;
            this.onresult = null;
            this.onerror = null;
            this.onend = null;
            this._listening = false;
            this._resultHandler = (event) => {
              if (!this._listening) return;
              const transcript = event.detail?.transcript ?? '';
              const isFinal = !!event.detail?.isFinal;
              const alternative = [{ transcript, confidence: 1 }];
              alternative.isFinal = isFinal;
              const results = [alternative];
              if (typeof this.onresult === 'function') {
                this.onresult({ results });
              }
              if (isFinal && !this.continuous) {
                this._listening = false;
                if (typeof this.onend === 'function') {
                  this.onend();
                }
              }
            };
            this._errorHandler = (event) => {
              this._listening = false;
              if (typeof this.onerror === 'function') {
                this.onerror({ error: event.detail?.message ?? 'native-error' });
              }
              if (typeof this.onend === 'function') {
                this.onend();
              }
            };
            window.addEventListener('echotype:native-speech-result', this._resultHandler);
            window.addEventListener('echotype:native-speech-error', this._errorHandler);
          }

          start() {
            this._listening = true;
            post('startSpeechRecognition', {
              lang: this.lang,
              continuous: this.continuous,
              interimResults: this.interimResults,
              maxAlternatives: this.maxAlternatives
            });
          }

          stop() {
            if (!this._listening) return;
            this._listening = false;
            post('stopSpeechRecognition');
            if (typeof this.onend === 'function') {
              this.onend();
            }
          }

          abort() {
            this.stop();
          }
        }

        window.SpeechRecognition = NativeSpeechRecognition;
        window.webkitSpeechRecognition = NativeSpeechRecognition;
      }

      const originalPushState = history.pushState.bind(history);
      history.pushState = (...args) => {
        originalPushState(...args);
        notifyRouteChange();
      };

      const originalReplaceState = history.replaceState.bind(history);
      history.replaceState = (...args) => {
        originalReplaceState(...args);
        notifyRouteChange();
      };

      window.addEventListener('popstate', notifyRouteChange);
      window.addEventListener('hashchange', notifyRouteChange);
      document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const anchor = target.closest('a[href]');
        if (!(anchor instanceof HTMLAnchorElement)) return;
        if (anchor.target && anchor.target !== '_self') return;
        if (anchor.hasAttribute('download')) return;

        try {
          const nextUrl = new URL(anchor.href, window.location.href);
          if (nextUrl.origin !== window.location.origin) return;
          notifyUpcomingRoute(nextUrl.toString());
        } catch {
          // Ignore malformed href values and let the normal navigation path continue.
        }
      }, true);

      window.dispatchEvent(new CustomEvent('echotype:native-ready', {
        detail: { platform: 'ios' }
      }));
      syncQAStateFromPage();
      notifyRouteChange();
    })();
    """#
}
