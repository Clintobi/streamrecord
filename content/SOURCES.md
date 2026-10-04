# StreamRecord content sources

Every quote in `library.json` was copied from `pdftotext` output of the files below. Only line breaks were joined, and each quote was checked against the single page it cites (`pdftotext -f N -l N`). Page numbers are PDF page indexes. For the Catalogue, the footer number is the PDF page minus 2 and is also stored as `printedPage`.

| # | Title | Publisher | URL / DOI | Licence (as stated) | Retrieved (UTC) | Local files |
|---|-------|-----------|-----------|---------------------|-----------------|-------------|
| 1 | OneAquaHealth Policy Brief: *Urban stream ecosystem health as a One Health priority* (English, 11 pp.; the PDF says "Produced in April 2026", uploaded 6 May 2026) | OneAquaHealth project (Horizon Europe GA 101086521); authors J. P. da Silva, S. R. Q. Serra, A. R. Calapez, D. S. Schmeller, Â. Freitas, C. Dantas, M. A. E. Forio, H. op den Akker, S. H. Henni, M. J. Feio | https://www.oneaquahealth.eu/app/uploads/2026/05/OneAquaHealth-Policy-Brief.pdf (linked from https://www.oneaquahealth.eu/project-publications) | None stated on the website copy. The Zenodo versions (row 2) are CC-BY-4.0 | 2026-10-04 | `sources/policy_brief_oah_site_2026-05.pdf`, `.txt` |
| 2 | OneAquaHealth Policy Brief: Urban stream ecosystem health as a One Health priority (9-language edition, 106 pp.; pages 1-11 are English) | Zenodo / OneAquaHealth | https://doi.org/10.5281/zenodo.22025388 (v. 2026-08-20). Earlier version: 10.5281/zenodo.21476580 (2026-07-21). Concept DOI: 10.5281/zenodo.21476579 | CC-BY-4.0 (Zenodo) | 2026-10-04 | `sources/policy_brief_22025388.pdf`, `.txt` |
| 3 | OneAquaHealth Key Indicators of Ecosystem and Biological Health: Factsheets Collection | Zenodo / OneAquaHealth | https://doi.org/10.5281/zenodo.20345207 (published 2026-05-22) | CC-BY-4.0 (Zenodo) | 2026-10-04 | `sources/factsheets_20345207.pdf`, `.txt` |
| 4 | OneAquaHealth Field Sampling Protocols for Urban Stream Ecosystems (Calapez, Bouchali, Norte, Serra, Ramos, Schmeller, Feio) | Zenodo / OneAquaHealth | https://doi.org/10.5281/zenodo.20344421 (published 2026-05-22) | CC-BY-4.0 (Zenodo) | 2026-10-04 | `sources/field_protocols_20344421.pdf`, `.txt` |
| 5 | OneAquaHealth Catalogue of measures for urban aquatic ecosystems rehabilitation (Deliverable D2.4, v1.0; Dias, Serra, Feio) | Zenodo / OneAquaHealth | https://doi.org/10.5281/zenodo.20040211 (published 2025-12-22) | CC-BY-4.0 (Zenodo). The PDF's own info table says "Rights: OneAquaHealth Consortium" | 2026-10-04 | `sources/catalogue_of_measures_20040211.pdf`, `.txt` (MD5 matches Zenodo: 8155ff7dd88e71c3e07a1b03543b86d2) |

Notes
- The `library.json` Policy Brief quotes cite the 6 May 2026 website PDF (row 1). Each one was also found on the same page of the Zenodo version (row 2), with one exception: the Citizen Science App sentence is on p. 8 of the website copy and p. 9 of the Zenodo copy.
- None of these sources mentions foam. Smell or odour is not used as an indicator in any of them (see `unsourcedChecks` in `library.json`).
- The mapping of measures to citizen findings (`addresses`) is StreamRecord's own editorial judgement. The Catalogue does not make that mapping.
