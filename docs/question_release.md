# Question Release

This is the first local version of the online question-bank release flow.

## Build Release Files

Run from the project root:

```powershell
C:\Users\wits\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe scripts\build_question_release.py
```

Generated files are written to:

```text
public/questions/
```

Important files:

- `public/questions/index.html`: local browser page
- `public/questions/manifest.json`: version and file list
- `public/questions/latest.json`: full bundled question bank
- `public/questions/*.json`: individual question-bank files

## Start Local Website

Run from the project root:

```powershell
C:\Users\wits\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m http.server 8787 --bind 127.0.0.1 --directory public
```

Then open:

```text
http://127.0.0.1:8787/questions/
```

Useful URLs:

```text
http://127.0.0.1:8787/questions/manifest.json
http://127.0.0.1:8787/questions/latest.json
```

## Current Rule

Google Sheets remain the editing/maintenance area.

Use Google Sheets as the source of truth, then generate JSON for the app.

## Sync From Google Sheets

Run from the project root after editing questions or explanations online:

```powershell
npm run sync:questions
```

This command reads:

- `政府採購法_是非題`: sheets `1` to `14` -> `A001.json` to `A014.json`
- `政府採購法_選擇題`: sheets `1` to `14` -> `B001.json` to `B014.json`

Then it rebuilds:

- `assets/data/questions/*.json`
- `public/questions/*.json`
- `public/questions/latest.json`
- `public/questions/manifest.json`

It also runs question-bank validation at the end.

For a read-only check without changing files:

```powershell
npm run sync:questions:dry
```

The sync requires:

```text
secrets/google-service-account.json
```

Both Google Sheets must be shared with the service account email.
