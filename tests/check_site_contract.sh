#!/usr/bin/env bash
set -u -o pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hugo_bin="${HUGO_BIN:-hugo}"
build_dir="$(mktemp -d /tmp/caixq-site-contract.XXXXXX)"
failures=0

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  failures=$((failures + 1))
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || fail "missing file: ${path#$repo_root/}"
}

require_dir() {
  local path="$1"
  [[ -d "$path" ]] || fail "missing directory: ${path#$repo_root/}"
}

require_absent() {
  local path="$1"
  [[ ! -e "$path" ]] || fail "expected archived path at repository root: ${path#$repo_root/}"
}

require_contains() {
  local path="$1"
  local needle="$2"
  if ! grep -Fq -- "$needle" "$path"; then
    fail "missing text in ${path#$repo_root/}: $needle"
  fi
}

if [[ ! -x "$hugo_bin" ]] && ! command -v "$hugo_bin" >/dev/null 2>&1; then
  printf 'Hugo executable not found: %s\n' "$hugo_bin" >&2
  exit 1
fi

if ! "$hugo_bin" --gc --minify --source "$repo_root" --destination "$build_dir" >/tmp/caixq-site-contract-hugo.log 2>&1; then
  sed -n '1,240p' /tmp/caixq-site-contract-hugo.log >&2
  exit 1
fi

for output in \
  index.html \
  teaching/index.html \
  honors/index.html \
  publications/index.html \
  CV/en_caixq_cv.pdf \
  files/VPIL-neurips23.pdf \
  bib/2023-NeurIPS-VPIL.html \
  images/caixq.JPG \
  icons/favicon.ico; do
  require_file "$build_dir/$output"
done

require_contains "$build_dir/index.html" 'I was invited to serve as an Area Chair for ICLR 2027.'
require_contains "$build_dir/index.html" 'I attended ICML 2026 in Seoul, South Korea.'
require_contains "$build_dir/index.html" '<strong>Conference Reviewer:</strong> ICLR, NeurIPS, ICML, IJCAI, SDM, UAI, CCML, ECAI, CIKM'
require_contains "$build_dir/index.html" 'href="https://ieeexplore.ieee.org/xpl/RecentIssue.jsp?punumber=5962385">IEEE Transactions on Neural Networks and Learning Systems (TNNLS)</a>'
require_contains "$build_dir/index.html" 'href=https://link.springer.com/journal/10994>Machine Learning</a>'
require_contains "$build_dir/index.html" 'href=https://www.jmlr.org/tmlr/>Transactions on Machine Learning Research (TMLR)</a>'
if grep -Eq -- '<strong>Conference Reviewer:</strong>[^<]*[0-9]{4}' "$build_dir/index.html"; then
  fail 'conference reviewer list still displays years'
fi
require_contains "$build_dir/index.html" 'href=./publications/index.html>Publications</a>'
if grep -Fq -- 'href=./files/>files</a>' "$build_dir/index.html"; then
  fail 'homepage still links to the non-indexed files directory'
fi
require_contains "$build_dir/teaching/index.html" 'Special Topics in Mechano-Informatics II'
require_contains "$build_dir/publications/index.html" 'Aug. 16-19, 2025'
require_contains "$build_dir/posts/index.html" '<span>CV</span>'
require_contains "$build_dir/posts/index.html" 'href=https://caixq1996.github.io/CV/en_caixq_cv.pdf'
require_contains "$build_dir/posts/index.html" 'href=https://caixq1996.github.io/icons/favicon.svg'
if grep -Fq -- 'caixq1996.github.io/files/' "$build_dir/posts/index.html"; then
  fail 'PaperMod navigation still links to the non-indexed files directory'
fi

while IFS= read -r time_value; do
  if [[ ! "$time_value" =~ ^[0-9]{4}\.[0-9]{2}$ ]]; then
    fail "homepage time is not month precision: $time_value"
  fi
done < <(grep -oE -- '<time>[^<]+</time>' "$build_dir/index.html" | sed -E 's#</?time>##g')

require_file "$repo_root/layouts/partials/site_typography.html"
require_file "$repo_root/layouts/partials/extend_head.html"
require_file "$build_dir/css/site-font.css"
require_contains "$build_dir/css/site-font.css" '--site-font-family: "IBM Plex Sans", sans-serif'

if grep -RInE --include='*.html' -- 'IBM\+Plex\+Mono|IBM Plex Mono|ui-monospace|Menlo|Consolas|Monaco|font-family:[^;]*monospace' "$repo_root/layouts" >/tmp/caixq-site-contract-fonts.log; then
  sed -n '1,160p' /tmp/caixq-site-contract-fonts.log >&2
  fail 'active layouts still declare an alternate mono font'
fi

while IFS= read -r html_file; do
  if grep -Fq -- 'http-equiv=refresh' "$html_file"; then
    continue
  fi
  if ! grep -Fq -- '/css/site-font.css' "$html_file"; then
    fail "generated page lacks shared typography: ${html_file#$build_dir/}"
  fi
done < <(find "$build_dir" -type f -name '*.html' | sort)

require_dir "$repo_root/static"
for asset_dir in bib files icons images; do
  require_dir "$repo_root/static/$asset_dir"
  require_absent "$repo_root/$asset_dir"
done

require_file "$repo_root/README.md"
require_file "$repo_root/.github/workflows/hugo-pages.yml"
require_contains "$repo_root/.github/workflows/hugo-pages.yml" 'bash tests/check_teaching_content.sh'
require_contains "$repo_root/.github/workflows/hugo-pages.yml" 'bash tests/check_site_contract.sh'
require_file "$repo_root/archive/README.md"
require_file "$repo_root/archive/legacy-site/README.md"
require_file "$repo_root/archive/cv-build/README.md"
require_file "$repo_root/archive/legacy-site/generated/index.html"
require_file "$repo_root/archive/legacy-site/snapshots/index_pre.html"
require_file "$repo_root/archive/legacy-site/design-iterations/index_gemini_v6.html"
require_file "$repo_root/archive/legacy-site/generated/teaching/index.html"
require_file "$repo_root/archive/cv-build/artifacts/en_caixq_cv.log"

for legacy_path in \
  index.html \
  index_pre.html \
  index_old.html \
  index_master.html \
  index_gemini_v6.html \
  nutrition.html \
  nutrition-tracker.html \
  teaching \
  honors \
  publications \
  fundings; do
  require_absent "$repo_root/$legacy_path"
done

if [[ -e "$build_dir/archive" ]]; then
  fail 'archive directory leaked into deployed site'
fi

cv_public_files=$(find "$build_dir/CV" -type f | wc -l)
if [[ "$cv_public_files" -ne 1 ]]; then
  fail "deployed CV directory contains $cv_public_files files instead of only the PDF"
fi

if ! git -C "$repo_root" check-ignore --quiet --no-index CV/probe.aux; then
  fail 'CV auxiliary files are not ignored'
fi

if ((failures > 0)); then
  printf 'SITE_CONTRACT=FAIL (%d checks)\n' "$failures" >&2
  exit 1
fi

printf 'SITE_CONTRACT=PASS\n'
printf 'BUILD_DIR=%s\n' "$build_dir"
