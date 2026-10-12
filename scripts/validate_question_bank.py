from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
QUESTION_DIR = ROOT / "assets" / "data" / "questions"
INDEX_FILE = QUESTION_DIR / "questions.json"

REQUIRED_FIELDS = ("Id", "Q", "Ans", "Exp")
OPTION_FIELDS = ("A", "B", "C", "D", "E")
ANSWER_RE = re.compile(r"^[A-E](,[A-E])*$")


@dataclass
class Finding:
    severity: str
    location: str
    message: str


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON: {path} ({exc})") from exc


def clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def indexed_items(index: dict[str, Any]) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for group in index.get("questionListFiles", []) or []:
        type_name = clean(group.get("typeName"))
        for item in group.get("items", []) or []:
            normalized = {
                "typeName": type_name,
                "series_no": clean(item.get("series_no")),
                "displayName": clean(item.get("displayName")),
                "file": clean(item.get("file")),
            }
            key = (normalized["series_no"], normalized["file"])
            if key not in seen:
                seen.add(key)
                items.append(normalized)

    return items


def parse_answer(raw_answer: Any) -> list[str]:
    answer = clean(raw_answer).upper().replace("，", ",").replace(" ", "")
    if not answer:
        return []
    return answer.split(",")


def validate_index(index: dict[str, Any], files: set[str]) -> list[Finding]:
    findings: list[Finding] = []
    items = indexed_items(index)
    indexed_files = {item["file"] for item in items if item["file"]}

    if index.get("config", {}).get("isQuestionListFile") is True and not items:
        findings.append(Finding("error", "questions.json", "isQuestionListFile is true, but no questionListFiles items were found."))

    for item in items:
        location = f"questions.json:{item['series_no'] or '(no series_no)'}"
        if not item["series_no"]:
            findings.append(Finding("error", location, "Missing series_no."))
        if not item["displayName"]:
            findings.append(Finding("warning", location, "Missing displayName."))
        if not item["file"]:
            findings.append(Finding("error", location, "Missing file."))
        elif item["file"] not in files:
            findings.append(Finding("error", location, f"Referenced file does not exist: {item['file']}"))

    for file_name in sorted(files - indexed_files - {"sample.json"}):
        findings.append(Finding("warning", file_name, "Question file exists but is not listed in questions.json."))

    return findings


def validate_questions(path: Path, series_no: str | None) -> tuple[list[Finding], int]:
    findings: list[Finding] = []
    data = load_json(path)
    questions = data.get("questions") if isinstance(data, dict) else data

    if not isinstance(questions, list):
        return [Finding("error", path.name, "Question file must contain a JSON array or an object with a questions array.")], 0

    ids: list[int] = []
    seen_ids: set[str] = set()
    global_seen: set[str] = set()

    for row_index, question in enumerate(questions, start=1):
        location = f"{path.name} row {row_index}"
        if not isinstance(question, dict):
            findings.append(Finding("error", location, "Question row is not an object."))
            continue

        raw_id = clean(question.get("Id"))
        if not raw_id:
            findings.append(Finding("error", location, "Missing Id."))
        elif raw_id in seen_ids:
            findings.append(Finding("error", location, f"Duplicate Id inside file: {raw_id}"))
        else:
            seen_ids.add(raw_id)
            if raw_id.isdigit():
                ids.append(int(raw_id))
            else:
                findings.append(Finding("warning", location, f"Id is not numeric: {raw_id}"))

        if series_no and raw_id:
            global_id = f"{series_no}_{raw_id}"
            if global_id in global_seen:
                findings.append(Finding("error", location, f"Duplicate generated question id: {global_id}"))
            global_seen.add(global_id)

        for field in REQUIRED_FIELDS:
            if not clean(question.get(field)):
                findings.append(Finding("error", location, f"Missing or empty {field}."))

        answers = parse_answer(question.get("Ans"))
        normalized_answer = ",".join(answers)
        if answers and not ANSWER_RE.match(normalized_answer):
            findings.append(Finding("error", location, f"Invalid answer format: {question.get('Ans')}"))

        available_options = {field for field in OPTION_FIELDS if clean(question.get(field))}
        for answer in answers:
            if answer not in available_options:
                findings.append(Finding("error", location, f"Answer {answer} has no matching non-empty option."))

        prefix = (series_no or path.stem).upper()[:1]
        if prefix == "A":
            extra_options = [field for field in ("C", "D", "E") if clean(question.get(field))]
            if extra_options:
                findings.append(Finding("warning", location, f"True/false file has extra option(s): {', '.join(extra_options)}"))
            for answer in answers:
                if answer not in {"A", "B"}:
                    findings.append(Finding("error", location, f"True/false answer should be A or B, got {answer}."))

    if ids:
        ordered = sorted(set(ids))
        expected = list(range(1, max(ordered) + 1))
        missing = sorted(set(expected) - set(ordered))
        if missing:
            preview = ", ".join(str(value) for value in missing[:20])
            suffix = "..." if len(missing) > 20 else ""
            findings.append(Finding("warning", path.name, f"Missing sequence number(s): {preview}{suffix}"))
        if ids != sorted(ids):
            findings.append(Finding("warning", path.name, "Ids are not in ascending order."))

    return findings, len(questions)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate JoyQuiz question-bank JSON files.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures.")
    args = parser.parse_args()

    if not QUESTION_DIR.exists():
        raise SystemExit(f"Missing question directory: {QUESTION_DIR}")
    if not INDEX_FILE.exists():
        raise SystemExit(f"Missing index file: {INDEX_FILE}")

    index = load_json(INDEX_FILE)
    question_paths = sorted(path for path in QUESTION_DIR.glob("*.json") if path.name != "questions.json")
    file_names = {path.name for path in question_paths}
    index_items = indexed_items(index if isinstance(index, dict) else {})
    series_by_file = {item["file"]: item["series_no"] for item in index_items}

    findings: list[Finding] = []
    findings.extend(validate_index(index if isinstance(index, dict) else {}, file_names))

    total_questions = 0
    for path in question_paths:
        file_findings, count = validate_questions(path, series_by_file.get(path.name, path.stem))
        findings.extend(file_findings)
        total_questions += count

    errors = [finding for finding in findings if finding.severity == "error"]
    warnings = [finding for finding in findings if finding.severity == "warning"]

    print("Question bank validation")
    print(f"Files checked: {len(question_paths)}")
    print(f"Questions checked: {total_questions}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")

    for severity in ("error", "warning"):
        selected = [finding for finding in findings if finding.severity == severity]
        if not selected:
            continue
        print("")
        print(severity.upper())
        for finding in selected[:200]:
            print(f"- {finding.location}: {finding.message}")
        if len(selected) > 200:
            print(f"- ... {len(selected) - 200} more")

    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
