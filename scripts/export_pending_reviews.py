from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = ROOT / "secrets" / "google-service-account.json"
SPREADSHEET_ID = "1ElrzP19vUd0PneizAZcKm6f5TxUzycJlBsUd0SVIJFw"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

REVIEW_SHEET = "\u932f\u984c\u8655\u7406\u8868"
DEFAULT_OUTPUT = ROOT / "outputs" / "pending_reviews.tsv"

HEADERS = [
    "\u56de\u5831\u6642\u9593",
    "\u984c\u76eeID",
    "\u984c\u5eab\u5206\u985e",
    "\u984c\u5eab\u4ee3\u865f",
    "\u984c\u865f",
    "\u4f7f\u7528\u8005\u56de\u5831",
    "\u554f\u984c\u985e\u578b",
    "\u67e5\u8b49\u72c0\u614b",
    "\u67e5\u8b49\u7d50\u679c",
    "\u4fee\u6b63\u7b54\u6848",
    "\u4fee\u6b63\u89e3\u6790",
    "\u5b98\u65b9\u4f86\u6e90",
    "\u8655\u7406\u72c0\u614b",
    "\u5099\u8a3b",
]


def get_service():
    if not SERVICE_ACCOUNT_FILE.exists():
        raise SystemExit(f"Missing credential file: {SERVICE_ACCOUNT_FILE}")
    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES,
    )
    return build("sheets", "v4", credentials=credentials)


def read_values(service, sheet_name: str, cell_range: str) -> list[list[str]]:
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range=f"'{sheet_name}'!{cell_range}")
        .execute()
    )
    return result.get("values", [])


def normalize_row(row: list[str], width: int) -> list[str]:
    return (row + [""] * width)[:width]


def is_pending(row: list[str]) -> bool:
    verify_status = row[7].strip() if len(row) > 7 else ""
    process_status = row[12].strip() if len(row) > 12 else ""
    return verify_status in {"", "\u5f85\u67e5\u8b49"} or process_status in {
        "",
        "\u5f85\u6574\u7406",
    }


def build_prompt(row_number: int, row: list[str]) -> str:
    payload = dict(zip(HEADERS, row))
    return "\n".join(
        [
            f"\u8a66\u7b97\u8868\u5217\u865f\uff1a{row_number}",
            "\u8acb\u67e5\u8b49\u9019\u7b46\u932f\u984c\u56de\u5831\uff0c\u5224\u65b7\u7b54\u6848\u6216\u89e3\u6790\u662f\u5426\u9700\u4fee\u6b63\u3002",
            "\u8acb\u56de\u586b\uff1a\u554f\u984c\u985e\u578b\u3001\u67e5\u8b49\u72c0\u614b\u3001\u67e5\u8b49\u7d50\u679c\u3001\u4fee\u6b63\u7b54\u6848\u3001\u4fee\u6b63\u89e3\u6790\u3001\u5b98\u65b9\u4f86\u6e90\u3001\u8655\u7406\u72c0\u614b\u3001\u5099\u8a3b\u3002",
            json.dumps(payload, ensure_ascii=False, indent=2),
        ]
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Export pending rows from \u932f\u984c\u8655\u7406\u8868 for AI review."
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="Output TSV path.",
    )
    parser.add_argument(
        "--include-all",
        action="store_true",
        help="Export all review rows instead of only pending rows.",
    )
    args = parser.parse_args()

    service = get_service()
    values = read_values(service, REVIEW_SHEET, "A:N")
    if not values:
        raise SystemExit("No review rows found.")

    rows = []
    for index, raw_row in enumerate(values[1:], start=2):
        row = normalize_row(raw_row, len(HEADERS))
        if not row[1].strip():
            continue
        if args.include_all or is_pending(row):
            rows.append([index, *row, build_prompt(index, row)])

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerow(["sheet_row", *HEADERS, "ai_prompt"])
        writer.writerows(rows)

    print(f"Review rows scanned: {max(len(values) - 1, 0)}")
    print(f"Rows exported: {len(rows)}")
    print(f"Output: {args.out}")

    for row in rows[:10]:
        print(f"- row {row[0]} | {row[2]} | {row[6][:40]}")


if __name__ == "__main__":
    main()
