/** Mohan's live shops — merged into Home kirana cards. Live Mongo vendors (same names) win for /store/:id. */

export function hostKey(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return String(url || '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
  }
}

export function displayHost(url) {
  if (!url) return '';
  if (url.includes('play.google.com')) return 'Google Play';
  return hostKey(url);
}

function mergeCatalog(list, apiItems = []) {
  const byName = new Map(list.map((s) => [s.name.toLowerCase(), s]));
  const byHost = new Map(list.filter((s) => s.website).map((s) => [hostKey(s.website), s]));
  const seenNames = new Set();
  const seenHosts = new Set();
  const enriched = [];

  for (const item of apiItems) {
    const name = (item.name || '').trim();
    if (!name) continue;
    const extra = byName.get(name.toLowerCase()) || byHost.get(hostKey(item.website));
    const merged = extra
      ? {
          ...extra,
          ...item,
          name,
          image: item.image || extra.image,
          website: item.website || extra.website,
          description: item.description || extra.description,
          address: item.address || extra.address,
        }
      : item;
    const host = hostKey(merged.website);
    const nameKey = (merged.name || '').toLowerCase();
    if (seenNames.has(nameKey) || (host && seenHosts.has(host))) continue;
    seenNames.add(nameKey);
    if (host) seenHosts.add(host);
    enriched.push(merged);
  }

  const extra = list.filter((s) => {
    const host = hostKey(s.website);
    return !seenNames.has(s.name.toLowerCase()) && !(host && seenHosts.has(host));
  });
  return [...extra, ...enriched];
}

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
  return mergeCatalog(NETWORK_STORES, apiStores);
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

/** Partner apps listed under Home services. Click opens the live listing. */
export const NETWORK_SERVICES = [
  {
    id: 'network-justaround',
    name: 'JustAround',
    website: 'https://play.google.com/store/apps/details?id=com.geosentry.justaround',
    description: 'Borrow, rent, or hire neighbours within 5 km — tools, repairs, tutoring, and more. A Geosentry.AI app.',
    address: 'Bengaluru',
    city: 'Bangalore',
    image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&q=60',
    category_slugs: ['plumber', 'electrician', 'appliance', 'ironing'],
    is_open: true,
  },
];

export function mergeNetworkServices(apiVendors = []) {
  return mergeCatalog(NETWORK_SERVICES, apiVendors);
}

export function openService(vendor, navigate) {
  if (vendor?.id && !String(vendor.id).startsWith('network-') && navigate) {
    navigate(`/pro/${vendor.id}`);
    return;
  }
  if (vendor?.website) {
    window.open(vendor.website, '_blank', 'noopener,noreferrer');
  }
}
