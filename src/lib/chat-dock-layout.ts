export function isLibraryRoute(pathname: string): boolean {
  return pathname === '/library' || pathname.startsWith('/library/');
}

export function getChatDockClasses(pathname: string): { fab: string; panel: string } {
  return {
    fab: 'right-6',
    panel: 'right-6',
  };
}
