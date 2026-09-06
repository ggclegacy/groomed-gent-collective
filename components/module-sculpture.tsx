/** Architectural module marks. Decorative geometry, never fabricated analytics. */
export function ModuleSculpture({ variant }: { variant: 'voyage' | 'circle' | 'life' }) {
  return (
    <svg className={`module-sculpture module-sculpture-${variant}`} viewBox="0 0 220 130" fill="none" aria-hidden="true" focusable="false">
      <path className="sculpture-ground" d="M15 102 94 122 205 76M40 115 40 99M76 123 76 107M123 112 123 97M166 96 166 80" />
      {variant === 'voyage' ? <>
        <path className="sculpture-face" d="m26 68 69-40 103 25-68 42Z" />
        <path d="m26 68 0 18 104 27 68-41V53M130 95v18M47 69l53-30 75 18-48 29Z" />
        <path className="sculpture-route" d="m56 69 33-19 32 8 39-2M89 50v-9M121 58v-9M160 56v-9" />
        <path d="m88 25 8-5 10 2M179 41l12 3 8 8" />
      </> : variant === 'circle' ? <>
        <path className="sculpture-face" d="m28 56 27-16 27 7-27 17Zm59 28 27-16 27 7-27 17Zm59-49 27-16 27 7-27 17Z" />
        <path d="M28 56v28l27 8 27-17V47M55 64v28M87 84v25l27 8 27-16V75M114 92v25M146 35v27l27 8 27-17V26M173 43v27" />
        <path className="sculpture-route" d="m70 77 31 9M132 73l26-19M80 50l69-19" />
      </> : <>
        <path className="sculpture-face" d="m45 49 26-15 29 7-26 16Zm55-18 26-15 29 7-26 16Zm55 34 23-14 25 6-23 15Z" />
        <path d="M45 49v49l29 8 26-16V41M74 57v49M100 31v52l29 8 26-16V23M129 39v52M155 65v34l25 6 23-14V57M180 72v33" />
        <path className="sculpture-route" d="m112 48 9 2m-9 8 9 2m-9 8 9 2M53 72l13 4M53 82l13 4" />
      </>}
    </svg>
  );
}
