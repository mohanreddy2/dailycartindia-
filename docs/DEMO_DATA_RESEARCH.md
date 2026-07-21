# India Hyperlocal Demo Catalog — Research Notes

## Executive Summary
- Partner demos fail when catalog is only “plumber + electrician + rice”.
- Goldmines: **ironing/presswala**, cobbler, tailor, tiffin, RO, mosquito fogging, gas stove/chimney, CCTV, car wash, mini-movers, pandit/pooja + kirana aisles (pooja, stationery, frozen, baby/pet).
- Seed now covers **8 cities × 4 stores × 6 pros**, ~900 products, ~200 services, plus vendor/admin activity.

## Findings (themes)
### Small frequent services
Press/ironing (₹8–15/pc), wash&fold, cobbler, hemming — daily trust jobs Urban Company underplays vs neighbourhood reality. [Perplexity synthesis; ExportersIndia ironing listings]

### Home ops
RO service, gas stove, pest/fogging, CCTV — apartment India staples.

### Mart beyond staples
Pooja samagri, stationery, frozen/bakery, baby/pet — what real kiranas stock.

## Recommendations implemented
1. Expand `CATEGORIES` + `SERVICE_ARCHETYPES` + `MASTER_PRODUCTS` in `backend/seed.py`
2. Demo service account = **Ravi Press & Ironing** (goldmine story)
3. Seed orders/bookings/reviews/disputes so DailyPro + Ops look live
4. Home category icons for new slugs

## References
1. Urban Company city hubs — https://www.urbancompany.com/
2. Hyperlocal tier-2 dynamics — YourStory / industry reports (via research ask)
3. Internal seed: `backend/seed.py --force`
