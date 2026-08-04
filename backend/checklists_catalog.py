"""Read-only catalog of harmonica.cloud checklists, per subdomain and location.

The data is taken from ../checklister's `checklists/<subdomain>/by_locations/
<locationId>/<Name>.csv` tree, which every subdomain has (`bare`/`combined`
exist only for subdomains with a shared canonical script, so they're not used
here). Pointing at that tree keeps chatui out of the business of talking to
harmonica.cloud for now; swapping this module for live
`GET /webhooks/v1/companies/{companyId}/checklist` calls is a separate step.
"""

import csv
import os
import re
from pathlib import Path
from typing import Dict, List, Optional

from dotenv import load_dotenv

load_dotenv()

CATALOG_DIR = Path(os.getenv("CHECKLISTS_DATA_DIR", "../../checklister/checklists"))

LOCATIONS_SUBDIR = "by_locations"

# Catalog names end up in filesystem paths, and they arrive from the browser.
SAFE_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")


def _safe_dir(*parts: str) -> Optional[Path]:
    """Resolve a path inside the catalog, or None if it escapes / doesn't exist."""
    if any(not SAFE_NAME.match(part) for part in parts):
        return None
    root = CATALOG_DIR.resolve()
    path = root.joinpath(*parts).resolve()
    if not path.is_relative_to(root) or not path.exists():
        return None
    return path


def _sorted_dirs(path: Path) -> List[str]:
    return sorted(p.name for p in path.iterdir() if p.is_dir() and SAFE_NAME.match(p.name))


def list_checklists(subdomain: str, location_id: str) -> List[str]:
    path = _safe_dir(subdomain, LOCATIONS_SUBDIR, location_id)
    if path is None:
        return []
    return sorted(p.stem for p in path.glob("*.csv") if SAFE_NAME.match(p.name))


def get_catalog() -> List[dict]:
    """Every subdomain, its locations, and the checklists each location has."""
    root = CATALOG_DIR.resolve()
    if not root.is_dir():
        return []
    catalog = []
    for subdomain in _sorted_dirs(root):
        locations_dir = _safe_dir(subdomain, LOCATIONS_SUBDIR)
        if locations_dir is None:
            continue
        catalog.append({
            "name": subdomain,
            "locations": [
                {"id": location_id, "checklists": list_checklists(subdomain, location_id)}
                for location_id in _sorted_dirs(locations_dir)
            ],
        })
    return catalog


def validate_scope(subdomain: str, locations: List[str], checklists: List[str]) -> Optional[str]:
    """None if the scope exists in the catalog, otherwise a reason it doesn't."""
    locations_dir = _safe_dir(subdomain, LOCATIONS_SUBDIR)
    if locations_dir is None:
        return f"unknown subdomain '{subdomain}'"
    known_locations = set(_sorted_dirs(locations_dir))
    for location_id in locations:
        if location_id not in known_locations:
            return f"unknown location '{location_id}' in '{subdomain}'"
    available = {name for location_id in locations for name in list_checklists(subdomain, location_id)}
    for checklist in checklists:
        if checklist not in available:
            return f"checklist '{checklist}' is not available for the selected locations"
    return None


def read_questions(subdomain: str, location_id: str, checklist: str) -> Optional[List[Dict[str, str]]]:
    """Rows of one checklist CSV, or None if that file isn't in the catalog."""
    path = _safe_dir(subdomain, LOCATIONS_SUBDIR, location_id, f"{checklist}.csv")
    if path is None or not path.is_file():
        return None
    with path.open(newline="", encoding="utf-8") as f:
        return [{(k or "").strip(): (v or "") for k, v in row.items()} for row in csv.DictReader(f)]
