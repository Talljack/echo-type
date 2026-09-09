/** Native owns cross-section transitions; Next retains same-section history. */
export function navigateApp(href: string, router: { push: (href: string) => void }): void {
  if (typeof window !== 'undefined' && window.EchoTypeNative?.navigate?.(href)) return;
  router.push(href);
}

export function handleNativeNavigation(
  event: Event,
  currentHref: string,
  isIOSNativeHost: boolean,
  router: { push: (href: string) => void; replace: (href: string) => void },
): void {
  const detail = (event as CustomEvent<{ path?: string; replace?: boolean }>).detail;
  if (!detail?.path) return;
  const current = new URL(currentHref);
  const destination = new URL(detail.path, current);
  if (destination.origin !== current.origin) return;
  for (const key of ['nativeQA', 'nativeHost']) {
    const value = current.searchParams.get(key);
    if (value && !destination.searchParams.has(key)) destination.searchParams.set(key, value);
  }
  if (isIOSNativeHost) destination.searchParams.set('nativeHost', 'ios');
  const href = destination.pathname + destination.search + destination.hash;
  if (detail.replace) router.replace(href);
  else navigateApp(href, router);
}
