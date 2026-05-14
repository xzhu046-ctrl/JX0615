export type OfflineInviteRecord = {
  id: string;
  threadId?: string;
  charId?: string;
  charName?: string;
  sourceRole?: string;
  previewText?: string;
  location?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  dateLabel?: string;
  timeLabel?: string;
  status?: string;
  meetState?: string;
  readOnly?: boolean;
  completedAt?: number;
  createdAt?: number;
  updatedAt?: number;
  inviteMessageId?: string;
  replyMessageId?: string;
  scheduleEntryId?: string;
};

export type CharacterLite = {
  id: string;
  name?: string;
  nickname?: string;
  avatar?: string;
  avatarUrl?: string;
  imageData?: string;
  importedAvatarResources?: Array<{ id?: string; previewData?: string; assetKey?: string }>;
};

type OfflineInviteStoreApi = {
  createId?: (prefix: string) => string;
  listRecords?: () => OfflineInviteRecord[];
  readStateSync?: () => { records?: OfflineInviteRecord[] };
  removeRecord?: (id: string) => unknown;
  upsertRecord?: (record: OfflineInviteRecord) => unknown;
};

type AssetStoreApi = {
  load?: (key: string) => Promise<string>;
};

const ONE_DAY = 24 * 60 * 60 * 1000;

export function parentWindow(): any {
  try {
    return window.parent && window.parent !== window ? window.parent : null;
  } catch {
    return null;
  }
}

export function activeAccountId(): string {
  const parent = parentWindow();
  try {
    if (parent?.getActiveAccountId) return String(parent.getActiveAccountId() || '').trim();
  } catch {}
  try {
    const manager = (window as any).AccountManager || parent?.AccountManager;
    const active = manager?.getActive?.();
    return String(active?.id || '').trim();
  } catch {}
  return '';
}

export function scopedKey(base: string): string {
  const parent = parentWindow();
  try {
    if (parent?.scopedKeyForAccount) return parent.scopedKeyForAccount(base, activeAccountId());
  } catch {}
  const account = activeAccountId();
  return account ? `${base}__acct_${account}` : base;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateFromKey(value: string): Date {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return new Date();
  return new Date(Number(match[1]) || 1970, Math.max(0, (Number(match[2]) || 1) - 1), Number(match[3]) || 1);
}

export function monthKeyFromDate(value: string): string {
  const key = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDateKey(new Date());
  return key.slice(0, 7);
}

export function shiftMonth(dateKey: string, delta: number): string {
  const source = dateFromKey(dateKey);
  source.setDate(1);
  source.setMonth(source.getMonth() + delta);
  return toDateKey(source);
}

export function buildWeekDays(dateKey: string): Date[] {
  const anchor = dateFromKey(dateKey);
  const day = anchor.getDay();
  const offset = day === 0 ? 6 : day - 1;
  const start = new Date(anchor.getTime() - offset * ONE_DAY);
  return Array.from({ length: 7 }, (_, index) => new Date(start.getTime() + index * ONE_DAY));
}

export function formatDateTitle(dateKey: string): string {
  const date = dateFromKey(dateKey);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function lunarStub(date: Date): string {
  const labels = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十'];
  return labels[Math.max(0, (date.getDate() - 1) % labels.length)] || '今日';
}

export function normalizeAvatarSrc(src: unknown): string {
  const text = String(src || '').trim();
  if (!text) return '';
  if (/^https?:\/\/[^/]+\/avatar-proxy\?/i.test(text)) {
    try {
      const url = new URL(text);
      return url.searchParams.get('u') || url.searchParams.get('url') || text;
    } catch {
      return text;
    }
  }
  return text;
}

export function isRenderableAvatarSrc(src: unknown): boolean {
  const text = normalizeAvatarSrc(src);
  return /^(data:image\/|blob:|https?:\/\/|\.{0,2}\/|assets\/)/i.test(text);
}

export function avatarRenderSrc(src: unknown): string {
  const text = normalizeAvatarSrc(src);
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) {
    return `${window.location.origin}/avatar-proxy?u=${encodeURIComponent(text)}`;
  }
  return text;
}

export function offlineStore(): OfflineInviteStoreApi | null {
  return ((window as any).OfflineInviteStore || parentWindow()?.OfflineInviteStore || null) as OfflineInviteStoreApi | null;
}

export function readOfflineRecords(): OfflineInviteRecord[] {
  const store = offlineStore();
  try {
    if (store?.listRecords) return store.listRecords();
    if (store?.readStateSync) return store.readStateSync().records || [];
  } catch {}
  return [];
}

export function removeOfflineRecord(id: string) {
  const store = offlineStore();
  try {
    store?.removeRecord?.(id);
  } catch {}
}

export function upsertOfflineRecord(record: OfflineInviteRecord) {
  const store = offlineStore();
  try {
    store?.upsertRecord?.(record);
  } catch {}
}

export async function loadCharacters(): Promise<CharacterLite[]> {
  const parent = parentWindow();
  try {
    if (parent?.MetadataStore?.loadCharacters) {
      const list = await parent.MetadataStore.loadCharacters(true);
      if (Array.isArray(list)) return list.filter(Boolean);
    }
  } catch {}
  try {
    const raw = JSON.parse(localStorage.getItem('characters') || '[]');
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export async function loadAsset(key: string): Promise<string> {
  const safe = String(key || '').trim();
  if (!safe) return '';
  const parent = parentWindow();
  const store = ((window as any).assetStore || parent?.assetStore || null) as AssetStoreApi | null;
  try {
    if (store?.load) return String(await store.load(safe) || '').trim();
  } catch {}
  try {
    return String(localStorage.getItem(safe) || '').trim();
  } catch {
    return '';
  }
}

export function chatBundleKeys(charId: string): string[] {
  const id = String(charId || '').trim();
  if (!id) return [];
  const account = activeAccountId();
  const keys = [scopedKey(`chat_settings_bundle_${id}`), `chat_settings_bundle_${id}`];
  if (account) keys.push(`chat_settings_bundle_${id}__acct_${account}`);
  return Array.from(new Set(keys.filter(Boolean)));
}

export async function resolveCharacterAvatar(char: CharacterLite | null): Promise<string> {
  if (!char?.id) return '';
  for (const key of chatBundleKeys(char.id)) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      if (isRenderableAvatarSrc(parsed?.charAvatar)) return normalizeAvatarSrc(parsed.charAvatar);
    } catch {}
  }
  const direct = [char.avatarUrl, char.imageData, char.avatar].map(normalizeAvatarSrc).find(isRenderableAvatarSrc);
  if (direct) return direct;
  const resources = Array.isArray(char.importedAvatarResources) ? char.importedAvatarResources : [];
  for (const item of resources) {
    const preview = normalizeAvatarSrc(item?.previewData);
    if (isRenderableAvatarSrc(preview)) return preview;
    const stored = await loadAsset(String(item?.assetKey || '')).catch(() => '');
    if (isRenderableAvatarSrc(stored)) return normalizeAvatarSrc(stored);
  }
  return '';
}

export function characterName(char: CharacterLite | null): string {
  return String(char?.nickname || char?.name || '角色').trim() || '角色';
}

export function recordDateKey(record: OfflineInviteRecord): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(record.scheduledDate || ''))) return String(record.scheduledDate);
  const stamp = Number(record.updatedAt || record.createdAt || 0) || Date.now();
  return toDateKey(new Date(stamp));
}

export function recordStage(record: OfflineInviteRecord): { id: string; label: string } {
  const status = String(record.status || '').trim();
  const meet = String(record.meetState || '').trim();
  if (status === 'completed' || meet === 'complete' || meet === 'completed' || record.readOnly) return { id: 'complete', label: 'Complete' };
  if (meet === 'continued' || status === 'continued') return { id: 'continued', label: 'Continued' };
  if (status === 'accepted' || meet === 'scheduled' || meet === 'ongoing') return { id: 'accepted', label: meet === 'ongoing' ? 'Ongoing' : 'Accepted' };
  return { id: 'pending', label: 'Pending' };
}

export function canOpenOfflineRecord(record: OfflineInviteRecord): boolean {
  const stage = recordStage(record).id;
  return stage === 'accepted' || stage === 'continued' || stage === 'complete';
}

export function createOfflineRecordId(): string {
  const store = offlineStore();
  try {
    if (store?.createId) return store.createId('invite');
  } catch {}
  return `invite_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function openOfflineRecord(record: OfflineInviteRecord): boolean {
  if (!record?.id || !record.charId || !canOpenOfflineRecord(record)) return false;
  const readOnly = recordStage(record).id === 'complete';
  const freshStart = record.status === 'accepted' && !record.meetState;
  const launchToken = `offline_record_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    app: 'offline_mode',
    charId: record.charId,
    inviteId: record.id,
    recordId: record.id,
    launchMode: freshStart ? 'invite' : 'resume',
    launchToken,
    forceOpen: true,
    readOnly,
    offlineLaunchRecord: {
      mode: freshStart ? 'invite' : 'resume',
      launchToken,
      freshStart,
      readOnly,
      createdAt: Date.now(),
      charId: record.charId,
      payload: {
        ...record,
        recordId: record.id,
        inviteRecordId: record.id,
        dateKey: recordDateKey(record)
      }
    }
  };
  try {
    localStorage.setItem(scopedKey('offline_invite_focus_id_v1'), record.id);
    localStorage.setItem('offline_invite_focus_id_v1', record.id);
    localStorage.setItem(scopedKey('offline_invite_active_launch_v1'), JSON.stringify({ recordId: record.id, charId: record.charId, openedAt: Date.now() }));
    localStorage.setItem('offline_invite_active_launch_v1', JSON.stringify({ recordId: record.id, charId: record.charId, openedAt: Date.now() }));
  } catch {}
  const parent = parentWindow();
  try {
    if (parent?.forceOpenOfflineMode) {
      parent.forceOpenOfflineMode(payload);
      return true;
    }
  } catch {}
  try {
    parent?.postMessage?.({ type: 'OPEN_APP_WITH', payload }, '*');
    return true;
  } catch {
    return false;
  }
}

export function closeApp() {
  try {
    parentWindow()?.postMessage?.({ type: 'CLOSE_APP', payload: { userExit: true } }, '*');
  } catch {}
}
