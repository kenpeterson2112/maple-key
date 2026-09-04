"""
Shared access to schema/resource-schema.json for the Python ingest scripts.

The same file backs shared/resource-schema.ts, so the vocabularies the
Researcher/Assessor waterfall and the enrichment routine write against are the
ones the client and api/ validate against. Never redeclare a vocabulary in an
ingest script — import it from here.
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SCHEMA_PATH = REPO_ROOT / "schema" / "resource-schema.json"

with SCHEMA_PATH.open(encoding="utf-8") as fh:
    SCHEMA = json.load(fh)

SCHEMA_VERSION = SCHEMA["schema_version"]

# ── Field contract ────────────────────────────────────────────────────────────

REQUIRED_FIELDS = SCHEMA["fields"]["required"]
OPTIONAL_FIELDS = SCHEMA["fields"]["optional"]
# Written only when true, omitted otherwise — never written as false.
FLAG_FIELDS = SCHEMA["fields"]["flags"]
NULLABLE_FIELDS = SCHEMA["fields"]["nullable"]
REQUIRED_METADATA_FIELDS = SCHEMA["metadata_fields"]["required"]
OPTIONAL_METADATA_FIELDS = SCHEMA["metadata_fields"]["optional"]

ALL_FIELDS = REQUIRED_FIELDS + OPTIONAL_FIELDS
ALL_METADATA_FIELDS = REQUIRED_METADATA_FIELDS + OPTIONAL_METADATA_FIELDS

# ── Vocabularies ──────────────────────────────────────────────────────────────

_VOCAB = SCHEMA["vocabularies"]

GRADE_BANDS = _VOCAB["grade_band"]
SUBJECTS = _VOCAB["subject"]
STRANDS = _VOCAB["strand"]
MODALITIES = _VOCAB["modality"]
RESOURCE_TYPES = _VOCAB["resource_type"]
ACCESS_TYPES = _VOCAB["access_type"]
ACCESSIBILITY_RATINGS = _VOCAB["accessibility"]
INSTRUCTIONAL_MODES = _VOCAB["instructional_modes"]
PEDAGOGICAL_FUNCTIONS = _VOCAB["pedagogical_function"]
LINK_STATUSES = _VOCAB["link_status"]
JURISDICTION_BY_PROVINCE = _VOCAB["jurisdiction_by_province"]
PROVINCES = list(JURISDICTION_BY_PROVINCE)
GRADE_LEVEL_RANGE = _VOCAB["grade_level"]

# Fields whose values must be drawn from a closed vocabulary. Arrays are checked
# element-wise; scalars are checked directly.
VOCABULARY_BY_FIELD = {
    "grade_band": GRADE_BANDS,
    "subject": SUBJECTS,
    "strand": STRANDS,
    "modality": MODALITIES,
    "resource_type": RESOURCE_TYPES,
    "access_type": ACCESS_TYPES,
    "accessibility": ACCESSIBILITY_RATINGS,
    "instructional_modes": INSTRUCTIONAL_MODES,
    "pedagogical_function": PEDAGOGICAL_FUNCTIONS,
    "province": PROVINCES,
}

ADMIN = SCHEMA["admin"]
INVARIANTS = SCHEMA["invariants"]


def is_valid_grade_level(value) -> bool:
    """Grades are ints 1..12 or the named entries ("K", "PreK")."""
    if isinstance(value, str):
        return value in GRADE_LEVEL_RANGE["named"]
    return (
        isinstance(value, int)
        and not isinstance(value, bool)
        and GRADE_LEVEL_RANGE["numeric_min"] <= value <= GRADE_LEVEL_RANGE["numeric_max"]
    )


def out_of_vocabulary(field: str, value) -> list:
    """Return the values of `field` that are not in its vocabulary ([] if fine)."""
    vocabulary = VOCABULARY_BY_FIELD.get(field)
    if vocabulary is None:
        return []
    values = value if isinstance(value, list) else [value]
    return [v for v in values if v not in vocabulary]
