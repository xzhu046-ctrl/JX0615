import { useEffect, useMemo, useState } from 'react';
import {
  avatarRenderSrc,
  buildWeekDays,
  canOpenOfflineRecord,
  characterName,
  CharacterLite,
  closeApp,
  createOfflineRecordId,
  dateFromKey,
  formatDateTitle,
  loadCharacters,
  lunarStub,
  monthKeyFromDate,
  OfflineInviteRecord,
  openOfflineRecord,
  readOfflineRecords,
  recordDateKey,
  recordStage,
  removeOfflineRecord,
  resolveCharacterAvatar,
  shiftMonth,
  toDateKey,
  upsertOfflineRecord
} from './offlineRuntime';
import './offline.css';

type FilterId = 'all' | 'pending' | 'complete' | 'continued';

const filters: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'complete', label: 'Complete' },
  { id: 'continued', label: 'Continued' }
];

function recordTime(record: OfflineInviteRecord) {
  const parts = [record.dateLabel, record.scheduledTime || record.timeLabel].map((value) => String(value || '').trim()).filter(Boolean);
  return parts.join(' · ') || formatDateTitle(recordDateKey(record));
}

function previewText(record: OfflineInviteRecord) {
  const preview = String(record.previewText || '').trim();
  const location = String(record.location || '').trim();
  if (preview && preview !== location) return preview;
  return location ? `地点：${location}` : '';
}

function filterRecords(records: OfflineInviteRecord[], dateKey: string, filter: FilterId) {
  return records
    .filter((record) => recordDateKey(record) === dateKey)
    .filter((record) => {
      if (filter === 'all') return true;
      const stage = recordStage(record).id;
      if (filter === 'complete') return stage === 'complete';
      if (filter === 'continued') return stage === 'continued';
      return stage === 'pending';
    })
    .sort((a, b) => (Number(b.updatedAt || b.createdAt || 0) || 0) - (Number(a.updatedAt || a.createdAt || 0) || 0));
}

function Avatar({ src, label }: { src: string; label: string }) {
  const [broken, setBroken] = useState(false);
  const safe = avatarRenderSrc(src);
  if (safe && !broken) {
    return <img src={safe} alt={label} onError={() => setBroken(true)} />;
  }
  return <span>{label.slice(0, 1) || '角'}</span>;
}

function VisitAvatar({ char }: { char: CharacterLite }) {
  const [src, setSrc] = useState('');
  const name = characterName(char);

  useEffect(() => {
    let alive = true;
    resolveCharacterAvatar(char).then((next) => {
      if (alive) setSrc(next);
    });
    return () => {
      alive = false;
    };
  }, [char]);

  return <Avatar src={src} label={name} />;
}

function RecordAvatar({ record, characters }: { record: OfflineInviteRecord; characters: CharacterLite[] }) {
  const [src, setSrc] = useState('');
  const name = String(record.charName || '角色').trim() || '角色';
  const char = characters.find((item) => String(item.id || '') === String(record.charId || '')) || null;

  useEffect(() => {
    let alive = true;
    resolveCharacterAvatar(char || ({ id: String(record.charId || ''), name, nickname: name } as CharacterLite)).then((next) => {
      if (alive) setSrc(next);
    });
    return () => {
      alive = false;
    };
  }, [char, name, record.charId]);

  return <Avatar src={src} label={name} />;
}

function useOfflineRecords() {
  const [records, setRecords] = useState<OfflineInviteRecord[]>(() => readOfflineRecords());

  useEffect(() => {
    const refresh = () => setRecords(readOfflineRecords());
    const onMessage = (event: MessageEvent) => {
      const type = String((event.data || {}).type || '');
      if (/OFFLINE_INVITE|OFFLINE_EXITED|STORE_DIRTY/.test(type)) refresh();
    };
    window.addEventListener('message', onMessage);
    window.addEventListener('storage', refresh);
    window.addEventListener('offline-invite-store-dirty', refresh as EventListener);
    const timer = window.setInterval(refresh, 5000);
    refresh();
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('offline-invite-store-dirty', refresh as EventListener);
      window.clearInterval(timer);
    };
  }, []);

  return { records, refresh: () => setRecords(readOfflineRecords()) };
}

export function OfflineApp() {
  const today = useMemo(() => toDateKey(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filter, setFilter] = useState<FilterId>('all');
  const [deleteTarget, setDeleteTarget] = useState<OfflineInviteRecord | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitCharId, setVisitCharId] = useState('');
  const [characters, setCharacters] = useState<CharacterLite[]>([]);
  const { records, refresh } = useOfflineRecords();

  useEffect(() => {
    let alive = true;
    loadCharacters().then((list) => {
      if (alive) setCharacters(list);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!records.length) return;
    const focused = records.find((record) => {
      try {
        const focus = localStorage.getItem('offline_invite_focus_id_v1') || '';
        return focus && focus === record.id;
      } catch {
        return false;
      }
    });
    if (focused) setSelectedDate(recordDateKey(focused));
  }, [records]);

  const week = buildWeekDays(selectedDate);
  const dots = useMemo(() => {
    const next = new Set<string>();
    records.forEach((record) => next.add(recordDateKey(record)));
    return next;
  }, [records]);
  const visibleRecords = filterRecords(records, selectedDate, filter);
  const counts = useMemo(() => {
    const dayRecords = records.filter((record) => recordDateKey(record) === selectedDate);
    return {
      all: dayRecords.length,
      pending: dayRecords.filter((record) => recordStage(record).id === 'pending').length,
      complete: dayRecords.filter((record) => recordStage(record).id === 'complete').length,
      continued: dayRecords.filter((record) => recordStage(record).id === 'continued').length
    };
  }, [records, selectedDate]);

  const openVisit = (dateKey: string) => {
    setSelectedDate(dateKey);
    setVisitDate(dateKey);
    setVisitCharId('');
  };

  const confirmVisit = () => {
    const char = characters.find((item) => String(item.id || '') === visitCharId);
    if (!char?.id) return;
    const now = Date.now();
    const record: OfflineInviteRecord = {
      id: createOfflineRecordId(),
      threadId: '',
      charId: char.id,
      charName: characterName(char),
      sourceRole: 'user',
      previewText: '',
      location: '',
      scheduledDate: visitDate || selectedDate,
      scheduledTime: '',
      dateLabel: formatDateTitle(visitDate || selectedDate),
      timeLabel: '',
      status: 'accepted',
      meetState: 'scheduled',
      readOnly: false,
      createdAt: now,
      updatedAt: now
    };
    record.threadId = record.id;
    upsertOfflineRecord(record);
    refresh();
    setVisitDate('');
    setVisitCharId('');
    openOfflineRecord(record);
  };

  const confirmDelete = () => {
    if (!deleteTarget?.id) return;
    removeOfflineRecord(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  return (
    <main className="offline-react-page">
      <div className="offline-react-stack">
        <section className="offline-month-card">
          <div className="offline-month-row">
            <button className="offline-exit" type="button" aria-label="返回" onClick={closeApp}>♥</button>
            <div className="offline-month-label">
              <div className="offline-month-title">{formatDateTitle(selectedDate)}</div>
            </div>
          </div>

          <div className="offline-picker-row">
            <button type="button" className="offline-nav" onClick={() => setSelectedDate(shiftMonth(selectedDate, -1))}>‹</button>
            <input className="offline-date-field" type="month" value={monthKeyFromDate(selectedDate)} onChange={(event) => setSelectedDate(`${event.target.value}-01`)} />
            <input className="offline-date-field" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value || today)} />
            <button type="button" className="offline-nav" onClick={() => setSelectedDate(shiftMonth(selectedDate, 1))}>›</button>
          </div>

          <div className="offline-weekdays"><div>一</div><div>二</div><div>三</div><div>四</div><div>五</div><div>六</div><div>日</div></div>
          <div className="offline-calendar-strip">
            {week.map((day) => {
              const key = toDateKey(day);
              return (
                <button className={key === selectedDate ? 'offline-day is-active' : 'offline-day'} type="button" key={key} onClick={() => openVisit(key)}>
                  <span className="offline-day-num">{day.getDate()}</span>
                  <span className="offline-day-meta">{lunarStub(day)}</span>
                  <span className={dots.has(key) ? 'offline-day-dot' : 'offline-day-ghost'} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="offline-filter-card">
          {filters.map((item) => (
            <button key={item.id} className={filter === item.id ? 'offline-filter is-active' : 'offline-filter'} type="button" onClick={() => setFilter(item.id)}>
              {item.label} {counts[item.id]}
            </button>
          ))}
        </section>

        <section className="offline-thread-list">
          {!visibleRecords.length ? (
            <div className="offline-empty">这一天这个分类还没有邀约。</div>
          ) : visibleRecords.map((record) => {
            const stage = recordStage(record);
            const name = String(record.charName || '未命名角色').trim() || '未命名角色';
            return (
              <article className="offline-thread-row" key={record.id}>
                <button className="offline-delete" type="button" onClick={() => setDeleteTarget(record)}>删除</button>
                <button className={canOpenOfflineRecord(record) ? 'offline-thread-card' : 'offline-thread-card is-disabled'} type="button" onClick={() => openOfflineRecord(record)}>
                  <div className="offline-polaroid">
                    <div className="offline-avatar"><RecordAvatar record={record} characters={characters} /></div>
                    <div className="offline-polaroid-name">{name}</div>
                  </div>
                  <div className="offline-thread-main">
                    <div className="offline-thread-top">
                      <strong>{name}</strong>
                      <span>{stage.label}</span>
                    </div>
                    <div className="offline-thread-sub">{recordTime(record)}</div>
                    {record.location ? <div className="offline-thread-location">{record.location}</div> : null}
                    {previewText(record) ? <div className="offline-thread-preview">{previewText(record)}</div> : null}
                  </div>
                </button>
              </article>
            );
          })}
        </section>
      </div>

      {visitDate ? (
        <div className="offline-modal" role="dialog" aria-modal="true" onClick={() => setVisitDate('')}>
          <div className="offline-modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="offline-modal-title">想去看看谁？</div>
            <div className="offline-modal-copy">{formatDateTitle(visitDate)}</div>
            <div className="offline-visit-list">
              {characters.map((char) => {
                const active = String(char.id || '') === visitCharId;
                return (
                  <button className={active ? 'offline-visit-char is-active' : 'offline-visit-char'} type="button" key={char.id} onClick={() => setVisitCharId(char.id)}>
                    <div className="offline-visit-avatar"><VisitAvatar char={char} /></div>
                    <span>{characterName(char)}</span>
                  </button>
                );
              })}
            </div>
            <div className="offline-modal-actions">
              <button type="button" onClick={() => setVisitDate('')}>取消</button>
              <button type="button" className="is-solid" disabled={!visitCharId} onClick={confirmVisit}>确定</button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="offline-modal" role="dialog" aria-modal="true" onClick={() => setDeleteTarget(null)}>
          <div className="offline-modal-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="offline-modal-title">删除邀约</div>
            <div className="offline-modal-copy">这条邀约会从约会 app 里移走。</div>
            <div className="offline-modal-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>取消</button>
              <button type="button" className="is-danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
