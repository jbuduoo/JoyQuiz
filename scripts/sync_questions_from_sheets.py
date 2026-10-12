from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
QUESTION_DIR = ROOT / "assets" / "data" / "questions"
SERVICE_ACCOUNT_FILE = ROOT / "secrets" / "google-service-account.json"

TRUE_FALSE_SPREADSHEET_ID = "1cSgCPlDbGtUCUBOYqrYQVO0_985miQBItVVaAs2lYJ0"
MULTIPLE_CHOICE_SPREADSHEET_ID = "1Nmt7o8IwyCpYMXARoj5UwbImxQqFHycg_kJYs_AKDlI"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

ANSWER_MAP = {
    "O": "A",
    "X": "B",
    "TRUE": "A",
    "FALSE": "B",
    "是": "A",
    "否": "B",
    "1": "A",
    "2": "B",
    "3": "C",
    "4": "D",
    "5": "E",
}
OPTION_FIELDS = ("A", "B", "C", "D", "E")


def clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def column_index(headers: list[str], *candidates: str) -> int:
    normalized = [clean(header) for header in headers]
    for candidate in candidates:
        if candidate in normalized:
            return normalized.index(candidate)
    raise ValueError(f"Missing required column: {'/'.join(candidates)}")


def normalize_answer(raw_answer: str) -> str:
    parts = re.split(r"[,，、/ ]+", clean(raw_answer).upper())
    answers: list[str] = []
    for part in parts:
        if not part:
            continue
        answers.append(ANSWER_MAP.get(part, part))
    return ",".join(answers)


def get_values(service: Any, spreadsheet_id: str, sheet_name: str) -> list[list[str]]:
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=f"'{sheet_name}'!A1:Z1000")
        .execute()
    )
    return result.get("values", [])


def row_value(row: list[str], index: int) -> str:
    return clean(row[index]) if index < len(row) else ""


def parse_true_false_sheet(values: list[list[str]]) -> list[dict[str, str]]:
    if not values:
        return []
    headers = values[0]
    id_col = column_index(headers, "Id", "ID")
    type_col = column_index(headers, "Type")
    answer_col = column_index(headers, "Ans", "答案")
    question_col = column_index(headers, "Q", "試題")
    explanation_col = column_index(headers, "Exp", "詳解", "解析")

    questions: list[dict[str, str]] = []
    for row in values[1:]:
        question_id = row_value(row, id_col)
        question = row_value(row, question_col)
        if not question_id or not question:
            continue
        questions.append(
            {
                "Id": question_id,
                "Type": row_value(row, type_col) or "是非題",
                "Q": question,
                "A": "是",
                "B": "否",
                "Ans": normalize_answer(row_value(row, answer_col)),
                "Exp": row_value(row, explanation_col),
            }
        )
    return questions


def parse_multiple_choice_sheet(values: list[list[str]]) -> list[dict[str, str]]:
    if not values:
        return []
    headers = values[0]
    id_col = column_index(headers, "Id", "ID")
    type_col = column_index(headers, "Type")
    answer_col = column_index(headers, "Ans", "答案")
    question_col = column_index(headers, "Q", "題目")
    explanation_col = column_index(headers, "Exp", "詳解", "解析")
    option_cols = {
        option: index
        for index, header in enumerate(headers)
        if clean(header) in OPTION_FIELDS
        for option in [clean(header)]
    }

    questions: list[dict[str, str]] = []
    for row in values[1:]:
        question_id = row_value(row, id_col)
        question = row_value(row, question_col)
        if not question_id or not question:
            continue
        item = {
            "Id": question_id,
            "Type": row_value(row, type_col) or "選擇題",
            "Q": question,
            "Ans": normalize_answer(row_value(row, answer_col)),
            "Exp": row_value(row, explanation_col),
        }
        for option in OPTION_FIELDS:
            value = row_value(row, option_cols[option]) if option in option_cols else ""
            if value:
                item[option] = value
        questions.append(item)
    return questions


def write_json(path: Path, data: list[dict[str, str]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_series(
    service: Any,
    spreadsheet_id: str,
    prefix: str,
    parser: Any,
    dry_run: bool,
) -> list[tuple[str, int]]:
    synced: list[tuple[str, int]] = []
    for sheet_number in range(1, 15):
        series_no = f"{prefix}{sheet_number:03d}"
        values = get_values(service, spreadsheet_id, str(sheet_number))
        questions = parser(values)
        if not questions:
            raise RuntimeError(f"No questions found in sheet {sheet_number} for {series_no}")
        if not dry_run:
            write_json(QUESTION_DIR / f"{series_no}.json", questions)
        synced.append((series_no, len(questions)))
    return synced


def run_step(command: list[str]) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync JoyQuiz question JSON from Google Sheets.")
    parser.add_argument("--dry-run", action="store_true", help="Read Sheets and report counts without writing JSON.")
    parser.add_argument("--skip-release", action="store_true", help="Do not rebuild public/questions after syncing.")
    parser.add_argument("--skip-validate", action="store_true", help="Do not run question-bank validation after syncing.")
    args = parser.parse_args()

    if not SERVICE_ACCOUNT_FILE.exists():
        raise SystemExit(
            "Missing secrets/google-service-account.json. Share the Sheets with the service account first."
        )

    credentials = Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    service = build("sheets", "v4", credentials=credentials)

    results = []
    results.extend(sync_series(service, TRUE_FALSE_SPREADSHEET_ID, "A", parse_true_false_sheet, args.dry_run))
    results.extend(sync_series(service, MULTIPLE_CHOICE_SPREADSHEET_ID, "B", parse_multiple_choice_sheet, args.dry_run))

    print("Synced from Google Sheets" if not args.dry_run else "Dry run from Google Sheets")
    for series_no, count in results:
        print(f"- {series_no}: {count}")
    print(f"Total: {sum(count for _, count in results)}")
    sys.stdout.flush()

    if not args.dry_run and not args.skip_release:
        run_step([sys.executable, str(ROOT / "scripts" / "build_question_release.py")])
    if not args.dry_run and not args.skip_validate:
        run_step([sys.executable, str(ROOT / "scripts" / "validate_question_bank.py")])

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
