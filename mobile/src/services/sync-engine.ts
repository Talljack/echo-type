/**
 * Mobile cloud sync: one JSONB blob per user per table (library, favorites, chat).
 * Tables: library_contents, favorites, chat_conversations — each with user_id, data, updated_at.
 */
import { isSupabaseConfigured, supabase } from '@/services/supabase';
import { useChatStore } from '@/stores/useChatStore';
import { useFavoriteStore } from '@/stores/useFavoriteStore';
import { useLibraryStore } from '@/stores/useLibraryStore';
import { DEFAULT_FOLDERS, type FavoriteFolder } from '@/types/favorite';

export type SyncTableName = 'library_contents' | 'favorites' | 'chat_conversations';

export interface FullSyncResult {
  pulledTables: number;
  pushedTables: number;
  itemCount: number;
}

interface RemoteRow {
  id?: string;
  user_id: string;
  data: unknown;
  updated_at: string;
}

function ensureDefaultFolders(folders: FavoriteFolder[]): FavoriteFolder[] {
  const byId = new Map(folders.map((f) => [f.id, f] as const));
  for (const d of DEFAULT_FOLDERS) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function libraryLocalMax(): number {
  const { contents } = useLibraryStore.getState();
  return contents.reduce((m, c) => Math.max(m, c.updatedAt ?? 0), 0);
}

function favoritesLocalMax(): number {
  const { items, folders } = useFavoriteStore.getState();
  const fromItems = items.reduce((m, i) => Math.max(m, i.updatedAt ?? 0), 0);
  const fromFolders = folders.reduce((m, f) => Math.max(m, f.createdAt ?? 0), 0);
  return Math.max(fromItems, fromFolders);
}

function chatLocalMax(): number {
  const { conversations } = useChatStore.getState();
  return conversations.reduce((m, c) => Math.max(m, c.updatedAt ?? 0), 0);
}

function buildLibraryPayload() {
  const s = useLibraryStore.getState();
  return {
    contents: s.contents,
    searchQuery: s.searchQuery,
    filterTags: s.filterTags,
    sortBy: s.sortBy,
    showStarredOnly: s.showStarredOnly,
  };
}

function buildFavoritesPayload() {
  const s = useFavoriteStore.getState();
  return {
    items: s.items,
    folders: s.folders,
    todayReviewCount: s.todayReviewCount,
    lastReviewDate: s.lastReviewDate,
  };
}

function buildChatPayload() {
  const s = useChatStore.getState();
  return {
    conversations: s.conversations,
    currentConversationId: s.currentConversationId,
  };
}

function applyLibraryData(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  useLibraryStore.setState({
    contents: Array.isArray(d.contents) ? d.contents : [],
    searchQuery: typeof d.searchQuery === 'string' ? d.searchQuery : '',
    filterTags: Array.isArray(d.filterTags) ? (d.filterTags as string[]) : [],
    sortBy: d.sortBy === 'title' || d.sortBy === 'difficulty' || d.sortBy === 'recent' ? d.sortBy : 'recent',
    showStarredOnly: Boolean(d.showStarredOnly),
  });
}

function applyFavoritesData(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  const rawFolders = Array.isArray(d.folders) ? (d.folders as FavoriteFolder[]) : [];
  useFavoriteStore.setState({
    items: Array.isArray(d.items) ? d.items : [],
    folders: ensureDefaultFolders(rawFolders.length > 0 ? rawFolders : [...DEFAULT_FOLDERS]),
    todayReviewCount: typeof d.todayReviewCount === 'number' ? d.todayReviewCount : 0,
    lastReviewDate: typeof d.lastReviewDate === 'string' || d.lastReviewDate === null ? d.lastReviewDate : null,
  });
}

function applyChatData(data: unknown) {
  if (!data || typeof data !== 'object') return;
  const d = data as Record<string, unknown>;
  useChatStore.setState({
    conversations: Array.isArray(d.conversations) ? d.conversations : [],
    currentConversationId: typeof d.currentConversationId === 'string' ? d.currentConversationId : null,
  });
}

async function fetchRemote(table: SyncTableName, userId: string): Promise<RemoteRow | null> {
  const { data, error } = await supabase.from(table).select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') return null;
    throw error;
  }
  if (!data) return null;
  return data as RemoteRow;
}

function countSyncedItems(): number {
  const lib = useLibraryStore.getState().contents.length;
  const fav = useFavoriteStore.getState().items.length;
  const chat = useChatStore.getState().conversations.length;
  return lib + fav + chat;
}

/**
 * Pull remote rows; if remote updated_at is newer than local aggregate, replace local store from JSON.
 */
export async function syncDown(
  userId: string,
): Promise<{ pulled: number; remoteTimes: Record<SyncTableName, number> }> {
  if (!isSupabaseConfigured()) {
    return { pulled: 0, remoteTimes: { library_contents: 0, favorites: 0, chat_conversations: 0 } };
  }

  const remoteTimes: Record<SyncTableName, number> = {
    library_contents: 0,
    favorites: 0,
    chat_conversations: 0,
  };
  let pulled = 0;

  const libRow = await fetchRemote('library_contents', userId);
  if (libRow) {
    remoteTimes.library_contents = parseTime(libRow.updated_at);
    if (remoteTimes.library_contents > libraryLocalMax()) {
      applyLibraryData(libRow.data);
      pulled += 1;
    }
  }

  const favRow = await fetchRemote('favorites', userId);
  if (favRow) {
    remoteTimes.favorites = parseTime(favRow.updated_at);
    if (remoteTimes.favorites > favoritesLocalMax()) {
      applyFavoritesData(favRow.data);
      pulled += 1;
    }
  }

  const chatRow = await fetchRemote('chat_conversations', userId);
  if (chatRow) {
    remoteTimes.chat_conversations = parseTime(chatRow.updated_at);
    if (remoteTimes.chat_conversations > chatLocalMax()) {
      applyChatData(chatRow.data);
      pulled += 1;
    }
  }

  return { pulled, remoteTimes };
}

/**
 * Push local snapshots; updated_at is max(local, remote) so last-write-wins across devices.
 */
export async function syncUp(userId: string, remoteTimes: Record<SyncTableName, number>): Promise<{ pushed: number }> {
  if (!isSupabaseConfigured()) {
    return { pushed: 0 };
  }

  let pushed = 0;

  const libLocal = libraryLocalMax();
  const libUpdated = new Date(Math.max(libLocal, remoteTimes.library_contents)).toISOString();
  const libPayload = {
    id: userId,
    user_id: userId,
    data: buildLibraryPayload(),
    updated_at: libUpdated,
  };

  const { error: e1 } = await supabase.from('library_contents').upsert(libPayload, { onConflict: 'id' });
  if (e1) throw e1;
  pushed += 1;

  const favLocal = favoritesLocalMax();
  const favUpdated = new Date(Math.max(favLocal, remoteTimes.favorites)).toISOString();
  const favPayload = {
    id: userId,
    user_id: userId,
    data: buildFavoritesPayload(),
    updated_at: favUpdated,
  };

  const { error: e2 } = await supabase.from('favorites').upsert(favPayload, { onConflict: 'id' });
  if (e2) throw e2;
  pushed += 1;

  const chatLocal = chatLocalMax();
  const chatUpdated = new Date(Math.max(chatLocal, remoteTimes.chat_conversations)).toISOString();
  const chatPayload = {
    id: userId,
    user_id: userId,
    data: buildChatPayload(),
    updated_at: chatUpdated,
  };

  const { error: e3 } = await supabase.from('chat_conversations').upsert(chatPayload, { onConflict: 'id' });
  if (e3) throw e3;
  pushed += 1;

  return { pushed };
}

export async function fullSync(userId: string): Promise<FullSyncResult> {
  if (!isSupabaseConfigured()) {
    return { pulledTables: 0, pushedTables: 0, itemCount: countSyncedItems() };
  }

  const { pulled, remoteTimes } = await syncDown(userId);
  const { pushed } = await syncUp(userId, remoteTimes);

  return {
    pulledTables: pulled,
    pushedTables: pushed,
    itemCount: countSyncedItems(),
  };
}
