from __future__ import annotations

import argparse
import json
import shutil
from collections import OrderedDict, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
QUESTION_DIR = ROOT / "assets" / "data" / "questions"
DEFAULT_INPUT = Path(r"C:\Users\wits\Documents\Codex\2026-10-08\referenced-chatgpt-conversation-this-is-an\outputs\questions.json")
BACKUP_ROOT = ROOT / "outputs" / "question_import_backups"

TYPE_GROUPS = OrderedDict([
    ("true_false", {"prefix": "A", "typeName": "是非題", "joyType": "是非題"}),
    ("single_choice", {"prefix": "B", "typeName": "選擇題", "joyType": "選擇題"}),
])

ANSWER_TO_JOY = {
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
    "A": "A",
    "B": "B",
    "C": "C",
    "D": "D",
    "E": "E",
}

OPTION_KEYS = ["A", "B", "C", "D", "E"]


def clean(value: Any) -> str:
    return str(value).strip() if value is not None else ""


def load_questions(path: Path) -> list[dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8-sig"))
    questions = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(questions, list):
        raise SystemExit("Input must be a JSON array or an object with a questions array.")
    return questions


def normalize_answer(raw_answer: Any) -> str:
    answer = clean(raw_answer).upper().replace("，", ",").replace(" ", "")
    parts = [part for part in answer.split(",") if part]
    normalized = []
    for part in parts:
        mapped = ANSWER_TO_JOY.get(part)
        if not mapped:
            raise ValueError(f"Unsupported answer value: {raw_answer}")
        normalized.append(mapped)
    return ",".join(normalized)


def convert_question(raw: dict[str, Any], local_id: int, joy_type: str) -> dict[str, str]:
    item: dict[str, str] = {
        "Id": str(local_id),
        "Type": joy_type,
        "Q": clean(raw.get("question") or raw.get("fullText")),
        "Ans": normalize_answer(raw.get("answer")),
        "Exp": clean(raw.get("explanation")),
    }

    options = raw.get("options") or []
    if not isinstance(options, list):
        raise ValueError(f"Question options must be a list: {raw.get('id')}")

    if raw.get("type") == "true_false":
        item["A"] = "是"
        item["B"] = "否"
    else:
        for index, option in enumerate(options):
            if index >= len(OPTION_KEYS):
                break
            if isinstance(option, dict):
                text = clean(option.get("text"))
            else:
                text = clean(option)
            if text:
                item[OPTION_KEYS[index]] = text

    if not item["Q"]:
        raise ValueError(f"Missing question text: {raw.get('id')}")
    if not item["Ans"]:
        raise ValueError(f"Missing answer: {raw.get('id')}")
    if not item["Exp"]:
        raise ValueError(f"Missing explanation: {raw.get('id')}")
    for answer in item["Ans"].split(","):
        if answer and not clean(item.get(answer)):
            raise ValueError(f"Answer {answer} has no option text: {raw.get('id')}")

    return item


def build_index(grouped: dict[str, OrderedDict[str, list[dict[str, str]]]]) -> dict[str, Any]:
    question_list_files = []
    question_files = [
        {"id": "sample", "displayName": "sample", "fileName": "sample.json", "isQuestionFile": True}
    ]

    for question_type, config in TYPE_GROUPS.items():
        prefix = config["prefix"]
        items = []
        for index, (category, questions) in enumerate(grouped[question_type].items(), start=1):
            series_no = f"{prefix}{index:03d}"
            file_name = f"{series_no}.json"
            items.append({"series_no": series_no, "displayName": category, "file": file_name})
            question_files.append({
                "id": series_no,
                "displayName": category,
                "fileName": file_name,
                "isQuestionFile": True,
            })
        question_list_files.append({"typeName": config["typeName"], "items": items})

    return {
        "config": {
            "enableImport": True,
            "enableTrash": False,
            "HomeScreenHeaderTitle": "政府採購法題庫",
            "enableSample": True,
            "isQuestionFile": False,
            "isQuestionListFile": True,
            "isFavorite": True,
            "isWrong": True,
            "isMock": True,
        },
        "questionFiles": question_files,
        "questionListFiles": question_list_files,
    }


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def backup_existing() -> Path:
    backup_dir = BACKUP_ROOT / datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in QUESTION_DIR.glob("*.json"):
        shutil.copy2(path, backup_dir / path.name)
    return backup_dir


def main() -> int:
    parser = argparse.ArgumentParser(description="Import normalized question JSON into JoyQuiz question-bank files.")
    parser.add_argument("input", nargs="?", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--dry-run", action="store_true", help="Validate and report without writing files.")
    parser.add_argument("--no-backup", action="store_true", help="Do not copy existing question files before writing.")
    args = parser.parse_args()

    questions = load_questions(args.input)
    grouped: dict[str, OrderedDict[str, list[dict[str, str]]]] = {
        question_type: OrderedDict() for question_type in TYPE_GROUPS
    }

    for raw in questions:
        if not isinstance(raw, dict):
            raise SystemExit("Each question must be an object.")
        question_type = clean(raw.get("type"))
        if question_type not in TYPE_GROUPS:
            raise SystemExit(f"Unsupported question type: {question_type}")
        category = clean(raw.get("category")) or "未分類"
        grouped[question_type].setdefault(category, [])

    converted: dict[str, OrderedDict[str, list[dict[str, str]]]] = {
        question_type: OrderedDict() for question_type in TYPE_GROUPS
    }
    counters: defaultdict[str, int] = defaultdict(int)
    for raw in questions:
        question_type = clean(raw.get("type"))
        category = clean(raw.get("category")) or "未分類"
        counters[(question_type, category)] += 1
        converted[question_type].setdefault(category, []).append(
            convert_question(raw, counters[(question_type, category)], TYPE_GROUPS[question_type]["joyType"])
        )

    total = sum(len(items) for groups in converted.values() for items in groups.values())
    print(f"Input: {args.input}")
    print(f"Total questions: {total}")
    for question_type, config in TYPE_GROUPS.items():
        type_total = sum(len(items) for items in converted[question_type].values())
        print(f"{config['typeName']}: {type_total} questions, {len(converted[question_type])} files")
        for index, (category, items) in enumerate(converted[question_type].items(), start=1):
            print(f"- {config['prefix']}{index:03d}.json {category}: {len(items)}")

    if args.dry_run:
        return 0

    QUESTION_DIR.mkdir(parents=True, exist_ok=True)
    if not args.no_backup:
        backup_dir = backup_existing()
        print(f"Backup: {backup_dir}")

    for question_type, config in TYPE_GROUPS.items():
        for index, (_, items) in enumerate(converted[question_type].items(), start=1):
            write_json(QUESTION_DIR / f"{config['prefix']}{index:03d}.json", items)

    write_json(QUESTION_DIR / "questions.json", build_index(converted))
    print(f"Written: {QUESTION_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
