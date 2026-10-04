# Data sources: ENORA / OneAquaHealth snapshots

All files were fetched with plain `curl -sS` (no `-k`, no trailing slash, no auth). Both endpoints answered `HTTP/2 200`, `content-type: application/json`, served via Cloudflare. Response headers are saved next to each file as `raw/<name>.headers.txt`, and the metadata sidecars are `raw/<name>.meta.json`.

| File | URL | Publisher | Retrieved (UTC) | Bytes | sha256 |
|---|---|---|---|---|---|
| `raw/sites-all.json` | https://api.enora-oah.eu/api/sites/all | ENORA platform, OneAquaHealth project (api.enora-oah.eu) | 2026-10-04T12:41:58Z | 128541 | `c0272962378fbe64befae344acb410386fbb71b94777d03c9ad4fe795cf0c632` |
| `raw/health-risks.json` | https://api.enora-oah.eu/api/resilience-map/health-risks | ENORA platform, OneAquaHealth project (api.enora-oah.eu) | 2026-10-04T12:42:00Z | 16576 | `3aee00272cc6ff02a3a5bcdf6975372875ef4056d37f2ebb0253bc12edbf5aa8` |
| `raw/openapi-v3-api-docs.json` (reference only) | https://api.enora-oah.eu/v3/api-docs | ENORA platform | 2026-10-04 ~12:45Z | n/a | `a02bfc85ac79a176c66bdcbc43c049d41f0115a7adf250be59040d4a7cccac32` |

**Licence:** No licence stated; used for hackathon demonstration with attribution. I checked the response headers, the OpenAPI `info` block (it contains only `title: "OpenAPI definition", version: "v0"`) and the https://enora-oah.eu landing page (a JS app shell with no licence text). None of them states a licence.

Attribution text: "Site and health-risk data: ENORA platform, OneAquaHealth project (api.enora-oah.eu), retrieved 2026-10-04."

## Shapes (original field names)

- `sites/all` is an array of 106 objects: `code, name, city{id,name,latitude,longitude}, polygon (GeoJSON FeatureCollection or null), latitude, longitude, altitude`.
- `resilience-map/health-risks` is an array of 96 objects: `id (1..96, row id, NOT a site id), researchSiteCode, samplingDate, scaledPathogenRisk, scaledFecalRisk, scaledArgRisk, healthRiskScore`.

## Join method

`sites[].code == healthRisks[].researchSiteCode`, using an exact, case-sensitive string match.
- The join is 1:1. Each site code appears at most once in health-risks, and all 96 health-risk codes exist in sites.
- 10 sites have no health-risk row: C17, C18, G1, G17, G18, G19, G20, T15, T21, T24.
- `healthRisks[].id` is a row number and must NOT be used as the join key.

## Derived files

`sites-<city>.json` (coimbra, benevento, ghent, oslo, toulouse) were produced by grouping on `city.name`.

Each record contains:
- `id, name, city, city_id, country, lat, lon, altitude_m, has_polygon, health_risk{...}, flags[]`
- a `raw` object holding the untouched site row and health-risk row.

`country` is NOT in the API. It is mapped from the city name (Coimbra=PT, Benevento=IT, Ghent=BE, Oslo=NO, Toulouse=FR) and marked with `country_source`.

**Pitfall:** the API's `city.id` "BE" means **Benevento**, not Belgium. Ghent's city id is "GH".

## Value notes

- All four risk fields are numeric and scaled to 0–1. The source has no categorical levels. `healthRiskScore` equals the mean of the three scaled components (checked for all 96 rows, max deviation < 0.0006). Observed `healthRiskScore` range: 0.0748–0.7822.
- `samplingDate` range: 2023-05-05 to 2024-08-05. Every site has one sampling date.

## Flags (not fixed)

- BN14 (Rocca - Tufara) has sampling date 2024-08-05. Every other Benevento site was sampled between 2023-06-06 and 2023-07-07.
- `altitude` is null for all 20 Oslo sites and for BN14.
