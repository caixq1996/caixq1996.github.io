# Site Cleanup and Typography Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Standardize homepage timeline dates to month precision, apply one refined font system across the deployed site, and reorganize the repository around one Hugo source of truth with recoverable archives.

**Architecture:** Hugo remains the only deployment source. Public assets move into Hugo's conventional `static/` tree, active CV source stays in `CV/`, and unused generated pages, design experiments, backups, and build intermediates move under documented `archive/` directories. A shell contract test builds the real site and validates content, typography, dates, assets, and archive boundaries.

**Tech Stack:** Hugo 0.146.0, Go templates, HTML/CSS/JavaScript, Bash, GitHub Pages.

---

### Task 1: Add a failing site contract test

**Files:**
- Create: `tests/check_site_contract.sh`
- Modify: `tests/check_teaching_content.sh`

**Step 1: Write the failing test**

Add checks that build the Hugo site and require:

- homepage `<time>` values use `YYYY.MM` only;
- every active layout uses the shared IBM Plex Sans typography partial;
- no active layout imports or declares IBM Plex Mono or a monospace fallback;
- the deployed homepage retains News, Professional Service, teaching, and publication content;
- generated pages and public assets exist at their current URLs;
- historical top-level files are absent and documented under `archive/`;
- CV build intermediates are absent from the deployed site.

Update the teaching check to validate Hugo source and generated output instead of tracked generated HTML snapshots.

**Step 2: Run tests to verify they fail**

Run:

```bash
HUGO_BIN=/home/caixq/.local/bin/hugo-0.146.0 bash tests/check_site_contract.sh
```

Expected: FAIL for day-precision News dates, mixed font declarations, missing standard `static/` layout, and missing archive documentation.

### Task 2: Standardize dates and typography

**Files:**
- Create: `layouts/partials/site_typography.html`
- Create: `layouts/partials/extend_head.html`
- Create: `static/css/site-font.css`
- Modify: `layouts/index.html`
- Modify: `layouts/teaching/list.html`
- Modify: `layouts/honors/list.html`
- Modify: `layouts/publications/list.html`

**Step 1: Implement the shared font system**

Import only IBM Plex Sans at weights 400, 500, 600, and 700. Define `--site-font-family` once in the shared public stylesheet and apply it to document text, controls, preformatted content, and code. Include that stylesheet through a shared partial in all custom layouts and through PaperMod's `extend_head.html` hook. Wrap the active static BibTeX pages with minimal HTML that loads the same stylesheet.

Replace explicit mono-family declarations and canvas equation font strings with the shared font variable or IBM Plex Sans.

**Step 2: Normalize timeline dates**

Change `2026.04.22` and `2026.04.08` to `2026.04` in the homepage News timeline. Preserve publication date ranges, CV dates, and content front matter exactly.

**Step 3: Run the contract test**

Expected: typography and date checks pass; structure/archive checks still fail.

### Task 3: Adopt the standard Hugo static structure

**Files:**
- Move: `bib/` to `static/bib/`
- Move: `files/` to `static/files/`
- Move: `icons/` to `static/icons/`
- Move: `images/` to `static/images/`
- Modify: `hugo.yaml`

**Step 1: Move active public assets**

Use Git-aware moves so asset history remains traceable. Keep public URLs unchanged.

**Step 2: Simplify Hugo mounts**

Use the conventional `static/` mount and mount only `CV/en_caixq_cv.pdf` to `static/CV/en_caixq_cv.pdf`. Do not publish CV source or build intermediates.

**Step 3: Build and verify URLs**

Require homepage image/icon/PDF links, publication PDFs, BibTeX pages, teaching, honors, and publications pages to exist in the generated output.

### Task 4: Archive inactive files and document the source of truth

**Files:**
- Create: `README.md`
- Create: `archive/README.md`
- Create: `archive/legacy-site/README.md`
- Create: `archive/cv-build/README.md`
- Move: root generated pages, legacy page variants, backups, standalone experiments, old styles, icon bundle, and Jekyll config under `archive/legacy-site/`
- Move: tracked CV auxiliary files and vendored package backups under `archive/cv-build/`
- Modify: `.gitignore`

**Step 1: Archive recoverably**

Keep historical material readable as ordinary files. Separate generated snapshots, design iterations, standalone experiments, and CV build artifacts.

**Step 2: Prevent renewed clutter**

Ignore Hugo output/locks and LaTeX intermediate files while continuing to track the active CV PDF.

**Step 3: Document the clean layout**

Describe the active source directories, build commands, date policy, font policy, and archive boundary in the root README. State clearly that `archive/` is retained for history and excluded from deployment.

### Task 5: Verify and publish

**Files:**
- Verify all changed and moved files.

**Step 1: Run full local validation**

Run the site contract test, existing teaching test, Hugo production build, HTML structure checks, internal-link checks, and `git diff --check` on active text sources.

**Step 2: Inspect the final change set**

Confirm all moves are intentional, no active asset is missing, and the main checkout has not changed during isolated implementation.

**Step 3: Integrate and deploy**

Commit the implementation branch, fast-forward `main`, push `origin/main`, wait for the GitHub Pages workflow, and verify the live homepage typography, month-only News dates, Professional Service, and CV/publication assets.
