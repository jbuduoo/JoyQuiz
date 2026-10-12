from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "assets" / "data" / "questions"
OUTPUT_DIR = ROOT / "public" / "questions"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def question_count(path: Path) -> int:
    data = load_json(path)
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return len(data["questions"])
    return 0


def build_index_html(manifest: dict) -> str:
    rows = "\n".join(
        f"<tr><td>{item['id']}</td><td>{item['file']}</td><td>{item['count']}</td></tr>"
        for item in manifest["files"]
    )
    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{manifest['appName']} 題庫發布</title>
  <style>
    body {{ font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 32px; line-height: 1.5; }}
    table {{ border-collapse: collapse; width: 100%; max-width: 760px; }}
    th, td {{ border-bottom: 1px solid #ddd; padding: 8px 10px; text-align: left; }}
    code {{ background: #f3f3f3; padding: 2px 5px; border-radius: 4px; }}
  </style>
</head>
<body>
  <h1>{manifest['appName']} 題庫發布</h1>
  <p>版本：<code>{manifest['version']}</code></p>
  <p>更新時間：<code>{manifest['generatedAt']}</code></p>
  <p>題庫索引：<a href="./manifest.json">manifest.json</a></p>
  <p>完整題庫包：<a href="./latest.json">latest.json</a></p>
  <table>
    <thead><tr><th>代號</th><th>檔案</th><th>題數</th></tr></thead>
    <tbody>{rows}</tbody>
  </table>
</body>
</html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Build local question-bank release files.")
    parser.add_argument("--version", default=datetime.now().strftime("%Y.%m.%d"))
    args = parser.parse_args()

    if not SOURCE_DIR.exists():
        raise SystemExit(f"Missing source directory: {SOURCE_DIR}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    question_files = sorted(
        path for path in SOURCE_DIR.glob("*.json") if path.name != "questions.json"
    )
    files = []
    package_questions = {}

    for source in question_files:
        target = OUTPUT_DIR / source.name
        shutil.copyfile(source, target)
        data = load_json(source)
        package_questions[source.stem] = data
        files.append(
            {
                "id": source.stem,
                "file": source.name,
                "count": question_count(source),
            }
        )

    index_source = SOURCE_DIR / "questions.json"
    index_data = load_json(index_source)
    shutil.copyfile(index_source, OUTPUT_DIR / "questions.json")

    generated_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
    manifest = {
        "appName": "JoyQuiz 政府採購法題庫",
        "version": args.version,
        "generatedAt": generated_at,
        "indexFile": "questions.json",
        "latestFile": "latest.json",
        "files": files,
    }
    latest = {
        "manifest": manifest,
        "index": index_data,
        "questions": package_questions,
    }

    write_json(OUTPUT_DIR / "manifest.json", manifest)
    write_json(OUTPUT_DIR / "latest.json", latest)
    (OUTPUT_DIR / "index.html").write_text(build_index_html(manifest), encoding="utf-8")

    print(f"Built release: {OUTPUT_DIR}")
    print(f"Version: {manifest['version']}")
    print(f"Files: {len(files)}")
    print(f"Questions: {sum(item['count'] for item in files)}")


if __name__ == "__main__":
    main()
