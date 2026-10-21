#!/usr/bin/env python3
"""Threat-intelligence feed check for the pinned dependencies (stdlib only).

Collect : OSV.dev (GitHub advisories, PyPI/npm advisories) + CISA Known Exploited Vulnerabilities.
Process : pinned versions from backend/requirements.txt and frontend/package-lock.json.
Analyse : severity, known-exploited flag, fixed version.
Output  : prioritised table. Exit 1 on any known-exploited hit or on HIGH/CRITICAL with a fix.
Usage   : python3 scripts/advisory_scan.py [--json]
"""
import json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
RANK = {"CRITICAL": 4, "HIGH": 3, "MODERATE": 2, "MEDIUM": 2, "LOW": 1}


def http(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:  # nosec B310 - fixed https URLs
        return json.load(r)


def pinned():
    out = []
    for line in (ROOT / "backend/requirements.txt").read_text().splitlines():
        m = re.match(r"^([A-Za-z0-9_.-]+)(?:\[.*\])?==([^\s;#]+)", line.strip())
        if m:
            out.append(("PyPI", m[1], m[2], False))
    lock = json.loads((ROOT / "frontend/package-lock.json").read_text())
    for path, meta in lock.get("packages", {}).items():
        if path.startswith("node_modules/") and meta.get("version"):
            out.append(("npm", path.rsplit("node_modules/", 1)[1], meta["version"], bool(meta.get("dev"))))
    return out


def main():
    deps = pinned()
    batch = http("https://api.osv.dev/v1/querybatch", {"queries": [
        {"package": {"name": n, "ecosystem": e}, "version": v} for e, n, v, _ in deps]})["results"]
    try:
        kev = {v["cveID"] for v in http(KEV_URL)["vulnerabilities"]}
    except Exception as exc:  # feed outage must not hide the OSV result
        print(f"warning: KEV feed unavailable ({exc})", file=sys.stderr)
        kev = set()
    rows, seen = [], {}
    for (eco, name, ver, dev), res in zip(deps, batch):
        for v in res.get("vulns", []):
            if v["id"] not in seen:
                seen[v["id"]] = http(f"https://api.osv.dev/v1/vulns/{v['id']}")
            d = seen[v["id"]]
            sev = (d.get("database_specific", {}).get("severity") or "UNKNOWN").upper()
            fixed = sorted({e["fixed"] for a in d.get("affected", []) for r in a.get("ranges", [])
                            for e in r.get("events", []) if "fixed" in e})
            cves = [a for a in d.get("aliases", []) if a.startswith("CVE-")]
            rows.append({"eco": eco, "package": name, "version": ver, "dev": dev, "id": d["id"],
                         "severity": sev, "kev": bool(kev & set(cves)), "cves": cves,
                         "fixed": fixed[:3], "summary": (d.get("summary") or "")[:80]})
    rows.sort(key=lambda r: (-r["kev"], -RANK.get(r["severity"], 0), r["package"]))
    if "--json" in sys.argv:
        print(json.dumps(rows, indent=1))
    else:
        print(f"{len(deps)} pinned packages checked, {len(rows)} advisories, {sum(r['kev'] for r in rows)} known exploited")
        for r in rows:
            print(f"{'KEV ' if r['kev'] else '    '}{r['severity']:9} {r['eco']:4} {r['package']}@{r['version']}"
                  f"{' (dev)' if r['dev'] else ''}  {r['id']}  fix: {','.join(r['fixed']) or 'none'}  {r['summary']}")
    bad = [r for r in rows if r["kev"] or (RANK.get(r["severity"], 0) >= 3 and r["fixed"])]
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
