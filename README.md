# Xin-Qiang Cai — Personal Homepage

This repository is a Hugo site deployed to GitHub Pages. Hugo templates and content are the only source of truth; historical generated pages and experiments live under `archive/` and are not deployed.

## Active structure

```text
.
├── content/       # Hugo content and front matter
├── layouts/       # Homepage, section templates, and shared partials
├── static/        # Public files copied without URL changes
│   ├── bib/
│   ├── css/
│   ├── files/
│   ├── icons/
│   └── images/
├── CV/            # CV source plus the published PDF
├── tests/         # Build and content contract checks
├── docs/plans/    # Current implementation records
├── archive/       # Recoverable history; excluded from deployment
├── themes/        # PaperMod Git submodule
└── hugo.yaml      # Site configuration
```

## Build and verify

```bash
hugo --gc --minify
bash tests/check_teaching_content.sh
bash tests/check_site_contract.sh
```

GitHub Actions currently builds with Hugo 0.146.0. To rebuild the CV, run `latexmk -pdf en_caixq_cv.tex` inside `CV/`; Hugo publishes only `CV/en_caixq_cv.pdf`.

## Presentation policies

- Homepage timeline dates use `YYYY.MM` month precision.
- Formal publication schedules, CV dates, and content front matter retain their original precision.
- IBM Plex Sans is the single site-wide font, including navigation, labels, code-like elements, and canvas equations.
- Files under `archive/` are retained for reference and are not part of the deployed site.
