"""Builds public/data/meta.json for the Sources & evidence page from the real evidence files."""
import json, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(root, *a)
load = lambda p, d=None: json.load(open(P(p))) if os.path.exists(P(p)) else d

raw = P('data/snapshots/raw')
def rawmeta(name):
    m = load(f'data/snapshots/raw/{name}.meta.json', {}) or {}
    return m

sources = []
for name, title in [('sites-all', 'ENORA OneAquaHealth API: all research sites'), ('health-risks', 'ENORA OneAquaHealth API: resilience-map health risks')]:
    m = rawmeta(name)
    sources.append({
        'title': title,
        'publisher': 'ENORA platform, OneAquaHealth project',
        'url': m.get('url') or ('https://api.enora-oah.eu/api/sites/all' if name == 'sites-all' else 'https://api.enora-oah.eu/api/resilience-map/health-risks'),
        'licence': 'No licence stated; used for hackathon demonstration with attribution',
        'retrieved': (m.get('retrieved_at_utc') or m.get('retrieved') or '2026-10-04')[:10],
        'sha256': m.get('sha256'),
        'note': 'Frozen snapshot; the app makes no live calls',
    })

for title, url, lic in [
    ('OneAquaHealth Policy Brief: Urban stream ecosystem health as a One Health priority (May 2026)', 'https://www.oneaquahealth.eu/app/uploads/2026/05/OneAquaHealth-Policy-Brief.pdf', 'None stated on this copy; the Zenodo edition (10.5281/zenodo.22025388) is CC-BY-4.0'),
    ('OneAquaHealth Catalogue of measures for urban aquatic ecosystems rehabilitation (D2.4)', 'https://doi.org/10.5281/zenodo.20040211', 'CC-BY-4.0 (Zenodo)'),
    ('OneAquaHealth Key Indicators of Ecosystem and Biological Health: Factsheets', 'https://doi.org/10.5281/zenodo.20345207', 'CC-BY-4.0 (Zenodo)'),
    ('OneAquaHealth Field Sampling Protocols for Urban Stream Ecosystems', 'https://doi.org/10.5281/zenodo.20344421', 'CC-BY-4.0 (Zenodo)'),
]:
    sources.append({'title': title, 'publisher': 'OneAquaHealth project (Horizon Europe GA 101086521)', 'url': url, 'licence': lic, 'retrieved': '2026-10-04',
                    'note': 'Quoted verbatim with page numbers'})
lib = {}
for s in lib.get('sourceDocs', []) or lib.get('sources_list', []) or []:
    sources.append({'title': s.get('title'), 'publisher': s.get('publisher', 'OneAquaHealth project'), 'url': s.get('url'),
                    'licence': s.get('licence') or s.get('license') or 'Not stated', 'retrieved': (s.get('retrieved') or '2026-10-04')[:10],
                    'sha256': s.get('sha256'), 'note': s.get('note')})

sources += [
    {'title': 'HL7 Europe OneAquaHealth FHIR IG, commit b907cf0', 'publisher': 'HL7 Europe', 'url': 'https://github.com/hl7-eu/oah/tree/b907cf0869b59d82d9138b3d147fca66f333d911',
     'licence': 'Not set in the repository', 'retrieved': '2026-10-04', 'note': 'CodeSystem and profile rules read from the FSH source'},
    {'title': 'Basemap tiles: Esri World Light Gray Base', 'publisher': 'Esri, HERE, Garmin, OpenStreetMap contributors', 'url': 'https://www.arcgis.com/home/item.html?id=ed712cb1db3e4bae9e85329040fb9a49',
     'licence': 'Esri terms of use; OpenStreetMap data ODbL', 'retrieved': '2026-10-04'},
]

real = [
    {'item': '106 research sites (names, coordinates, cities)', 'status': 'Real', 'note': 'ENORA API snapshot, 2026-10-04'},
    {'item': 'Lab health-risk score and its three parts (96 sites)', 'status': 'Real', 'note': 'ENORA API snapshot; sampled 2023-05-05 to 2024-08-05'},
    {'item': 'Low / moderate / high bands', 'status': 'Ours', 'note': 'Tertiles of the 96 scores (cut points 0.2269 and 0.3491). Not an official OneAquaHealth rating'},
    {'item': 'Citizen checks', 'status': 'Real when you make one', 'note': 'Stored only on your phone. No account, no server. Ships with no pre-filled checks'},
    {'item': 'Catalogue of Measures and Policy Brief text', 'status': 'Real', 'note': 'Quoted with page numbers from the OneAquaHealth documents'},
    {'item': 'People / animals / stream explanations', 'status': 'Ours', 'note': 'Drafted by a final-year medical student. Not clinical advice'},
    {'item': 'Translations (PT, IT, NL, NO, FR)', 'status': 'Machine-assisted', 'note': 'Not reviewed by native speakers; marked in the app'},
    {'item': 'Second-look rules and the review queue', 'status': 'Ours', 'note': 'Four rules we wrote (dead fish, scum below 10 °C, water above 30 °C, four or more Not sure). Not OneAquaHealth rules. The queue runs on this phone'},
    {'item': 'Sample check in the review queue', 'status': 'Synthetic', 'note': 'Added only when you press the sample button; labelled "sample, synthetic" everywhere it appears'},
    {'item': 'Sending checks to the OneAquaHealth sandbox', 'status': 'Not integrated', 'note': 'Bundles are built and validated, but the app does not POST them'},
]

v = load('evidence/validate.json', []) or []
validate = [{'resource': r['resource'], 'server': r['server'].replace('https://', ''), 'profile': r.get('note', 'base R4'),
             'errors': r['errors'], 'warnings': r['warnings'], 'at': r['at'][:16].replace('T', ' ') + 'Z'} for r in v]

ev = load('evidence/summary.json', {}) or {}
meta = {
    'sources': sources,
    'realVsSynthetic': real,
    'fhir': {
        'igRepo': 'https://github.com/hl7-eu/oah/tree/b907cf0869b59d82d9138b3d147fca66f333d911',
        'commit': 'b907cf0', 'package': 'hl7.eu.fhir.oah#0.1.0-ci-build',
        'profilesVerified': ['location-oah'],
        'profilesNotUsed': ['observation-indicators-oah: exists, but fixes status = final; citizen checks stay preliminary'],
        'localCodes': [
            {'code': 'citizen-science', 'why': 'No standard Observation category for citizen data was found'},
            {'code': 'colourSmell', 'why': 'OAH "foam" covers foam/colour/smell together; we ask them separately'},
            {'code': 'scum, deadFish, standingWater, none', 'why': 'Not in the OAH temporary CodeSystem at this commit'},
        ],
    },
    'datapackage': {'path': 'data/datapackage.json', 'csv': 'data/sites.csv', 'resources': len(json.load(open(P('public/data/datapackage.json')))['resources']),
                    'validator': 'frictionless 5.19.1', 'result': 'all resources valid, including sha256 hashes, byte counts and the sites.csv table schema'},
    'evidence': {'validate': validate, 'tests': ev.get('tests'), 'lighthouse': ev.get('lighthouse'), 'bundleKb': ev.get('bundleKb'), 'firstReading': ev.get('firstReading')},
}
os.makedirs(P('public/data'), exist_ok=True)
json.dump(meta, open(P('public/data/meta.json'), 'w'), indent=1, ensure_ascii=False)
print('meta.json:', len(sources), 'sources,', len(validate), 'validate rows')
