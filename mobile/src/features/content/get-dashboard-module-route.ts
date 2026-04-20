export function getDashboardModuleRoute(moduleId: 'listen' | 'speak' | 'read' | 'write') {
  switch (moduleId) {
    case 'listen':
      return '/(tabs)/listen';
    case 'speak':
      return '/(tabs)/speak';
    case 'read':
      return '/(tabs)/read';
    case 'write':
      return '/(tabs)/write';
  }
}
