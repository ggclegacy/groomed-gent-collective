'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  AudioLines,
  Bookmark,
  Check,
  Compass,
  LocateFixed,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { VoyageWorld } from './world';
import { VoyageJourneys } from './journeys';
import { browserLocation } from '@/lib/voyage/spatial/geolocation';
import {
  defaultTaste,
  distance,
  demoPlaces,
  lafayette,
  navigation,
  parseTaste,
  rankPlaces,
  territories,
  territoryContext,
  views,
  type DiscoveryResult,
  type RankedPlace,
  type Taste,
  type TasteEvent,
  type Coordinates,
  type Territory,
} from '@/lib/voyage/spatial/model';
export function VoyageWorkspace() {
  const [area, setArea] = useState<Territory>(lafayette),
    [located, setLocated] = useState(false),
    [taste, setTaste] = useState<Taste>(defaultTaste),
    [query, setQuery] = useState(''),
    [filter, setFilter] = useState<string>('Cassius picks'),
    [selected, setSelected] = useState(''),
    [places, setPlaces] = useState<RankedPlace[]>(() =>
      rankPlaces(demoPlaces(lafayette), {
        query: 'explore',
        location: lafayette,
        taste: defaultTaste,
      }),
    ),
    [saved, setSaved] = useState<RankedPlace[]>([]),
    [dismissed, setDismissed] = useState<string[]>([]),
    [settings, setSettings] = useState(false),
    [journeys, setJourneys] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [source, setSource] = useState<'demo' | 'mapbox'>('demo'),
    [now, setNow] = useState<Date | null>(null),
    [recenter, setRecenter] = useState(0),
    [panel, setPanel] = useState(true);
  const [cityQuery, setCityQuery] = useState(''),
    [cityResults, setCityResults] = useState<Territory[]>([]),
    [cityBusy, setCityBusy] = useState(false),
    [cityMessage, setCityMessage] = useState(''),
    [signals, setSignals] = useState<TasteEvent[]>([]);
  const currentTaste = useRef<Taste>(defaultTaste),
    followDevice = useRef(true),
    cityRequest = useRef<AbortController | null>(null);
  const locationRun = useRef(0);
  const requests = useRef<AbortController | null>(null),
    serial = useRef(0),
    mounted = useRef(true);
  const select = useCallback((id: string) => {
    setSelected(id);
    setSettings(false);
    setPanel(true);
  }, []);
  const resetResults = useCallback((nextArea: Territory, nextTaste: Taste) => {
    requests.current?.abort();
    serial.current++;
    setBusy(false);
    setPlaces(
      rankPlaces(demoPlaces(nextArea), {
        query: 'explore',
        location: nextArea,
        taste: nextTaste,
      }),
    );
    setSource('demo');
    setSelected('');
    setDismissed([]);
    setFilter('Cassius picks');
  }, []);
  const locate = useCallback(async () => {
    const attempt = ++locationRun.current;
    setNotice('Finding your area…');
    try {
      const p = await browserLocation.locate();
      if (!mounted.current || attempt !== locationRun.current) return;
      const knownArea = territories.find((t) => distance(p, t) < 12);
      const nextArea = {
        ...p,
        name: knownArea
          ? `${knownArea.name} area`
          : `Your area · ${p.latitude.toFixed(2)}°, ${p.longitude.toFixed(2)}°`,
        timeZone:
          knownArea?.timeZone ??
          Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      try {
        const response = await fetch('/api/voyage/area', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'area', location: p }),
          signal: AbortSignal.timeout(8500),
        });
        if (response.ok) {
          const data = (await response.json()) as { name?: string | null };
          if (data.name) nextArea.name = data.name;
        }
      } catch {
        /* Coordinate fallback remains usable without a city provider. */
      }
      if (!mounted.current || attempt !== locationRun.current) return;
      setArea(nextArea);
      resetResults(nextArea, currentTaste.current);
      followDevice.current = true;
      setLocated(true);
      setNotice(
        'Location ready. Searches use your area. Set home territory only if you want to save this area on your device.',
      );
    } catch (e) {
      if (mounted.current) setNotice((e as Error).message);
    }
  }, [resetResults]);
  useEffect(() => {
    mounted.current = true;
    locationRun.current++;
    const initial = setTimeout(() => {
      try {
        const restored = parseTaste(
          JSON.parse(localStorage.getItem('ggc-voyage-taste-v1') || 'null'),
        );
        currentTaste.current = restored;
        setTaste(restored);
        resetResults(lafayette, restored);
      } catch {
        /* Defaults work when storage is blocked. */
      }
      setNow(new Date());
    }, 0);
    const timer = setInterval(() => setNow(new Date()), 30000);
    const checkPermission = () => {
      void navigator.permissions
        ?.query({ name: 'geolocation' })
        .then((p) => {
          if (p.state === 'granted' && mounted.current) void locate();
        })
        .catch(() => {});
    };
    checkPermission();
    const resumeLocation = () => {
      if (followDevice.current) checkPermission();
    };
    window.addEventListener('focus', resumeLocation);
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected('');
        setSettings(false);
        setJourneys(false);
      }
    };
    window.addEventListener('keydown', escape);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(timer);
      window.removeEventListener('focus', resumeLocation);
      window.removeEventListener('keydown', escape);
      requests.current?.abort();
      cityRequest.current?.abort();
    };
  }, [locate, resetResults]);
  function keepTaste(next: Taste) {
    currentTaste.current = next;
    setTaste(next);
    resetResults(area, next);
    try {
      localStorage.setItem('ggc-voyage-taste-v1', JSON.stringify(next));
      setNotice('Taste saved on this device. No learned profile is active.');
    } catch {
      setNotice('Taste applied for this visit; device storage is unavailable.');
    }
  }
  function chooseArea(next: Territory) {
    locationRun.current++;
    followDevice.current = false;
    setArea(next);
    resetResults(next, taste);
    setLocated(false);
    setCityResults([]);
    setCityMessage('Area selected.');
  }
  async function searchCity() {
    cityRequest.current?.abort();
    const controller = new AbortController();
    cityRequest.current = controller;
    setCityBusy(true);
    setCityMessage('Looking for your area…');
    setCityResults([]);
    try {
      const response = await fetch('/api/voyage/area', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: cityQuery.trim(), location: area }),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        areas?: {
          name: string;
          location: Coordinates;
          timeZone: string | null;
        }[];
        message?: string;
        error?: string;
      };
      if (controller.signal.aborted) return;
      if (!response.ok)
        throw new Error(data.error || 'Area search is unavailable.');
      setCityResults(
        (data.areas ?? []).map((t) => ({
          ...t.location,
          name: t.name,
          timeZone:
            t.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
        })),
      );
      setCityMessage(data.message ?? 'Choose an area.');
    } catch (error) {
      if (!controller.signal.aborted) setCityMessage((error as Error).message);
    } finally {
      if (!controller.signal.aborted) setCityBusy(false);
    }
  }
  function recordSignal(kind: TasteEvent['kind'], place: RankedPlace) {
    setSignals((events) =>
      [
        ...events,
        {
          kind,
          placeId: place.id,
          category: place.category,
          at: new Date().toISOString(),
          source: 'explicit-user-action' as const,
        },
      ].slice(-100),
    );
  }
  async function discover(text: string, view = 'Cassius picks') {
    requests.current?.abort();
    const controller = new AbortController();
    requests.current = controller;
    const run = ++serial.current;
    setFilter(view);
    setPanel(true);
    setSelected('');
    setDismissed([]);
    setBusy(true);
    try {
      const response = await fetch('/api/voyage/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text || 'explore',
          location: area,
          taste,
        }),
        signal: controller.signal,
      });
      const data = (await response.json()) as DiscoveryResult & {
        error?: string;
      };
      if (run !== serial.current) return;
      if (!response.ok)
        throw new Error(data.error || 'Discovery is unavailable.');
      setPlaces(data.places);
      setSource(data.source);
      setNotice(data.message);
    } catch (e) {
      if (run !== serial.current || controller.signal.aborted) return;
      setPlaces(
        rankPlaces(demoPlaces(area), { query: text, location: area, taste }),
      );
      setSource('demo');
      setNotice(`${(e as Error).message} Showing fictional examples.`);
    } finally {
      if (run === serial.current) setBusy(false);
    }
  }
  const visible = useMemo(
    () =>
      (filter === 'Saved'
        ? saved.map((p) => ({
            ...p,
            distanceKm: distance(area, p.location),
            rationale: [
              ...p.rationale.filter(
                (r) => !r.includes('straight-line distance'),
              ),
              `${distance(area, p.location).toFixed(1)} km straight-line distance from the current area; match reflects the saved search.`,
            ],
          }))
        : places
      ).filter((p) => !dismissed.includes(p.id)),
    [filter, saved, places, dismissed, area],
  );
  const picked = visible.find((p) => p.id === selected);
  const context = territoryContext(area, taste.home);
  const hour = now
    ? Number(
        new Intl.DateTimeFormat('en-US', {
          hour: 'numeric',
          hourCycle: 'h23',
          timeZone: area.timeZone,
        }).format(now),
      )
    : 20;
  const preset =
    hour < 6 || hour >= 20
      ? 'night'
      : hour < 8
        ? 'dawn'
        : hour >= 17
          ? 'dusk'
          : 'day';
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  function toggleSave(place: RankedPlace) {
    if (!saved.some((p) => p.id === place.id)) recordSignal('save', place);
    setSaved((s) =>
      s.some((p) => p.id === place.id)
        ? s.filter((p) => p.id !== place.id)
        : [...s, place],
    );
    setNotice(
      'Saved list is kept for this visit. Provider place data is not stored on your device.',
    );
  }
  async function share(place: RankedPlace) {
    const url = navigation('google').destination(place);
    if (!url) {
      setNotice('This fictional destination cannot be shared as a real place.');
      return;
    }
    try {
      if (navigator.share)
        await navigator.share({
          title: place.name,
          text: `Explore ${place.name}`,
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setNotice('Destination link copied.');
      }
    } catch {
      setNotice('Sharing was cancelled or is unavailable.');
    }
  }
  return (
    <section
      className={`voyage-mode ${preset}`}
      aria-label="Voyage location intelligence"
    >
      <VoyageWorld
        location={area}
        places={visible}
        selected={selected}
        select={select}
        preset={preset}
        recenter={recenter}
      />
      <header className="voyage-top">
        <a href="#home" className="voyage-exit">
          <ArrowLeft size={17} />
          <span>Collective</span>
        </a>
        <div className="voyage-wordmark">
          <Compass size={22} />
          <span>
            VOYAGE<small>BY CASSIUS</small>
          </span>
        </div>
        <button
          onClick={() => setSettings((v) => !v)}
          aria-label="Location and taste preferences"
          aria-expanded={settings}
        >
          <SlidersHorizontal size={19} />
        </button>
      </header>
      <div className="voyage-context">
        <span className="voyage-kicker">
          <i />
          {context} <b> / </b>{' '}
          {now
            ? new Intl.DateTimeFormat('en', {
                hour: 'numeric',
                minute: '2-digit',
                timeZone: area.timeZone,
              }).format(now)
            : '—'}
        </span>
        <h1>
          {context === 'AWAY'
            ? `Welcome to ${area.name.split(',')[0]}.`
            : `${greeting}.`}
          <br />
          <em>
            {context === 'AWAY'
              ? 'Your taste travels with you.'
              : 'Where will you find yourself?'}
          </em>
        </h1>
        <button className="voyage-area" onClick={() => setSettings(true)}>
          {area.name} <ArrowUpRight size={14} />
        </button>
        <span className="voyage-location-note">
          {located
            ? 'Device location · time zone follows device settings'
            : 'Selected area · location not detected'}
        </span>
      </div>
      <div className="voyage-map-tools">
        <button
          onClick={() => {
            void locate();
            setRecenter((v) => v + 1);
          }}
          aria-label="Find my location"
        >
          <LocateFixed size={19} />
        </button>
        <button onClick={() => setPanel((v) => !v)} aria-expanded={panel}>
          {panel ? 'World view' : 'Show picks'}
        </button>
        <button onClick={() => setJourneys(true)}>Journeys</button>
      </div>
      <div className="voyage-discovery">
        <nav className="voyage-filters" aria-label="Discover your territory">
          {views.map((v) => (
            <button
              key={v}
              aria-pressed={filter === v}
              onClick={() => {
                if (v === 'Saved') {
                  requests.current?.abort();
                  cityRequest.current?.abort();
                  serial.current++;
                  setBusy(false);
                  setFilter(v);
                  setPanel(true);
                  setSelected('');
                } else void discover(v, v);
              }}
            >
              {v}
            </button>
          ))}
        </nav>
        {panel && (
          <div className="voyage-results">
            <div className="voyage-results-heading">
              <span>
                <Sparkles size={14} /> {filter}
              </span>
              <small>
                {visible.every((p) => p.source === 'demo')
                  ? 'FICTIONAL EXAMPLES'
                  : 'PLACE DISCOVERY'}{' '}
                · {visible.length} places
              </small>
            </div>
            <div className="voyage-cards" aria-busy={busy}>
              {busy ? (
                <div className="voyage-empty">
                  Cassius is considering your next move…
                </div>
              ) : !visible.length ? (
                <div className="voyage-empty">
                  {filter === 'Saved'
                    ? 'Save a place to keep it here for this visit.'
                    : 'No nearby matches. Try another intention or area.'}
                </div>
              ) : (
                visible.map((p, i) => (
                  <article
                    key={p.id}
                    className={`voyage-card ${selected === p.id ? 'active' : ''}`}
                  >
                    <button
                      className="voyage-card-main"
                      onClick={() => select(p.id)}
                    >
                      <span className="voyage-card-index">
                        {String(i + 1).padStart(2, '0')}
                        <span>{p.category}</span>
                      </span>
                      <h2>{p.name}</h2>
                      <p>
                        {p.distanceKm.toFixed(1)} km direct ·{' '}
                        {p.price ? '$'.repeat(p.price) : 'Price unavailable'}
                        {p.source === 'demo' ? ' · Sample' : ''}
                      </p>
                      <div className="voyage-match">
                        <span>CASSIUS MATCH</span>
                        <strong>
                          {p.match}
                          <small>/ 100</small>
                        </strong>
                      </div>
                      <p className="voyage-basis">
                        Heuristic fit ·{' '}
                        {p.source === 'demo'
                          ? 'sample data'
                          : 'category + proximity'}
                      </p>
                    </button>
                    <div className="voyage-card-actions">
                      <button onClick={() => select(p.id)}>
                        Why I picked it <ArrowUpRight size={14} />
                      </button>
                      <button
                        aria-label={`${saved.some((s) => s.id === p.id) ? 'Unsave' : 'Save'} ${p.name}`}
                        onClick={() => toggleSave(p)}
                      >
                        {saved.some((s) => s.id === p.id) ? (
                          <Check size={17} />
                        ) : (
                          <Bookmark size={17} />
                        )}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
        <form
          className="voyage-command"
          onSubmit={(e) => {
            e.preventDefault();
            void discover(query);
          }}
        >
          <Sparkles size={23} />
          <label className="sr-only" htmlFor="voyage-intention">
            Tell Cassius what you have in mind
          </label>
          <input
            id="voyage-intention"
            maxLength={256}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Somewhere quiet to work. A memorable dinner."
          />
          <button
            type="button"
            aria-label="Voice input information"
            onClick={() =>
              setNotice(
                'Use your keyboard’s dictation to speak to Cassius. In-app voice transcription is not connected yet.',
              )
            }
          >
            <AudioLines size={20} />
          </button>
          <button
            className="voyage-submit"
            disabled={busy}
            aria-label="Find places"
          >
            <ArrowUpRight size={22} />
          </button>
        </form>
        <div className="voyage-command-foot">
          <span>CASSIUS / YOUR WORLD, CONSIDERED</span>
          <span>
            {source === 'demo'
              ? 'Demo destinations. No live hours, ratings or reservations.'
              : '© Mapbox · Hours, ratings and ambience are unverified.'}
          </span>
        </div>
        <output className="voyage-notice">{notice}</output>
      </div>
      {picked && (
        <aside
          className="voyage-detail voyage-glass"
          aria-label={`Details for ${picked.name}`}
        >
          <button
            className="voyage-close"
            onClick={() => setSelected('')}
            aria-label="Close place details"
          >
            <X size={20} />
          </button>
          <span className="voyage-kicker">
            {picked.source === 'demo'
              ? 'FICTIONAL DESTINATION'
              : 'DESTINATION INTELLIGENCE'}
          </span>
          <h2>{picked.name}</h2>
          <p>
            {picked.address ||
              `${picked.category} · ${picked.distanceKm.toFixed(1)} km direct`}
          </p>
          <h3>Why I picked it</h3>
          {picked.rationale.map((r) => (
            <p key={r}>{r}</p>
          ))}
          <p className="voyage-basis">
            Cassius Match uses transparent rules, not learned personalization.
          </p>
          <dl>
            <dt>Open now</dt>
            <dd>
              {picked.open === undefined
                ? 'Not available'
                : picked.open
                  ? 'Listed open'
                  : 'Listed closed'}
            </dd>
            <dt>Reviews</dt>
            <dd>
              {picked.rating
                ? `${picked.rating} · ${picked.reviewCount ?? 'Unknown count'}`
                : 'Not available'}
            </dd>
          </dl>
          <details>
            <summary>Photos</summary>
            <p>No licensed photos are supplied by this discovery source.</p>
          </details>
          <div className="voyage-detail-actions">
            <button onClick={() => toggleSave(picked)}>Save</button>
            <button
              disabled={picked.source === 'demo'}
              onClick={() => void share(picked)}
            >
              Share
            </button>
            <button
              onClick={() => {
                setDismissed((s) => [...s, picked.id]);
                setSelected('');
              }}
            >
              Dismiss
            </button>
          </div>
          {picked.source === 'demo' ? (
            <p>Go is unavailable for fictional examples.</p>
          ) : (
            <div className="voyage-go">
              <a
                href={navigation('apple').destination(picked)!}
                target="_blank"
                rel="noreferrer"
              >
                Go · Apple Maps ↗
              </a>
              <a
                href={navigation('google').destination(picked)!}
                target="_blank"
                rel="noreferrer"
              >
                Google Maps ↗
              </a>
            </div>
          )}
        </aside>
      )}
      {settings && (
        <aside
          className="voyage-settings voyage-glass"
          aria-label="Your territory and taste"
        >
          <button
            className="voyage-close"
            aria-label="Close preferences"
            onClick={() => setSettings(false)}
          >
            <X size={20} />
          </button>
          <span className="voyage-kicker">YOUR WORLD</span>
          <h2>Territory & taste</h2>
          <button className="voyage-primary" onClick={() => void locate()}>
            <LocateFixed size={17} /> Use my location
          </button>
          <p>
            Location is requested only with your permission. Search sends your
            selected area to the place provider.
          </p>
          <label>
            Explore an area
            <select
              value={
                territories.some((t) => t.name === area.name) ? area.name : ''
              }
              onChange={(e) => {
                const t = territories.find((t) => t.name === e.target.value);
                if (t) chooseArea(t);
              }}
            >
              <option value="" disabled>
                Selected area
              </option>
              {territories.map((t) => (
                <option key={t.name}>{t.name}</option>
              ))}
            </select>
          </label>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void searchCity();
            }}
            className="voyage-city-search"
          >
            <label htmlFor="voyage-city">Another city</label>
            <div>
              <input
                id="voyage-city"
                required
                maxLength={120}
                value={cityQuery}
                onChange={(event) => setCityQuery(event.target.value)}
                placeholder="City and country"
              />
              <button disabled={cityBusy || !cityQuery.trim()}>
                {cityBusy ? 'Finding…' : 'Find'}
              </button>
            </div>
            <output>{cityMessage}</output>
          </form>
          {cityResults.length > 0 && (
            <div className="voyage-city-results">
              {cityResults.map((t) => (
                <button
                  key={`${t.name}-${t.latitude}`}
                  onClick={() => chooseArea(t)}
                >
                  {t.name}
                  <ArrowUpRight size={15} />
                </button>
              ))}
            </div>
          )}
          <button onClick={() => keepTaste({ ...taste, home: area })}>
            Set this area as home territory
          </button>
          {taste.home && (
            <p>
              Home: {taste.home.name}{' '}
              <button onClick={() => keepTaste({ ...taste, home: null })}>
                Clear
              </button>
            </p>
          )}
          <label>
            <input
              type="checkbox"
              checked={taste.quiet}
              onChange={(e) => keepTaste({ ...taste, quiet: e.target.checked })}
            />{' '}
            Prefer a quieter atmosphere
          </label>
          <label>
            <input
              type="checkbox"
              checked={taste.locallyOwned}
              onChange={(e) =>
                keepTaste({ ...taste, locallyOwned: e.target.checked })
              }
            />{' '}
            Prefer locally owned
          </label>
          <label>
            Usual budget
            <select
              value={taste.maxPrice}
              onChange={(e) =>
                keepTaste({
                  ...taste,
                  maxPrice: Number(e.target.value) as Taste['maxPrice'],
                })
              }
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {'$'.repeat(n)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Occasion
            <select
              value={taste.context}
              onChange={(e) =>
                keepTaste({
                  ...taste,
                  context: e.target.value as Taste['context'],
                })
              }
            >
              {['everyday', 'work', 'date', 'business'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Crowd preference
            <select
              value={taste.crowd}
              onChange={(e) =>
                keepTaste({ ...taste, crowd: e.target.value as Taste['crowd'] })
              }
            >
              <option value="either">A little of both</option>
              <option value="calm">Calm and spacious</option>
              <option value="social">Lively and social</option>
            </select>
          </label>
          <fieldset className="voyage-taste-categories">
            <legend>Your regular stops</legend>
            {[
              'coffee',
              'restaurant',
              'gym',
              'spa',
              'barber',
              'cocktail bar',
            ].map((category) => (
              <label key={category}>
                <input
                  type="checkbox"
                  checked={taste.categories.includes(category)}
                  onChange={(e) =>
                    keepTaste({
                      ...taste,
                      categories: e.target.checked
                        ? [...taste.categories, category]
                        : taste.categories.filter((c) => c !== category),
                    })
                  }
                />
                {category}
              </label>
            ))}
          </fieldset>
          <p>{signals.length} explicit actions this visit · learning is off.</p>
          <button
            onClick={() => {
              keepTaste({ ...defaultTaste });
              setSignals([]);
            }}
          >
            Reset Voyage preferences
          </button>
          <p>
            Preferences stay on this device. Saves and dismissals last for this
            visit. Ambience and ownership only affect a match when the source
            supplies them.
          </p>
        </aside>
      )}
      {journeys && (
        <div className="voyage-journeys-overlay">
          <button className="voyage-exit" onClick={() => setJourneys(false)}>
            <ArrowLeft size={18} /> Back to your world
          </button>
          <VoyageJourneys />
        </div>
      )}
    </section>
  );
}
