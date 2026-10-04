# Product

## Register

product

## Users
- Residents and dog owners standing by an urban stream in Coimbra, Benevento, Ghent, Oslo or Toulouse, on a phone, often outdoors in daylight, curious or mildly worried, with a few minutes at most.
- GPs and public-health officers who need one printable page they can trust.
- City staff deciding what to do about a stream.

The job: understand what OneAquaHealth's lab record says about *this* stream, report what they see in 90 seconds, and learn what can be done.

## Product Purpose
StreamRecord turns OneAquaHealth's published science (the ENORA health-risk scores, the Policy Brief, the Catalogue of Measures) into a plain-language reading per stream, in the city's language. It adds a citizen field check that becomes validated FHIR R4. Success means a resident reads one page and can say what was measured, how long ago, and what it means for people, animals and the stream, without being scared or falsely reassured.

## Brand Personality
Calm, exact, civic. It sounds like a careful public-health notice written by someone who respects the reader: second person, short sentences, no exclamation marks, no em dashes. Every claim shows where it came from. It is honest about the age of the data and about what is ours rather than official.

## Anti-references
- Hackathon dashboards: emoji headings, purple badges, Lucide icon grids, gauges, radial charts, traffic-light score badges, leaderboards.
- Officer-facing GIS viewers with dense layer panels (EEA/Copernicus viewers) that a citizen cannot read.
- SaaS landing aesthetics: hero metrics, gradient accents, rounded card grids, glassmorphism.
- Alarmist health apps: red warning banners, "contaminated" verdicts from a single report.

## Design Principles
1. **The record first.** The lab result, its date and its source are the first thing seen, never buried under chrome.
2. **Show the source, every time.** Each block carries its citation; quotes are verbatim with page numbers.
3. **Honest uncertainty.** "Not sure" is a real answer, citizen data stays preliminary, and our own splits are labelled as ours.
4. **One thing per screen.** GOV.UK question-page discipline in the field check; nothing needs a chart to understand.
5. **Print is a first-class surface.** The clinician reading must work on A4.

## Accessibility & Inclusion
WCAG 2.2 AA. Status always uses shape, word and colour together (Okabe-Ito fills for graphics only). Visible 3px focus ring, skip link, landmarks, map duplicated as a list, `lang` switched per language, reduced motion respected, targets at least 24px and 48px in the form. Atkinson Hyperlegible Next for UI text for low-vision readers.
