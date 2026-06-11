export type FavoriteSelectionAction = 'add' | 'move' | 'remove';

export function getFavoriteSelectionAction(
  existingFavorite: { folderId: string } | undefined,
  selectedFolderId: string,
): FavoriteSelectionAction {
  if (!existingFavorite) return 'add';
  return existingFavorite.folderId === selectedFolderId ? 'remove' : 'move';
}
