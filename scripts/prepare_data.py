"""Normalise the frozen ENORA snapshots into per-city JSON for the app (public/data)."""
import json, glob, os, statistics
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAP = os.path.join(ROOT, 'data', 'snapshots')
OUT = os.path.join(ROOT, 'public', 'data')
os.makedirs(OUT, exist_ok=True)
LANG = {'PT': 'pt', 'IT': 'it', 'BE': 'nl', 'NO': 'no', 'FR': 'fr'}

cities = []
scores = []
by_city = {}
for f in sorted(glob.glob(os.path.join(SNAP, 'sites-*.json'))):
    d = json.load(open(f))
    slug = os.path.basename(f)[6:-5]
    by_city[slug] = d
    for s in d['sites']:
        hr = s.get('health_risk') or {}
        if isinstance(hr.get('healthRiskScore'), (int, float)):
            scores.append(hr['healthRiskScore'])

scores.sort()
n = len(scores)
t1 = scores[n // 3] if n else None
t2 = scores[(2 * n) // 3] if n else None

def band(v):
    if v is None: return 'unknown'
    if v < t1: return 'low'
    if v < t2: return 'moderate'
    return 'high'

for slug, d in by_city.items():
    out = []
    for s in d['sites']:
        hr = s.get('health_risk') or {}
        v = hr.get('healthRiskScore') if isinstance(hr.get('healthRiskScore'), (int, float)) else None
        out.append({
            'id': s['id'], 'name': s['name'], 'city': s['city'], 'country': s['country'],
            'lat': s['lat'], 'lon': s['lon'],
            'risk': None if v is None else {
                'level': band(v), 'score': round(v, 2), 'date': (hr.get('samplingDate') or '')[:10],
                'parts': {k: hr.get(k) for k in ('scaledPathogenRisk', 'scaledFecalRisk', 'scaledArgRisk')},
            },
            'flags': s.get('flags', []),
        })
    out.sort(key=lambda x: x['name'])
    json.dump(out, open(os.path.join(OUT, f'sites-{slug}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    lat = statistics.mean(x['lat'] for x in out); lon = statistics.mean(x['lon'] for x in out)
    cities.append({'slug': slug, 'name': d['city'], 'country': d['country'], 'lang': LANG.get(d['country'], 'en'),
                   'center': [round(lat, 4), round(lon, 4)], 'count': len(out),
                   'withRisk': sum(1 for x in out if x['risk'])})

order = ['coimbra', 'benevento', 'ghent', 'oslo', 'toulouse']
cities.sort(key=lambda c: order.index(c['slug']) if c['slug'] in order else 99)
json.dump(cities, open(os.path.join(OUT, 'cities.json'), 'w'), ensure_ascii=False, indent=1)
json.dump({'n': n, 'tertile1': t1, 'tertile2': t2, 'min': scores[0] if n else None, 'max': scores[-1] if n else None},
          open(os.path.join(OUT, 'bands.json'), 'w'), indent=1)
print('cities', [(c['name'], c['count'], c['withRisk']) for c in cities], 'n scores', n, 'tertiles', t1, t2)
