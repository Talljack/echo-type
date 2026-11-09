/** Single entry point for in-app navigation so call sites stay stable. */
export function navigateApp(href: string, router: { push: (href: string) => void }): void {
  router.push(href);
}
