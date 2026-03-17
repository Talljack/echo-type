export function isLibraryRoute(pathname: string): boolean {
  return pathname === '/library' || pathname.startsWith('/library/');
}

export function getChatDockClasses(pathname: string): { fab: string; panel: string } {
  if (isLibraryRoute(pathname)) {
    return {
      fab: 'right-4 lg:right-auto lg:left-[17rem]',
      panel: 'right-4 lg:right-auto lg:left-[17rem]',
    };
  }

  return {
    fab: 'right-6',
    panel: 'right-6',
  };
}
