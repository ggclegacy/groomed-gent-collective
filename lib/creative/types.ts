import brand from '../brand.json' with { type: 'json' };
export const modes = [
  'Product',
  'Lifestyle',
  'Editorial',
  'Ad',
  'Social',
] as const;
export const ratios = {
  '1:1': [1024, 1024],
  '4:5': [1024, 1280],
  '9:16': [864, 1536],
  '16:9': [1536, 864],
} as const;
export const platforms = {
  Instagram: '4:5',
  TikTok: '9:16',
  Stories: '9:16',
  Ads: '1:1',
  Web: '16:9',
} as const;
export type Ratio = keyof typeof ratios;
export type Operation = 'generate' | 'edit' | 'background' | 'inpaint';
export type BrandKit = {
  id: string;
  name: string;
  voice: string;
  palette: string;
  audience: string;
  ambassador: string;
  disclosure: string;
};
export const defaultKit: BrandKit = {
  id: 'collective',
  name: 'Groomed Gent Collective',
  voice: 'Quiet confidence. Considered, precise, refined. No hype.',
  palette:
    `Obsidian Black ${brand.obsidian} environment, Luxury Gold ${brand.gold} for restrained primary accents, Deep Masculine Green ${brand.green} for subtle dimensional lighting beneath black. Neutral readable typography. No neon, olive, yellow, or excessive gold.`,
  audience: 'Men who approach grooming as a considered daily ritual',
  ambassador: '',
  disclosure: '',
};
export type CreativeBrief = {
  prompt: string;
  mode: (typeof modes)[number];
  ratio: Ratio;
  platform: keyof typeof platforms;
  operation: Operation;
  productId: string;
  brand: BrandKit;
  direction: number;
  conversation: { role: 'user' | 'assistant'; text: string }[];
  reference?: string;
  mask?: string;
  lockup: boolean;
};
export type CreativePlan = {
  reply: string;
  enhancedPrompt: string;
  caption: string;
  cta: string;
};
export type CreativeResult = {
  image: string;
  plan: CreativePlan;
  requestId: string;
  usage: unknown;
};
export type Asset = CreativeResult & {
  id: string;
  createdAt: string;
  parentId?: string;
  campaignId?: string;
  favorite: boolean;
  brief: CreativeBrief;
  logo?: string;
  productLayer?: string;
};
export class CreativeError extends Error {
  status: number;
  retryable: boolean;
  constructor(status: number, message: string, retryable = false) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}
export type ProviderRequest = {
  prompt: string;
  ratio: Ratio;
  operation: Operation;
  reference?: string;
  mask?: string;
  signal: AbortSignal;
};
export interface CreativeProvider {
  id: string;
  capabilities: readonly (Operation | 'video')[];
  ready(): boolean;
  generate(
    request: ProviderRequest,
  ): Promise<{ image: string; usage: unknown }>;
}
