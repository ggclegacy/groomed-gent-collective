import type { Asset, BrandKit } from './types.ts';
type RecordValue = Asset | BrandKit;
function database(scope: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(`ggc-creative-${scope}`, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('assets', { keyPath: 'id' });
      r.result.createObjectStore('brands', { keyPath: 'id' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () =>
      reject(
        new Error(
          'Device library unavailable. Download your work before leaving.',
        ),
      );
  });
}
export async function library<T extends RecordValue>(
  scope: string,
  store: 'assets' | 'brands',
  action: 'list' | 'put' | 'delete',
  value?: T | string,
): Promise<T[]> {
  const db = await database(scope);
  return new Promise((resolve, reject) => {
    let result: T[] = [];
    const tx = db.transaction(
      store,
      action === 'list' ? 'readonly' : 'readwrite',
    );
    const s = tx.objectStore(store);
    const r =
      action === 'list'
        ? s.getAll()
        : action === 'put'
          ? s.put(value)
          : s.delete(value as string);
    r.onsuccess = () => {
      if (action === 'list') result = r.result as T[];
    };
    tx.oncomplete = () => {
      db.close();
      resolve(result);
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          'Could not save to this device. Download your work before leaving.',
        ),
      );
    };
  });
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Image could not be opened.'));
    im.src = src;
  });
}
export async function composeAsset(asset: Asset): Promise<string> {
  const base = await loadImage(asset.image);
  const canvas = document.createElement('canvas');
  canvas.width = base.naturalWidth;
  canvas.height = base.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image export is unavailable.');
  ctx.drawImage(base, 0, 0);
  if (asset.productLayer) {
    const p = await loadImage(asset.productLayer);
    const scale = Math.min(
      (canvas.width * 0.6) / p.width,
      (canvas.height * 0.72) / p.height,
    );
    const w = p.width * scale,
      h = p.height * scale;
    ctx.drawImage(p, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }
  if (asset.logo) {
    const p = await loadImage(asset.logo);
    const scale = Math.min(
      (canvas.width * 0.22) / p.width,
      (canvas.height * 0.12) / p.height,
    );
    const w = p.width * scale,
      h = p.height * scale;
    ctx.drawImage(p, canvas.width * 0.06, canvas.height * 0.06, w, h);
  }
  return canvas.toDataURL('image/png');
}
export function downloadData(name: string, url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
}
export async function uploadImage(
  file: File,
  pngOnly = false,
): Promise<string> {
  if (
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
    file.size > 1300000 ||
    (pngOnly && file.type !== 'image/png')
  )
    throw new Error(
      pngOnly
        ? 'Choose a PNG under 1.3 MB.'
        : 'Choose a PNG, JPEG or WebP under 1.3 MB.',
    );
  const url = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Upload could not be read.'));
    r.readAsDataURL(file);
  });
  const im = await loadImage(url);
  if (im.width > 4096 || im.height > 4096)
    throw new Error('Use an image no larger than 4096 pixels per side.');
  return url;
}
export async function validateMask(reference: string, mask: string) {
  const [im, m] = await Promise.all([loadImage(reference), loadImage(mask)]);
  if (im.width !== m.width || im.height !== m.height)
    throw new Error('The mask must match the reference image dimensions.');
  const canvas = document.createElement('canvas');
  canvas.width = m.width;
  canvas.height = m.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(m, 0, 0);
  const pixels = ctx.getImageData(0, 0, m.width, m.height).data;
  let transparent = false;
  for (let i = 3; i < pixels.length; i += 4)
    if (pixels[i] === 0) {
      transparent = true;
      break;
    }
  if (!transparent)
    throw new Error(
      'The mask needs transparent pixels where Cassius should paint.',
    );
}
