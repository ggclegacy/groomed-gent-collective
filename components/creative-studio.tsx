'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { runCreativeJobs } from '@/lib/creative/jobs';
import {
  ArrowUpRight,
  Download,
  Heart,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  defaultKit,
  modes,
  platforms,
  ratios,
  type Asset,
  type BrandKit,
  type CreativeBrief,
  type CreativeResult,
  type Operation,
  type Ratio,
} from '@/lib/creative/types';
import {
  composeAsset,
  downloadData,
  library,
  uploadImage,
  validateMask,
} from '@/lib/creative/library';
const starters = [
  [
    'The hero shot',
    'A sculptural product portrait on black stone, metallic gold light and deep forest green shadows.',
  ],
  [
    'A ritual, elevated',
    'An intimate morning grooming ritual with natural window light and a considered, editorial mood.',
  ],
  [
    'Make a statement',
    'A bold campaign with architectural shadows, negative space and quiet confidence.',
  ],
];
export function CreativeStudio({ scope = 'device' }: { scope?: string }) {
  const [tab, setTab] = useState<'create' | 'library' | 'brands'>('create');
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<CreativeBrief['mode']>('Product');
  const [platform, setPlatform] =
    useState<CreativeBrief['platform']>('Instagram');
  const [ratio, setRatio] = useState<Ratio>('4:5');
  const [operation, setOperation] = useState<Operation>('generate');
  const [productId, setProductId] = useState('');
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [brand, setBrand] = useState<BrandKit>(defaultKit);
  const [brands, setBrands] = useState<BrandKit[]>([]);
  const [reference, setReference] = useState<string>();
  const [mask, setMask] = useState<string>();
  const [preservedProduct, setPreservedProduct] = useState<string>();
  const [logo, setLogo] = useState<string>();
  const [lockup, setLockup] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [current, setCurrent] = useState<Asset>();
  const [parentId, setParentId] = useState<string>();
  const [conversation, setConversation] = useState<
    CreativeBrief['conversation']
  >([]);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [favorites, setFavorites] = useState(false);
  const [search, setSearch] = useState('');
  const [directions, setDirections] = useState(1);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const control = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    const c = new AbortController();
    fetch('/api/creative', { signal: c.signal })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((d) => {
        const data = d as {
          products: { id: string; name: string }[];
          connected: boolean;
        };
        setProducts(data.products);
        setConnected(data.connected);
      })
      .catch(() => {
        if (!c.signal.aborted) setConnected(false);
      });
    Promise.all([
      library<Asset>(scope, 'assets', 'list'),
      library<BrandKit>(scope, 'brands', 'list'),
    ])
      .then(([a, b]) => {
        if (alive.current) {
          setAssets(a.sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
          setBrands(b);
        }
      })
      .catch((e) => {
        if (alive.current) setNotice(e.message);
      });
    return () => {
      alive.current = false;
      c.abort();
      control.current?.abort();
    };
  }, [scope]);
  function error(e: unknown) {
    setNotice(
      e instanceof Error
        ? e.message
        : 'Something went wrong. Your brief is preserved.',
    );
  }
  async function upload(
    file: File | undefined,
    target: 'reference' | 'mask' | 'logo',
  ) {
    if (!file) return;
    try {
      const data = await uploadImage(
        file,
        target !== 'reference' || operation === 'inpaint' || lockup,
      );
      if (target === 'reference') {
        setReference(data);
        setPreservedProduct(undefined);
        setMask(undefined);
      } else if (target === 'mask') setMask(data);
      else setLogo(data);
      setNotice('Image ready.');
    } catch (e) {
      error(e);
    }
  }
  async function refineBrief() {
    if (inFlight.current || !prompt.trim()) return;
    inFlight.current = true;
    setBusy('Cassius is refining your direction…');
    const controller = new AbortController();
    control.current = controller;
    const timer = setTimeout(() => controller.abort(), 40000);
    try {
      const brief: CreativeBrief = {
        prompt,
        mode,
        platform,
        ratio,
        operation: 'generate',
        productId,
        brand,
        direction: 0,
        conversation: conversation.slice(-6),
        lockup: false,
      };
      const response = await fetch('/api/creative/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brief),
        signal: controller.signal,
      });
      const data = (await response.json()) as {
        plan: CreativeResult['plan'];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'Cassius could not refine the brief.');
      if (!alive.current) return;
      setConversation(
        (c) =>
          [
            ...c,
            { role: 'user', text: prompt },
            { role: 'assistant', text: data.plan.reply.slice(0, 3000) },
          ].slice(-8) as CreativeBrief['conversation'],
      );
      setPrompt(data.plan.enhancedPrompt.slice(0, 3000));
      setNotice(
        'Cassius refined the brief. Edit it further or create your visual.',
      );
    } catch (e) {
      if (alive.current) error(e);
    } finally {
      clearTimeout(timer);
      inFlight.current = false;
      control.current = null;
      if (alive.current) setBusy('');
    }
  }
  async function generate(campaign = false) {
    if (inFlight.current) return;
    if (!prompt.trim()) {
      setNotice('Describe what you want to create.');
      return;
    }
    if (operation !== 'generate' && !reference) {
      setNotice('Add an image to edit.');
      return;
    }
    if (lockup && !reference) {
      setNotice('Upload a transparent product PNG for the lockup.');
      return;
    }
    if (operation === 'inpaint') {
      try {
        if (!mask || !reference)
          throw new Error('Upload a matching transparent PNG mask.');
        await validateMask(reference, mask);
      } catch (e) {
        error(e);
        return;
      }
    }
    inFlight.current = true;
    setNotice('');
    const controller = new AbortController();
    control.current = controller;
    const campaignId = campaign ? crypto.randomUUID() : undefined;
    const jobs = campaign
      ? (['Instagram', 'Stories', 'Web'] as const).map((p) => ({
          platform: p,
          ratio: platforms[p],
          direction: 0,
        }))
      : Array.from({ length: directions }, (_, direction) => ({
          platform,
          ratio,
          direction,
        }));
    let completed = 0;
    let previous = parentId;
    const initialConversation = conversation.slice(-6);
    let campaignDirection = '';
    try {
      await runCreativeJobs(jobs, controller.signal, async (job, i) => {
        setBusy(`Cassius is creating ${i + 1} of ${jobs.length}…`);
        const brief: CreativeBrief = {
          prompt,
          mode,
          platform: job.platform,
          ratio: job.ratio,
          operation,
          productId,
          brand: { ...brand },
          direction: job.direction,
          conversation: campaignDirection
            ? [
                ...initialConversation.slice(-5),
                { role: 'assistant', text: campaignDirection },
              ]
            : initialConversation,
          reference,
          mask,
          lockup,
        };
        const timeout = setTimeout(() => controller.abort(), 165000);
        let result: CreativeResult;
        try {
          const r = await fetch('/api/creative', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(brief),
            signal: controller.signal,
          });
          const data = (await r.json()) as CreativeResult & { error?: string };
          if (!r.ok)
            throw new Error(data.error || 'Generation could not finish.');
          result = data;
        } finally {
          clearTimeout(timeout);
        }
        if (campaign && !campaignDirection)
          campaignDirection =
            `Keep the following art direction consistent across the campaign: ${result.plan.enhancedPrompt}`.slice(
              0,
              3000,
            );
        const asset: Asset = {
          ...result,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          favorite: false,
          brief,
          parentId: previous,
          campaignId,
          logo,
          productLayer: lockup ? reference : preservedProduct,
        };
        if (!alive.current) return;
        setAssets((a) => [asset, ...a]);
        setCurrent(asset);
        setParentId(asset.id);
        previous = asset.id;
        completed++;
        try {
          await library(scope, 'assets', 'put', asset);
        } catch {
          setNotice(
            'Created, but device storage is full or unavailable. Download this asset before leaving.',
          );
        }
        setConversation(
          (c) =>
            [
              ...c,
              { role: 'user', text: prompt },
              { role: 'assistant', text: result.plan.reply.slice(0, 3000) },
            ].slice(-8) as CreativeBrief['conversation'],
        );
      });
    } catch (e) {
      if (alive.current)
        setNotice(
          `${completed ? `${completed} asset(s) completed and kept. ` : ''}${controller.signal.aborted ? 'Generation stopped. A request already sent may still be billed.' : e instanceof Error ? e.message : 'Generation failed.'}`,
        );
    } finally {
      inFlight.current = false;
      if (alive.current) setBusy('');
      control.current = null;
    }
  }
  async function exportAsset(asset: Asset) {
    try {
      downloadData(`cassius-${asset.id}.png`, await composeAsset(asset));
    } catch (e) {
      error(e);
    }
  }
  async function favorite(asset: Asset) {
    const next = { ...asset, favorite: !asset.favorite };
    try {
      await library(scope, 'assets', 'put', next);
      setAssets((a) => a.map((x) => (x.id === asset.id ? next : x)));
      if (current?.id === asset.id) setCurrent(next);
    } catch (e) {
      error(e);
    }
  }
  function open(asset: Asset) {
    setCurrent(asset);
    setParentId(asset.id);
    setPrompt(asset.brief.prompt);
    setMode(asset.brief.mode);
    setBrand(asset.brief.brand);
    setRatio(asset.brief.ratio);
    setPlatform(asset.brief.platform);
    setProductId(asset.brief.productId);
    setOperation(asset.brief.operation);
    setReference(asset.brief.reference);
    setMask(asset.brief.mask);
    setLogo(asset.logo);
    setPreservedProduct(asset.brief.lockup ? undefined : asset.productLayer);
    setLockup(asset.brief.lockup);
    setConversation(asset.brief.conversation);
    setTab('create');
  }
  async function prepareEdit(asset: Asset) {
    try {
      const url = asset.image;
      const img = new window.Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      const data = canvas.toDataURL('image/jpeg', 0.8);
      if (data.length > 1800000)
        throw new Error(
          'Download and resize this image before uploading for editing.',
        );
      setReference(data);
      setLogo(asset.logo);
      setPreservedProduct(asset.productLayer);
      setMask(undefined);
      setLockup(false);
      setOperation('edit');
      setParentId(asset.id);
      setNotice(
        'Image loaded for editing. Original logo and product layers stay separate and unchanged. Describe your changes.',
      );
    } catch (e) {
      error(e);
    }
  }
  async function saveBrand() {
    try {
      const b = {
        ...brand,
        id: brand.id === 'collective' ? crypto.randomUUID() : brand.id,
      };
      if (!b.name.trim()) throw new Error('Name your brand kit.');
      await library(scope, 'brands', 'put', b);
      setBrand(b);
      setBrands((a) => [...a.filter((x) => x.id !== b.id), b]);
      setNotice('Brand kit saved on this device.');
    } catch (e) {
      error(e);
    }
  }
  const filtered = assets.filter(
    (a) =>
      (!favorites || a.favorite) &&
      `${a.brief.prompt} ${a.brief.brand.name} ${a.brief.platform}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <div className="creative-studio">
      <header className="cs-header">
        <div>
          <span className="cs-kicker">
            <span /> CASSIUS / CREATIVE INTELLIGENCE
          </span>
          <h2>
            Your vision.
            <br />
            <em>Exceptionally realized.</em>
          </h2>
          <p>
            A considered idea. A distinctive image. An entire world of your
            brand.
          </p>
        </div>
        <div className="cs-sigil" aria-hidden="true">
          <Sparkles size={34} />
        </div>
      </header>
      <nav className="cs-tabs" aria-label="Creative workspace">
        {(['create', 'library', 'brands'] as const).map((t) => (
          <button
            key={t}
            aria-current={tab === t ? 'page' : undefined}
            onClick={() => setTab(t)}
          >
            {t === 'create'
              ? 'Create with Cassius'
              : t === 'library'
                ? `Asset library · ${assets.length}`
                : 'Brand atelier'}
          </button>
        ))}
        <button
          disabled={!!busy}
          onClick={() => {
            setPrompt('');
            setCurrent(undefined);
            setParentId(undefined);
            setReference(undefined);
            setMask(undefined);
            setLogo(undefined);
            setPreservedProduct(undefined);
            setLockup(false);
            setConversation([]);
            setOperation('generate');
            setTab('create');
          }}
        >
          + New creation
        </button>
        <span>
          {connected === null
            ? 'Connecting…'
            : connected
              ? 'Creative engine connected'
              : 'Creative engine offline'}
        </span>
      </nav>
      {notice && (
        <output className="cs-notice">
          {notice}
          <button aria-label="Dismiss notice" onClick={() => setNotice('')}>
            <X size={16} />
          </button>
        </output>
      )}
      {tab === 'create' && (
        <div className="cs-workspace">
          <div className="cs-director">
            <div className="cs-section-title">
              <Sparkles size={16} />
              <span>THE CREATIVE BRIEF</span>
              <span>01</span>
            </div>
            <div className="cs-modes">
              {modes.map((m) => (
                <button
                  key={m}
                  disabled={!!busy}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <label className="cs-label">
              Brand kit
              <select
                value={brand.id}
                disabled={!!busy}
                onChange={(e) =>
                  setBrand(
                    brands.find((b) => b.id === e.target.value) ?? defaultKit,
                  )
                }
              >
                <option value="collective">Groomed Gent Collective</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="cs-label">
              Product knowledge
              <select
                value={productId}
                disabled={!!busy}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Brand story / no specific product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="cs-conversation" aria-live="polite">
              {conversation.slice(-4).map((m, i) => (
                <p key={i} className={m.role}>
                  <b>{m.role === 'user' ? 'YOU' : 'CASSIUS'}</b>
                  {m.text}
                </p>
              ))}
            </div>
            <label className="cs-label" htmlFor={`brief-${scope}`}>
              Tell Cassius what you see
            </label>
            <textarea
              id={`brief-${scope}`}
              maxLength={3000}
              value={prompt}
              disabled={!!busy}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cinematic hero shot for Barber’s Blend. Black marble, warm gold light, deep forest green accents…"
              rows={5}
            />
            <button
              className="cs-text-button"
              disabled={!!busy || !prompt.trim() || connected !== true}
              onClick={() => void refineBrief()}
            >
              <WandSparkles size={14} /> Refine this brief with Cassius
            </button>
            <div className="cs-two">
              <label className="cs-label">
                Creative tool
                <select
                  value={operation}
                  disabled={!!busy}
                  onChange={(e) => {
                    setOperation(e.target.value as Operation);
                    setMask(undefined);
                    if (e.target.value !== 'generate') setLockup(false);
                  }}
                >
                  <option value="generate">Create an image</option>
                  <option value="edit">Edit an image</option>
                  <option value="background">Replace background</option>
                  <option value="inpaint">Inpaint with a mask</option>
                </select>
              </label>
              <label className="cs-label">
                Concept directions
                <select
                  value={directions}
                  disabled={!!busy}
                  onChange={(e) => setDirections(Number(e.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? 'direction' : 'directions'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="cs-two">
              <label className="cs-label">
                Destination
                <select
                  disabled={!!busy}
                  value={platform}
                  onChange={(e) => {
                    const p = e.target.value as keyof typeof platforms;
                    setPlatform(p);
                    setRatio(platforms[p]);
                  }}
                >
                  {Object.keys(platforms).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </label>
              <label className="cs-label">
                Aspect ratio
                <select
                  disabled={!!busy}
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value as Ratio)}
                >
                  {Object.keys(ratios).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="cs-uploads">
              {(
                [
                  'reference',
                  'logo',
                  ...(operation === 'inpaint' ? ['mask'] : []),
                ] as ('reference' | 'logo' | 'mask')[]
              ).map((t) => (
                <label key={t} className="cs-upload">
                  <ImagePlus size={18} />
                  <span>
                    {t === 'reference'
                      ? reference
                        ? 'Replace reference'
                        : 'Add reference'
                      : t === 'logo'
                        ? logo
                          ? 'Replace logo'
                          : 'Add logo'
                        : mask
                          ? 'Replace mask'
                          : 'Add PNG mask'}
                  </span>
                  <input
                    type="file"
                    disabled={!!busy}
                    accept={
                      t === 'reference' && !lockup && operation !== 'inpaint'
                        ? 'image/png,image/jpeg,image/webp'
                        : 'image/png'
                    }
                    onChange={(e) => {
                      void upload(e.target.files?.[0], t);
                      e.target.value = '';
                    }}
                  />
                </label>
              ))}
            </div>
            {(reference || logo || mask) && (
              <div className="cs-thumbs">
                {(
                  [
                    ['reference', reference],
                    ['logo', logo],
                    ['mask', mask],
                  ] as const
                ).map(
                  ([t, src]) =>
                    src && (
                      <div key={t}>
                        <Image
                          unoptimized
                          src={src}
                          width={70}
                          height={60}
                          alt={t}
                        />
                        <button
                          disabled={!!busy}
                          aria-label={`Remove ${t}`}
                          onClick={() =>
                            t === 'reference'
                              ? (setReference(undefined), setMask(undefined))
                              : t === 'logo'
                                ? setLogo(undefined)
                                : setMask(undefined)
                          }
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ),
                )}
              </div>
            )}
            <label className="cs-check">
              <input
                type="checkbox"
                checked={lockup}
                disabled={!!busy || operation !== 'generate'}
                onChange={(e) => setLockup(e.target.checked)}
              />{' '}
              Preserve product as an original layer
            </label>
            <p className="cs-fine">
              Use a transparent product PNG for lockups. Logos are composited
              separately. Reference uploads go to the creative provider; logos
              and locked product layers stay in your browser. Inpainting masks
              need transparent edit areas; edits may affect nearby pixels.
            </p>
            <button
              className="cs-generate"
              disabled={!!busy || connected !== true}
              onClick={() => void generate()}
            >
              {busy ? (
                <LoaderCircle className="cs-spin" size={18} />
              ) : (
                <Sparkles size={18} />
              )}{' '}
              {busy ||
                `Create ${directions === 1 ? 'with Cassius' : `${directions} concepts`}`}
              <ArrowUpRight size={18} />
            </button>
            <button
              className="cs-campaign"
              disabled={!!busy || connected !== true}
              onClick={() => void generate(true)}
            >
              <Layers3 size={16} /> Create campaign kit{' '}
              <span>3 coordinated assets</span>
            </button>
            {busy && (
              <button
                className="cs-text-button"
                onClick={() => control.current?.abort()}
              >
                Stop remaining work
              </button>
            )}
            <p className="cs-fine">
              One image per direction. Campaign kits create Instagram, Stories
              and web assets. Generation uses paid API capacity; actual cost
              varies. Saved on this device. Review visuals, claims and
              relationship disclosures before publishing.
            </p>
          </div>
          <div className="cs-canvas-panel">
            <div className="cs-section-title">
              <span>THE CANVAS</span>
              <span>
                {current
                  ? `${current.brief.platform} / ${current.brief.ratio}`
                  : 'READY FOR YOUR DIRECTION'}
              </span>
            </div>
            {current ? (
              <>
                <div
                  className="cs-canvas"
                  style={{ aspectRatio: current.brief.ratio.replace(':', '/') }}
                >
                  <Image
                    unoptimized
                    src={current.image}
                    fill
                    sizes="65vw"
                    alt={current.brief.prompt}
                  />
                  {current.productLayer && (
                    <Image
                      unoptimized
                      className="cs-product-layer"
                      src={current.productLayer}
                      fill
                      sizes="40vw"
                      alt="Original product layer"
                    />
                  )}
                  {current.logo && (
                    <Image
                      unoptimized
                      className="cs-logo-layer"
                      src={current.logo}
                      width={250}
                      height={120}
                      alt="Original brand logo"
                    />
                  )}
                  {busy && (
                    <div className="cs-progress">
                      <LoaderCircle className="cs-spin" />
                      Creating your next direction…
                    </div>
                  )}
                </div>
                <div className="cs-asset-actions">
                  <button onClick={() => void exportAsset(current)}>
                    <Download size={16} /> Export PNG
                  </button>
                  <button
                    aria-pressed={current.favorite}
                    onClick={() => void favorite(current)}
                  >
                    <Heart
                      size={16}
                      fill={current.favorite ? 'currentColor' : 'none'}
                    />{' '}
                    Save favorite
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => void prepareEdit(current)}
                  >
                    <WandSparkles size={16} /> Edit image
                  </button>
                  <button
                    disabled={!!busy}
                    onClick={() => {
                      setParentId(current.id);
                      void generate();
                    }}
                  >
                    Regenerate
                  </button>
                </div>
                <div className="cs-copy">
                  <span className="cs-kicker">THE WORDS TO MATCH</span>
                  <p>{current.plan.caption}</p>
                  <strong>{current.plan.cta}</strong>
                  <button
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          `${current.plan.caption}\n\n${current.plan.cta}`,
                        )
                        .then(() => setNotice('Caption and CTA copied.'))
                        .catch(() =>
                          setNotice(
                            'Copy unavailable. Select the caption text to copy it.',
                          ),
                        )
                    }
                  >
                    Copy caption + CTA
                  </button>
                  <details>
                    <summary>Cassius’s art direction & version</summary>
                    <p>{current.plan.enhancedPrompt}</p>
                    <p>
                      {new Date(current.createdAt).toLocaleString()} ·{' '}
                      {current.parentId
                        ? 'Variation of an earlier asset'
                        : 'Original direction'}
                      {current.campaignId ? ' · Campaign kit' : ''}
                    </p>
                  </details>
                </div>
              </>
            ) : (
              <div className="cs-empty">
                <div className="cs-orbit">
                  <Sparkles size={42} />
                </div>
                <span className="cs-kicker">FROM IDEA TO ICONIC</span>
                <h3>
                  Make something
                  <br />
                  <em>unmistakably yours.</em>
                </h3>
                <p>
                  Describe a vision. Cassius brings the brand, the product
                  knowledge and the creative direction.
                </p>
                <div className="cs-starters">
                  {starters.map(([title, text]) => (
                    <button
                      disabled={!!busy}
                      key={title}
                      onClick={() => setPrompt(text)}
                    >
                      {title}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                {busy && (
                  <output>
                    <LoaderCircle className="cs-spin" /> {busy}
                  </output>
                )}
              </div>
            )}
            {assets.length > 0 && (
              <div className="cs-filmstrip" aria-label="Recent versions">
                {assets.slice(0, 8).map((a) => (
                  <button
                    key={a.id}
                    disabled={!!busy}
                    onClick={() => open(a)}
                    aria-label={`Open ${a.brief.platform} version ${new Date(a.createdAt).toLocaleString()}`}
                    aria-pressed={current?.id === a.id}
                  >
                    <Image
                      unoptimized
                      src={a.image}
                      width={100}
                      height={80}
                      alt={a.brief.mode}
                    />
                    <span>{a.brief.platform}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'library' && (
        <div className="cs-library">
          <div className="cs-library-bar">
            <div>
              <h3>Your creative archive</h3>
              <p>Images, directions and versions saved on this device.</p>
            </div>
            <input
              aria-label="Search assets"
              placeholder="Search your assets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              aria-pressed={favorites}
              onClick={() => setFavorites(!favorites)}
            >
              <Heart size={16} /> Favorites
            </button>
          </div>
          <div className="cs-gallery">
            {filtered.map((a) => (
              <article key={a.id}>
                <button
                  className="cs-gallery-image"
                  style={{ aspectRatio: a.brief.ratio.replace(':', '/') }}
                  disabled={!!busy}
                  onClick={() => open(a)}
                >
                  <Image
                    unoptimized
                    src={a.image}
                    width={600}
                    height={600}
                    alt={a.brief.prompt}
                  />
                  {a.productLayer && (
                    <Image
                      unoptimized
                      className="cs-product-layer"
                      src={a.productLayer}
                      fill
                      sizes="30vw"
                      alt="Original product layer"
                    />
                  )}
                  {a.logo && (
                    <Image
                      unoptimized
                      className="cs-logo-layer"
                      src={a.logo}
                      width={150}
                      height={70}
                      alt="Logo"
                    />
                  )}
                </button>
                <div>
                  <span className="cs-kicker">
                    {a.brief.mode} / {a.brief.platform}
                    {a.campaignId ? ' / KIT' : ''}
                  </span>
                  <p>{a.brief.prompt.slice(0, 85)}</p>
                  <div className="cs-asset-actions">
                    <button
                      aria-label="Favorite asset"
                      aria-pressed={a.favorite}
                      onClick={() => void favorite(a)}
                    >
                      <Heart
                        size={16}
                        fill={a.favorite ? 'currentColor' : 'none'}
                      />
                    </button>
                    <button onClick={() => void exportAsset(a)}>
                      <Download size={16} /> PNG
                    </button>
                    <button
                      onClick={() => {
                        const url = URL.createObjectURL(
                          new Blob(
                            [
                              JSON.stringify(
                                {
                                  brief: {
                                    ...a.brief,
                                    reference: undefined,
                                    mask: undefined,
                                  },
                                  plan: a.plan,
                                  createdAt: a.createdAt,
                                  parentId: a.parentId,
                                  campaignId: a.campaignId,
                                },
                                null,
                                2,
                              ),
                            ],
                            { type: 'application/json' },
                          ),
                        );
                        downloadData(`cassius-${a.id}-brief.json`, url);
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      }}
                    >
                      Brief
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <p className="cs-library-empty">
              {assets.length
                ? 'No assets match this view.'
                : 'Your first direction starts with a brief. Create with Cassius to begin your collection.'}
            </p>
          )}
        </div>
      )}
      {tab === 'brands' && (
        <div className="cs-brands">
          <div>
            <span className="cs-kicker">BRAND ATELIER</span>
            <h3>
              Consistency is
              <br />
              <em>your signature.</em>
            </h3>
            <p>
              Give Cassius your voice, audience and ambassador context. Each
              asset keeps the exact kit used to create it.
            </p>
            <button
              onClick={() =>
                setBrand({ ...defaultKit, id: crypto.randomUUID(), name: '' })
              }
            >
              <Plus size={16} /> New brand kit
            </button>
            {brands.map((b) => (
              <button key={b.id} onClick={() => setBrand(b)}>
                {b.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveBrand();
            }}
          >
            {(
              [
                'name',
                'voice',
                'palette',
                'audience',
                'ambassador',
                'disclosure',
              ] as const
            ).map((k) => (
              <label key={k} className="cs-label">
                {
                  {
                    name: 'Brand name',
                    voice: 'Voice & tone',
                    palette: 'Color & material palette',
                    audience: 'Audience',
                    ambassador: 'Ambassador name / profile',
                    disclosure: 'Relationship disclosure',
                  }[k]
                }
                <textarea
                  rows={k === 'voice' ? 3 : 2}
                  maxLength={500}
                  value={brand[k]}
                  onChange={(e) => setBrand({ ...brand, [k]: e.target.value })}
                />
              </label>
            ))}
            <button className="cs-generate" type="submit">
              Save brand kit <ArrowUpRight size={16} />
            </button>
            <p className="cs-fine">
              Brand kits are stored in this browser, separately from your
              account’s text drafts.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
