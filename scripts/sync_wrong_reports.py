from __future__ import annotations

import argparse
import re
from pathlib import Path

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = ROOT / "secrets" / "google-service-account.json"
SPREADSHEET_ID = "1ElrzP19vUd0PneizAZcKm6f5TxUzycJlBsUd0SVIJFw"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]

RAW_SHEET = "回報原始資料"
REVIEW_SHEET = "錯題處理表"

REVIEW_HEADER = [
    "回報時間",
    "題目ID",
    "題庫分類",
    "題庫代號",
    "題號",
    "使用者回報",
    "問題類型",
    "查證狀態",
    "查證結果",
    "修正答案",
    "修正解析",
    "官方來源",
    "處理狀態",
    "備註",
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


def parse_question_id(question_id: str) -> tuple[str, str, str]:
    match = re.match(r"^(.*)_([AB]\d{3})_(\d+)$", question_id.strip())
    if not match:
        return "", "", ""
    return match.group(1), match.group(2), match.group(3)


def normalize_cell(value: str | None) -> str:
    return (value or "").replace("\r\n", " ").replace("\n", " ").strip()


def raw_row_to_review_row(raw_row: list[str]) -> list[str] | None:
    timestamp = normalize_cell(raw_row[0] if len(raw_row) > 0 else "")
    report = normalize_cell(raw_row[1] if len(raw_row) > 1 else "")
    question_id = normalize_cell(raw_row[2] if len(raw_row) > 2 else "")

    if not timestamp or not question_id:
        return None

    category, code, number = parse_question_id(question_id)
    return [
        timestamp,
        question_id,
        category,
        code,
        number,
        report,
        "待判斷",
        "待查證",
        "",
        "",
        "",
        "",
        "待整理",
        "",
    ]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Sync Google Form wrong-question reports into 錯題處理表."
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Append new rows. Without this flag, only prints a dry-run summary.",
    )
    args = parser.parse_args()

    service = get_service()
    raw_values = read_values(service, RAW_SHEET, "A:C")
    review_values = read_values(service, REVIEW_SHEET, "A:N")

    if not raw_values:
        raise SystemExit("No raw report rows found.")

    existing_keys = {
        (row[0].strip(), row[1].strip())
        for row in review_values[1:]
        if len(row) >= 2 and row[0].strip() and row[1].strip()
    }

    new_rows: list[list[str]] = []
    skipped = 0
    for raw_row in raw_values[1:]:
        review_row = raw_row_to_review_row(raw_row)
        if review_row is None:
            skipped += 1
            continue
        key = (review_row[0], review_row[1])
        if key in existing_keys:
            continue
        new_rows.append(review_row)

    print(f"Raw rows: {max(len(raw_values) - 1, 0)}")
    print(f"Existing review rows: {max(len(review_values) - 1, 0)}")
    print(f"New rows to append: {len(new_rows)}")
    print(f"Skipped malformed rows: {skipped}")

    for row in new_rows[:10]:
        print(f"- {row[0]} | {row[1]} | {row[5][:40]}")

    if not args.write:
        print("Dry run only. Re-run with --write to append rows.")
        return

    if not new_rows:
        print("Nothing to append.")
        return

    (
        service.spreadsheets()
        .values()
        .append(
            spreadsheetId=SPREADSHEET_ID,
            range=f"'{REVIEW_SHEET}'!A:N",
            valueInputOption="USER_ENTERED",
            insertDataOption="INSERT_ROWS",
            body={"values": new_rows},
        )
        .execute()
    )
    print(f"Appended {len(new_rows)} row(s) to {REVIEW_SHEET}.")


if __name__ == "__main__":
    main()
