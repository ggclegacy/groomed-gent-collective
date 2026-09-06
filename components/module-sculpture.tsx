/** Decorative spatial glyphs: module identity, never simulated personal telemetry. */
export function ModuleSculpture({ variant }: { variant: 'voyage' | 'circle' | 'life' }) {
  return (
    <svg className={`module-sculpture module-sculpture-${variant}`} viewBox="0 0 220 130" fill="none" aria-hidden="true" focusable="false">
      {variant === 'voyage' ? <>
        <ellipse cx="110" cy="65" rx="70" ry="47" className="sculpture-face" />
        <ellipse cx="110" cy="65" rx="30" ry="47" />
        <ellipse cx="110" cy="65" rx="70" ry="19" />
        <path d="M40 65h140M110 18v94" opacity=".4" />
        <path className="sculpture-route" d="M30 89C54 18 159 14 193 54" />
        <circle cx="193" cy="54" r="3" className="sculpture-face" />
        <ellipse cx="110" cy="65" rx="94" ry="56" strokeDasharray="48 12 2 12" opacity=".3" />
      </> : variant === 'circle' ? <>
        <path className="sculpture-route" d="M52 72C78 72 82 36 110 36S148 82 173 82M52 72q61 55 121 10" />
        <rect x="33" y="53" width="38" height="38" rx="12" className="sculpture-face" />
        <rect x="90" y="16" width="40" height="40" rx="13" className="sculpture-face" />
        <rect x="154" y="63" width="38" height="38" rx="12" className="sculpture-face" />
        <path d="M46 72h12m-6-6v12M104 36h12m-6-6v12M167 82h12m-6-6v12" />
        <ellipse cx="110" cy="64" rx="99" ry="57" strokeDasharray="75 25" opacity=".25" />
      </> : <>
        <path className="sculpture-face" d="M55 75q-8-5 0-10l47-27q8-5 16 0l47 27q8 5 0 10l-47 27q-8 5-16 0Z" />
        <path d="m52 84 50 29q8 5 16 0l50-29M52 54l50-29q8-5 16 0l50 29" opacity=".5" />
        <path className="sculpture-route" d="m74 70 21 12 16-30 11 25 24-7" />
        <ellipse cx="110" cy="70" rx="89" ry="48" strokeDasharray="90 14 2 14" opacity=".35" />
      </>}
    </svg>
  );
}
