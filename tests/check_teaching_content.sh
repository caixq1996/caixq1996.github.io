#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Missing file: $path" >&2
    exit 1
  fi
}

require_contains() {
  local path="$1"
  local needle="$2"
  if ! rg -F --quiet -- "$needle" "$path"; then
    echo "Missing text in $path: $needle" >&2
    exit 1
  fi
}

require_file "$repo_root/content/teaching/_index.md"
require_file "$repo_root/layouts/teaching/list.html"
require_file "$repo_root/layouts/partials/teaching_full.html"
require_file "$repo_root/teaching/index.html"

require_contains "$repo_root/layouts/index.html" 'href="./teaching/index.html"'
require_contains "$repo_root/index.html" 'href=./teaching/index.html'
require_contains "$repo_root/layouts/index.html" 'Special Topics in Mechano-Informatics II'
require_contains "$repo_root/layouts/index.html" 'Special Lecture on Information Science IV'
require_contains "$repo_root/index.html" 'Special Topics in Mechano-Informatics II'
require_contains "$repo_root/index.html" 'Special Lecture on Information Science IV'

require_contains "$repo_root/layouts/index.html" '2026.04.08'
require_contains "$repo_root/layouts/index.html" 'An Introduction to Reinforcement Learning'
require_contains "$repo_root/layouts/index.html" '2026.04.22'
require_contains "$repo_root/index.html" '2026.04.08'
require_contains "$repo_root/index.html" '2026.04.22'
require_contains "$repo_root/index.html" 'Ochanomizu University'

require_contains "$repo_root/teaching/index.html" '2026 S1S2 (Graduate): Special Topics in Mechano-Informatics II at The University of Tokyo'
require_contains "$repo_root/teaching/index.html" '2026 Spring (Undergraduate/Graduate): Special Lecture on Information Science IV at Ochanomizu University'

require_contains "$repo_root/CV/en_caixq_cv.tex" 'Special Topics in Mechano-Informatics II'
require_contains "$repo_root/CV/en_caixq_cv.tex" 'Special Lecture on Information Science IV'
