"""Load processed telemetry through the existing Electron backend API.

This script deliberately uses the public ingestion contract instead of importing
backend modules or writing to the database directly.
"""

from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from urllib.request import Request, urlopen


def get_json(url: str) -> object:
    with urlopen(url, timeout=10) as response:
        return json.load(response)


def post_json(url: str, payload: object) -> object:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urlopen(request, timeout=30) as response:
        return json.load(response)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument(
        "--csv",
        type=Path,
        default=Path("data/processed/telemetry_sample.csv"),
    )
    parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    with args.csv.open(newline="", encoding="utf-8") as handle:
        source_rows = list(csv.DictReader(handle))

    existing_consumers = get_json(f"{base_url}/consumers")
    existing_ids = {item["consumer_id"] for item in existing_consumers}
    processed_ids = {row["consumer_id"] for row in source_rows}
    already_loaded = processed_ids & existing_ids
    if already_loaded:
        print(
            f"Skipped: {len(already_loaded)} processed consumers already exist; "
            "refusing to duplicate their readings."
        )
        return

    accepted = 0
    for start in range(0, len(source_rows), args.batch_size):
        readings = []
        for row in source_rows[start : start + args.batch_size]:
            readings.append(
                {
                    "consumer_id": row["consumer_id"],
                    "timestamp": row["timestamp"],
                    "voltage": float(row["voltage"]),
                    "current": float(row["current"]),
                    "power": float(row["power"]),
                    "energy": float(row["energy"]),
                    "meter_status": row["meter_status"],
                    "communication_status": row["communication_status"],
                    "source": "CSV_UPLOAD",
                }
            )

        result = post_json(
            f"{base_url}/telemetry/readings", {"readings": readings}
        )
        accepted += result["accepted"]
        print(f"Accepted {accepted}/{len(source_rows)} readings")

    print(f"Loaded {accepted} readings for {len(processed_ids)} consumers.")


if __name__ == "__main__":
    main()
