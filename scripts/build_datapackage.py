"""Writes public/data/sites.csv and public/data/datapackage.json (Frictionless Data Package v1).

Every file the app serves is listed with its sha256, size, licence, upstream source and retrieval date,
so the data can be checked and reused without reading the code. Run after prepare_data.py / build_*.py.
"""
import csv, hashlib, json, os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(root, *a)
DATA = P('public/data')
RETRIEVED = '2026-10-04'

bands = json.load(open(os.path.join(DATA, 'bands.json')))
cities = json.load(open(os.path.join(DATA, 'cities.json')))

# full-precision values straight from the raw ENORA snapshot (the app files round the score to 2 places)
raw_risk = {r['researchSiteCode']: r for r in json.load(open(P('data/snapshots/raw/health-risks.json')))}

# 1. one flat, typed CSV of all sites (the tabular resource the schema below describes)
rows = []
for c in cities:
    for s in json.load(open(os.path.join(DATA, f"sites-{c['slug']}.json"))):
        r = s.get('risk') or {}
        rows.append({
            'site_id': s['id'], 'site_name': s['name'], 'city': s['city'], 'country': s['country'],
            'latitude': s['lat'], 'longitude': s['lon'],
            'health_risk_score': raw_risk.get(s['id'], {}).get('healthRiskScore', ''),
            'scaled_pathogen_risk': raw_risk.get(s['id'], {}).get('scaledPathogenRisk', ''),
            'scaled_fecal_risk': raw_risk.get(s['id'], {}).get('scaledFecalRisk', ''),
            'scaled_arg_risk': raw_risk.get(s['id'], {}).get('scaledArgRisk', ''),
            'sampling_date': (raw_risk.get(s['id'], {}).get('samplingDate') or '')[:10],
            'band_ours': r.get('level') if r.get('level') in ('low', 'moderate', 'high') else '',
        })
fields = list(rows[0].keys())
with open(os.path.join(DATA, 'sites.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=fields, lineterminator='\n')
    w.writeheader()
    for r in rows:
        w.writerow({k: ('' if v is None else v) for k, v in r.items()})

def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        h.update(f.read())
    return h.hexdigest()

ENORA = {'title': 'ENORA OneAquaHealth API (sites/all and resilience-map/health-risks)', 'path': 'https://api.enora-oah.eu/api/sites/all',
         'retrieved': '2026-10-04T12:41:58Z', 'note': 'Joined on sites[].code == healthRisks[].researchSiteCode; raw snapshots and sha256 in data/snapshots/'}
ENORA_LIC = {'name': 'other-at', 'title': 'No licence stated by ENORA; used for hackathon demonstration with attribution'}
CCBY = {'name': 'CC-BY-4.0', 'title': 'Creative Commons Attribution 4.0', 'path': 'https://creativecommons.org/licenses/by/4.0/'}
OURS = {'name': 'MIT', 'title': 'MIT (StreamRecord derived data and code)', 'path': 'https://opensource.org/licenses/MIT'}

num = lambda name, desc, **c: {'name': name, 'type': 'number', 'description': desc, **({'constraints': c} if c else {})}
schema = {
    'fields': [
        {'name': 'site_id', 'type': 'string', 'description': 'OneAquaHealth research site code (ENORA sites[].code)', 'constraints': {'required': True, 'unique': True}},
        {'name': 'site_name', 'type': 'string', 'description': 'Site name as published by ENORA. Empty for T21 and T24, which ENORA publishes without a name (the app shows them as "Site T21" and "Site T24")'},
        {'name': 'city', 'type': 'string', 'constraints': {'required': True, 'enum': ['Coimbra', 'Benevento', 'Ghent', 'Oslo', 'Toulouse']}},
        {'name': 'country', 'type': 'string', 'description': 'ISO 3166-1 alpha-2, derived from the city (not in the API)', 'constraints': {'enum': ['PT', 'IT', 'BE', 'NO', 'FR']}},
        num('latitude', 'WGS84 latitude', required=True, minimum=-90, maximum=90),
        num('longitude', 'WGS84 longitude', required=True, minimum=-180, maximum=180),
        num('health_risk_score', 'ENORA healthRiskScore, 0 to 1; mean of the three scaled parts; empty when not published', minimum=0, maximum=1),
        num('scaled_pathogen_risk', 'ENORA scaledPathogenRisk, 0 to 1', minimum=0, maximum=1),
        num('scaled_fecal_risk', 'ENORA scaledFecalRisk, 0 to 1', minimum=0, maximum=1),
        num('scaled_arg_risk', 'ENORA scaledArgRisk (antibiotic-resistance genes), 0 to 1', minimum=0, maximum=1),
        {'name': 'sampling_date', 'type': 'date', 'description': 'ENORA samplingDate'},
        {'name': 'band_ours', 'type': 'string', 'description': f"StreamRecord's own tertile of the {bands['n']} scores (cut points {bands['tertile1']} and {bands['tertile2']}); NOT an official OneAquaHealth rating", 'constraints': {'enum': ['low', 'moderate', 'high']}},
    ],
    'primaryKey': ['site_id'],
    'missingValues': [''],
}

def res(name, path, title, description, sources, licenses, **extra):
    full = os.path.join(DATA, path)
    return {'name': name, 'path': path, 'title': title, 'description': description,
            'format': path.rsplit('.', 1)[1], 'mediatype': 'text/csv' if path.endswith('.csv') else 'application/json',
            'encoding': 'utf-8', 'bytes': os.path.getsize(full), 'hash': 'sha256:' + sha(full),
            'sources': sources, 'licenses': licenses, **extra}

resources = [res('sites', 'sites.csv', 'All 106 research sites with lab health-risk',
                 f'{len(rows)} sites; {sum(1 for r in rows if r["health_risk_score"] != "")} with a published health-risk score.',
                 [ENORA], [ENORA_LIC, OURS], profile='tabular-data-resource', dialect={'delimiter': ',', 'header': True}, schema=schema)]
for c in cities:
    resources.append(res(f"sites-{c['slug']}", f"sites-{c['slug']}.json", f"Sites in {c['name']} (app format)",
                         'Same records as sites.csv for one city, as the app loads them.', [ENORA], [ENORA_LIC, OURS]))
resources += [
    res('bands', 'bands.json', 'Our tertile cut points', 'Thirds of all published health-risk scores. StreamRecord derived, not official.', [ENORA], [OURS]),
    res('cities', 'cities.json', 'City index', 'Cities, map centres, site counts and default language.', [ENORA], [OURS]),
    res('library', 'library.json', 'OneAquaHealth quotes, measures and indicators',
        'Verbatim quotes with PDF page numbers, checked by script against the cited page; the mapping of measures to citizen findings is StreamRecord editorial judgement.',
        [{'title': 'OneAquaHealth Policy Brief (May 2026)', 'path': 'https://www.oneaquahealth.eu/app/uploads/2026/05/OneAquaHealth-Policy-Brief.pdf', 'retrieved': RETRIEVED},
         {'title': 'OneAquaHealth Catalogue of Measures (D2.4)', 'path': 'https://doi.org/10.5281/zenodo.20040211', 'retrieved': RETRIEVED},
         {'title': 'OneAquaHealth Key Indicators Factsheets', 'path': 'https://doi.org/10.5281/zenodo.20345207', 'retrieved': RETRIEVED},
         {'title': 'OneAquaHealth Field Sampling Protocols', 'path': 'https://doi.org/10.5281/zenodo.20344421', 'retrieved': RETRIEVED}],
        [CCBY]),
]

pkg = {
    'profile': 'data-package',
    'name': 'streamrecord-oneaquahealth-snapshot',
    'id': 'https://streamrecord.vercel.app/data/datapackage.json',
    'title': 'StreamRecord: OneAquaHealth site and health-risk snapshot',
    'description': 'Frozen snapshot of the ENORA OneAquaHealth research sites and lab health-risk scores, plus verified quotes from OneAquaHealth publications, as used by StreamRecord. Not affiliated with OneAquaHealth.',
    'version': '0.1.0',
    'created': f'{RETRIEVED}T00:00:00Z',
    'homepage': 'https://streamrecord.vercel.app',
    'keywords': ['OneAquaHealth', 'urban streams', 'One Health', 'health risk', 'citizen science', 'FHIR'],
    'contributors': [{'title': 'Clinton Obi', 'role': 'author'}],
    'sources': [ENORA] + resources[-1]['sources'],
    'licenses': [OURS, CCBY, ENORA_LIC],
    'resources': resources,
}
json.dump(pkg, open(os.path.join(DATA, 'datapackage.json'), 'w'), indent=1, ensure_ascii=False)
print(f'sites.csv: {len(rows)} rows; datapackage.json: {len(resources)} resources')
