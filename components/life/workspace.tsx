'use client';
import { useEffect, useState } from 'react';
import { useGentleman } from '@/components/gentleman-context';
import { parseMemory, type PrivateRecord } from '@/lib/gentleman/model';
import {
  addPacking,
  completeRitual,
  dressCodes,
  garmentCategories,
  packingCandidates,
  ritualDue,
  type Ritual,
  type Wardrobe,
} from '@/lib/life/model';

function useToday() {
  const [day, setDay] = useState('');
  useEffect(() => {
    const refresh = () => {
      const d = new Date();
      setDay(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      );
    };
    const first = setTimeout(refresh, 0),
      timer = setInterval(refresh, 60000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);
  return day;
}
export function LifeOverview() {
  const { memory, update, ask } = useGentleman();
  const today = useToday();
  const [selected, setSelected] = useState<string[]>([]);
  const [tripId, setTripId] = useState('');
  const [code, setCode] = useState('all');
  const [notice, setNotice] = useState('');
  const rituals = memory.records.filter((r) => r.ritual && !r.completed);
  const wardrobe = memory.records.filter((r) => r.wardrobe && !r.completed);
  const ready = wardrobe.filter((r) => r.wardrobe?.readiness === 'ready');
  const due = rituals.filter((r) => today && ritualDue(r) <= today);
  const choices = [
    ...rituals,
    ...wardrobe.filter((r) => code === 'all' || r.wardrobe?.dressCode === code),
  ];
  const candidates = packingCandidates(memory, selected);
  const trip = memory.records.find(
    (r) => r.id === tripId && r.kind === 'trip' && !r.completed,
  );
  return (
    <div className="life-dashboard">
      <div className="life-pulse" aria-label="Life readiness">
        <div>
          <span className="eyebrow gold">YOUR RHYTHM</span>
          <strong>{due.length}</strong>
          <span>rituals due {today || 'today'}</span>
        </div>
        <div>
          <span className="eyebrow gold">READY TO WEAR</span>
          <strong>
            {ready.length}
            <small> / {wardrobe.length}</small>
          </strong>
          <span>pieces in your wardrobe</span>
        </div>
        <div>
          <span className="eyebrow gold">THE NEXT DETAIL</span>
          <p>{due[0]?.title || 'A little preparation goes a long way.'}</p>
          <a href="#knowledge">Explore Product Studio →</a>
        </div>
      </div>
      <details className="life-preparation">
        <summary>Prepare for a trip · grooming & presentation</summary>
        <p>
          Choose your own routine steps and ready-to-wear pieces. Preview the
          list, then copy it into Voyage. Product directions remain in Product
          Studio.
        </p>
        <div className="life-fields">
          <label>
            Trip
            <select
              value={tripId}
              onChange={(e) => {
                setTripId(e.target.value);
                setNotice('');
              }}
            >
              <option value="">Choose an open trip</option>
              {memory.records
                .filter((r) => r.kind === 'trip' && !r.completed)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} · {r.date || 'Dates to follow'}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Show wardrobe
            <select value={code} onChange={(e) => setCode(e.target.value)}>
              <option value="all">Every dress code</option>
              {dressCodes.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="life-choices">
          {choices.map((r) => (
            <label key={r.id}>
              <input
                type="checkbox"
                checked={selected.includes(r.id)}
                disabled={Boolean(
                  r.wardrobe && r.wardrobe.readiness !== 'ready',
                )}
                onChange={(e) => {
                  setSelected(
                    e.target.checked
                      ? [...selected, r.id]
                      : selected.filter((id) => id !== r.id),
                  );
                  setNotice('');
                }}
              />
              <span>
                {r.title}
                <small>
                  {r.ritual
                    ? `${r.ritual.steps.length} routine steps`
                    : `${r.wardrobe?.dressCode} · ${r.wardrobe?.readiness}`}
                </small>
              </span>
            </label>
          ))}
        </div>
        {!choices.length && (
          <p>
            Add a grooming ritual or wardrobe piece below, then configure its
            details to use it here.
          </p>
        )}
        {!!candidates.length && (
          <div className="life-preview">
            <span className="eyebrow gold">
              YOUR SELECTED LIST · {candidates.length}
            </span>
            <ul>
              {candidates.map((c) => (
                <li key={c.sourceKey}>{c.text}</li>
              ))}
            </ul>
            <button className="outline-button" onClick={() => setSelected([])}>
              Clear selection
            </button>
          </div>
        )}
        <p className="small-note">
          These are copies. Later Life edits do not change the trip list. If the
          trip is shared with Cassius, its copied list can be included too.
          Nothing is saved or sent automatically.
        </p>
        <div className="gent-actions">
          <button
            className="gold-button"
            disabled={!trip || !candidates.length}
            onClick={() => {
              if (!trip) return;
              try {
                const next = addPacking(trip, candidates);
                update(
                  parseMemory({
                    ...memory,
                    records: memory.records.map((r) =>
                      r.id === trip.id ? next : r,
                    ),
                  }),
                );
                setNotice(
                  `Added ${(next.packing?.length ?? 0) - (trip.packing?.length ?? 0)} new items to ${trip.title}. Save private memory to keep them.`,
                );
              } catch (e) {
                setNotice(
                  e instanceof Error
                    ? e.message
                    : 'Unable to prepare this list.',
                );
              }
            }}
          >
            Add selected list to Voyage
          </button>
          <button
            className="outline-button"
            disabled={!candidates.length}
            onClick={() =>
              ask(
                `Help me review this presentation and grooming preparation list. These are my recorded choices, not verified product instructions. Ask about occasion, weather and missing information; do not infer medical needs or invent product directions.\n${candidates
                  .map((c) => c.text)
                  .join('\n')
                  .slice(0, 4500)}`,
              )
            }
          >
            Review with Cassius
          </button>
        </div>
        <output>{notice}</output>
      </details>
    </div>
  );
}
export function LifeRecordDetails({ record }: { record: PrivateRecord }) {
  const { memory, update } = useGentleman();
  const today = useToday();
  const [editing, setEditing] = useState(false);
  const [ritual, setRitual] = useState<Ritual>({
    cadenceDays: 1,
    timeOfDay: 'morning',
    steps: [],
    completions: [],
  });
  const [wardrobe, setWardrobe] = useState<Wardrobe>({
    category: 'top',
    color: '',
    dressCode: 'smart casual',
    readiness: 'ready',
  });
  const [start, setStart] = useState('');
  const [error, setError] = useState('');
  function keep(next: PrivateRecord) {
    try {
      update(
        parseMemory({
          ...memory,
          records: memory.records.map((r) => (r.id === record.id ? next : r)),
        }),
      );
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check these details.');
      return false;
    }
  }
  const last = record.ritual?.completions.at(-1);
  return (
    <div className="life-record-details">
      {record.ritual && (
        <div className="life-rhythm">
          <p>
            <strong>{record.ritual.timeOfDay}</strong> · every{' '}
            {record.ritual.cadenceDays} day
            {record.ritual.cadenceDays === 1 ? '' : 's'} ·{' '}
            {record.completed ? 'Paused' : `Next ${ritualDue(record)}`}
          </p>
          <ol>
            {record.ritual.steps.map((s) => (
              <li key={s.id}>{s.text}</li>
            ))}
          </ol>
          <p className="small-note">
            Last completed {last || 'not yet'} ·{' '}
            {record.ritual.completions.length} recorded days (latest 90)
          </p>
          <div className="gent-actions">
            <button
              disabled={
                !today ||
                record.completed ||
                record.ritual.completions.includes(today)
              }
              onClick={() => {
                try {
                  keep(completeRitual(record, today, today));
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : 'Unable to record completion.',
                  );
                }
              }}
            >
              {record.ritual.completions.includes(today)
                ? 'Recorded today'
                : 'Record completed today'}
            </button>
            {last && (
              <button
                onClick={() =>
                  keep({
                    ...record,
                    ritual: {
                      ...record.ritual!,
                      completions: record.ritual!.completions.filter(
                        (d) => d !== last,
                      ),
                    },
                  })
                }
              >
                Undo {last}
              </button>
            )}
          </div>
        </div>
      )}
      {record.wardrobe && (
        <p className="life-garment">
          {record.wardrobe.color || 'Color not recorded'} ·{' '}
          {record.wardrobe.category} · {record.wardrobe.dressCode}
          <strong>{record.wardrobe.readiness}</strong>
        </p>
      )}
      <button
        className="outline-button"
        onClick={() => {
          setEditing(true);
          setError('');
          setStart(record.date || today);
          setRitual(
            record.ritual ?? {
              cadenceDays: 1,
              timeOfDay: 'morning',
              steps: [{ id: crypto.randomUUID(), text: '' }],
              completions: [],
            },
          );
          setWardrobe(
            record.wardrobe ?? {
              category: 'top',
              color: '',
              dressCode: 'smart casual',
              readiness: 'ready',
            },
          );
        }}
      >
        {' '}
        {record.kind === 'ritual'
          ? 'Configure ritual & rhythm'
          : 'Set presentation & readiness'}
      </button>
      {editing && (
        <form
          className="gent-editor life-editor"
          onSubmit={(e) => {
            e.preventDefault();
            const next =
              record.kind === 'ritual'
                ? {
                    ...record,
                    date: start,
                    ritual: {
                      ...ritual,
                      completions: record.ritual?.completions ?? [],
                    },
                  }
                : { ...record, wardrobe };
            if (keep(next)) setEditing(false);
          }}
        >
          {record.kind === 'ritual' ? (
            <>
              <div className="life-fields">
                <label>
                  Start date
                  <input
                    type="date"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label>
                  Repeat every (days)
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={ritual.cadenceDays}
                    onChange={(e) =>
                      setRitual({
                        ...ritual,
                        cadenceDays: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Time of day
                  <select
                    value={ritual.timeOfDay}
                    onChange={(e) =>
                      setRitual({
                        ...ritual,
                        timeOfDay: e.target.value as Ritual['timeOfDay'],
                      })
                    }
                  >
                    <option>morning</option>
                    <option>evening</option>
                    <option>anytime</option>
                  </select>
                </label>
              </div>
              <p>
                Your own steps, in order. Use verified product directions;
                saving a step does not approve its claims.
              </p>
              {ritual.steps.map((s, i) => (
                <div className="life-step" key={s.id}>
                  <label>
                    Step {i + 1}
                    <input
                      required
                      maxLength={240}
                      value={s.text}
                      onChange={(e) =>
                        setRitual({
                          ...ritual,
                          steps: ritual.steps.map((x) =>
                            x.id === s.id ? { ...x, text: e.target.value } : x,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    disabled={ritual.steps.length === 1}
                    onClick={() =>
                      setRitual({
                        ...ritual,
                        steps: ritual.steps.filter((x) => x.id !== s.id),
                      })
                    }
                  >
                    Remove step {i + 1}
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="outline-button"
                disabled={ritual.steps.length >= 20}
                onClick={() =>
                  setRitual({
                    ...ritual,
                    steps: [
                      ...ritual.steps,
                      { id: crypto.randomUUID(), text: '' },
                    ],
                  })
                }
              >
                Add step
              </button>
            </>
          ) : (
            <div className="life-fields">
              <label>
                Category
                <select
                  value={wardrobe.category}
                  onChange={(e) =>
                    setWardrobe({
                      ...wardrobe,
                      category: e.target.value as Wardrobe['category'],
                    })
                  }
                >
                  {garmentCategories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Color
                <input
                  maxLength={80}
                  value={wardrobe.color}
                  onChange={(e) =>
                    setWardrobe({ ...wardrobe, color: e.target.value })
                  }
                />
              </label>
              <label>
                Dress code
                <select
                  value={wardrobe.dressCode}
                  onChange={(e) =>
                    setWardrobe({
                      ...wardrobe,
                      dressCode: e.target.value as Wardrobe['dressCode'],
                    })
                  }
                >
                  {dressCodes.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Readiness
                <select
                  value={wardrobe.readiness}
                  onChange={(e) =>
                    setWardrobe({
                      ...wardrobe,
                      readiness: e.target.value as Wardrobe['readiness'],
                    })
                  }
                >
                  <option>ready</option>
                  <option>laundry</option>
                  <option>repair</option>
                </select>
              </label>
            </div>
          )}
          <div className="gent-actions">
            <button className="gold-button" type="submit">
              Keep details
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
          <p className="small-note">
            Keep details updates working memory. Save private memory to retain
            it in your account.
          </p>
        </form>
      )}
      <p role="alert">{error}</p>
    </div>
  );
}
export function TripPacking({ trip }: { trip: PrivateRecord }) {
  const { memory, update } = useGentleman();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  function keep(next: PrivateRecord) {
    try {
      update(
        parseMemory({
          ...memory,
          records: memory.records.map((r) => (r.id === trip.id ? next : r)),
        }),
      );
      setError('');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check packing list.');
      return false;
    }
  }
  const items = trip.packing ?? [];
  return (
    <section className="life-trip-packing">
      <span className="eyebrow gold">PERSONAL PREPARATION</span>
      <h3>Pack with intention.</h3>
      <p>
        {items.filter((p) => p.packed).length} of {items.length} ready ·{' '}
        <a href="#life">Choose from Life →</a>
      </p>
      {items.map((p) => (
        <div className="life-packing-row" key={p.id}>
          <label>
            <input
              type="checkbox"
              checked={p.packed}
              onChange={(e) =>
                keep({
                  ...trip,
                  packing: items.map((x) =>
                    x.id === p.id ? { ...x, packed: e.target.checked } : x,
                  ),
                })
              }
            />
            {p.text}
          </label>
          <button
            aria-label={`Remove ${p.text}`}
            onClick={() =>
              keep({ ...trip, packing: items.filter((x) => x.id !== p.id) })
            }
          >
            Remove
          </button>
        </div>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (keep(addPacking(trip, [{ text }]))) setText('');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Check this item.');
          }
        }}
      >
        <label>
          Add a preparation item
          <input
            required
            maxLength={420}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </label>
        <button className="outline-button" disabled={trip.completed}>
          Add item
        </button>
      </form>
      <p className="small-note">
        Copied Life details remain here until removed. Save private memory to
        keep checklist changes.
      </p>
      <p role="alert">{error}</p>
    </section>
  );
}
