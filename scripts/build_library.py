"""Converts content/library.json (verified quotes and measures) into public/data/library.json for the app."""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = json.load(open(os.path.join(root, 'content/library.json')))

FINDING = {'foam': 'foam', 'smell/colour': 'colourSmell', 'scum/algae': 'scum', 'dead fish': 'deadFish', 'standing water': 'standingWater',
           'invasive species': 'invasiveOrganisms', 'low riparian vegetation': 'riparianVegetation', 'low macrophytes': 'macrophytes', 'high temperature': 'waterTemperature'}
QKEY = {'water_temperature': 'waterTemperature', 'riparian_vegetation': 'riparianVegetation', 'macrophytes': 'macrophytes',
        'invasive_organisms': 'invasiveOrganisms', 'water_colour': 'colourSmell'}
DOCS = {
    'zenodo:20344421': ('OneAquaHealth Field Sampling Protocols', 'https://doi.org/10.5281/zenodo.20344421'),
    'zenodo:20345207': ('OneAquaHealth Key Indicators Factsheets', 'https://doi.org/10.5281/zenodo.20345207'),
    'zenodo:20040211': ('OneAquaHealth Catalogue of Measures (D2.4)', 'https://doi.org/10.5281/zenodo.20040211'),
}
pb = src['policyBrief']
PB = ('OneAquaHealth Policy Brief (May 2026)', pb['url'])

def doc(record):
    if record in DOCS: return DOCS[record]
    if 'policy brief' in record.lower(): return PB
    return (record, None)

indicators = []
for i in src['indicators']:
    if i['key'] not in QKEY: continue
    title, url = doc(i['source']['record'])
    indicators.append({'key': QKEY[i['key']], 'title': i['title'], 'explanation': i['explanation'],
                       'source': {'record': title, 'url': url, 'page': i['source'].get('page')}})

measures = [{'id': m['id'], 'name': m['name'].rstrip('.'), 'category': m['category'], 'oneLine': m['oneLine'],
             'page': m.get('printedPage', m['page']), 'pdfPage': m['page'], 'quote': m['quote'],
             'addresses': sorted({FINDING[a] for a in m['addresses'] if a in FINDING})} for m in src['measures']]

out = {
    'policyBrief': {'title': pb['title'], 'url': pb['url'], 'date': '6 May 2026', 'quotes': src['cityWhy']},
    'indicators': indicators,
    'measures': measures,
    'unsourced': [{'dead_fish': 'deadFish', 'smell': 'colourSmell-smell'}.get(u['key'], u['key']) for u in src['unsourcedChecks']],
    'addressesNote': src['addressesNote'],
    'sources': {'catalogue': {'title': DOCS['zenodo:20040211'][0], 'url': DOCS['zenodo:20040211'][1]}},
}
json.dump(out, open(os.path.join(root, 'public/data/library.json'), 'w'), indent=1, ensure_ascii=False)
print(len(indicators), 'indicators for', [i['key'] for i in indicators], '|', len(measures), 'measures |', len(out['policyBrief']['quotes']), 'quotes')
from collections import Counter; print(Counter(a for m in measures for a in m['addresses']))
