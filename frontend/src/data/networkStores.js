/** Mohan's live shops — merged into Home kirana cards. Live Mongo vendors (same names) win for /store/:id. */
export const NETWORK_STORES = [
  {
    id: 'network-dailycart24x7',
    name: 'Daily Cart 24/7',
    website: 'https://dailycart24x7.com/',
    description: 'Neighbourhood kirana and daily essentials.',
    address: 'Kodigehalli, KR Puram, Bengaluru 560048',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=60',
    category_slugs: ['grocery'],
    is_open: true,
  },
  {
    id: 'network-idailycart',
    name: 'iDailyCart',
    website: 'https://idailycart.com/',
    description: 'Indian mangoes for export.',
    address: 'Kodigehalli, KR Puram, Bengaluru 560048',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=60',
    category_slugs: ['fruits-veg'],
    is_open: true,
  },
  {
    id: 'network-oraganic',
    name: 'Oraganic',
    website: 'https://oraganic.online/',
    description: 'Organic produce, grown with care.',
    address: 'Kodigehalli, KR Puram, Bengaluru 560048',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=60',
    category_slugs: ['fruits-veg'],
    is_open: true,
  },
  {
    id: 'network-oraganic-ai',
    name: 'Oraganic AI',
    website: 'https://oraganic-ai.com/',
    description: 'Field intelligence for organic growers.',
    address: 'Kodigehalli, KR Puram, Bengaluru 560048',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=60',
    category_slugs: ['grocery'],
    is_open: true,
  },
  {
    id: 'network-alfa-garden',
    name: 'Alfa Garden',
    website: 'https://alfa-garden.com/',
    description: 'Organic produce in KR Puram.',
    address: 'Alpha Garden, Kodigehalli, KR Puram, Bengaluru 560048',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=60',
    category_slugs: ['fruits-veg'],
    is_open: true,
  },
  {
    id: 'network-chittoor-mangoes',
    name: 'Chittoor Mangoes',
    website: 'https://chittoormango.com/',
    description: 'Premium Indian mangoes, air-flown to Singapore.',
    address: 'Singapore & Bengaluru',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=60',
    category_slugs: ['fruits-veg'],
    is_open: true,
  },
  {
    id: 'network-thanks2all',
    name: 'Thanks2All',
    website: 'https://thanks2all.org/',
    description: 'Thanks to all who shaped my life — Mohan Reddy Yadamuri.',
    address: 'Bengaluru',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=60',
    category_slugs: ['grocery'],
    is_open: true,
  },
];

export function mergeNetworkStores(apiStores = []) {
  const catalog = new Map(NETWORK_STORES.map((s) => [s.name.toLowerCase(), s]));
  const enriched = apiStores.map((s) => {
    const extra = catalog.get((s.name || '').toLowerCase());
    if (!extra) return s;
    return {
      ...extra,
      ...s,
      image: s.image || extra.image,
      website: s.website || extra.website,
      description: s.description || extra.description,
      address: s.address || extra.address,
    };
  });
  const names = new Set(enriched.map((s) => (s.name || '').toLowerCase()));
  const extra = NETWORK_STORES.filter((s) => !names.has(s.name.toLowerCase()));
  return [...extra, ...enriched];
}

export function openStore(store, navigate) {
  if (store?.id && !String(store.id).startsWith('network-') && navigate) {
    navigate(`/store/${store.id}`);
    return;
  }
  if (store?.website) {
    window.open(store.website, '_blank', 'noopener,noreferrer');
  }
}
