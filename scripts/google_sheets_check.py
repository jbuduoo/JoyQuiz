from __future__ import annotations

import json
import sys
from pathlib import Path

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build


ROOT = Path(__file__).resolve().parents[1]
SERVICE_ACCOUNT_FILE = ROOT / "secrets" / "google-service-account.json"
SPREADSHEET_ID = "1ElrzP19vUd0PneizAZcKm6f5TxUzycJlBsUd0SVIJFw"
SPREADSHEETS = {
    "錯題回報": {
        "id": "1ElrzP19vUd0PneizAZcKm6f5TxUzycJlBsUd0SVIJFw",
        "read_range": "'錯題處理表'!A1:N3",
        "write_range": "'錯題處理表'!Y1",
    },
    "政府採購法_選擇題": {
        "id": "1Nmt7o8IwyCpYMXARoj5UwbImxQqFHycg_kJYs_AKDlI",
        "read_range": "index!A1:B3",
        "write_range": "index!Z1",
    },
    "政府採購法_是非題": {
        "id": "1cSgCPlDbGtUCUBOYqrYQVO0_985miQBItVVaAs2lYJ0",
        "read_range": "index!A1:B3",
        "write_range": "index!Z1",
    },
}
SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]


def main() -> None:
    if not SERVICE_ACCOUNT_FILE.exists():
        raise SystemExit(
            "Missing secrets/google-service-account.json. "
            "Create a Google Cloud service account key and share the spreadsheet with its client_email."
        )

    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=SCOPES,
    )
    service = build("sheets", "v4", credentials=credentials)

    if "--all" in sys.argv:
        for label, config in SPREADSHEETS.items():
            try:
                spreadsheet_id = config["id"]
                meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
                print(f"Connected: {meta['properties']['title']}")

                values = (
                    service.spreadsheets()
                    .values()
                    .get(spreadsheetId=spreadsheet_id, range=config["read_range"])
                    .execute()
                    .get("values", [])
                )
                print(json.dumps({label: values}, ensure_ascii=False, indent=2))

                if "--write-test" in sys.argv:
                    body = {"values": [["Python服務帳戶寫入測試"]]}
                    (
                        service.spreadsheets()
                        .values()
                        .update(
                            spreadsheetId=spreadsheet_id,
                            range=config["write_range"],
                            valueInputOption="RAW",
                            body=body,
                        )
                        .execute()
                    )
                    written = (
                        service.spreadsheets()
                        .values()
                        .get(spreadsheetId=spreadsheet_id, range=config["write_range"])
                        .execute()
                        .get("values", [])
                    )
                    print(f"Write test OK: {label} {config['write_range']} {written}")
            except Exception as exc:
                print(f"FAILED: {label}: {type(exc).__name__}: {exc}")
        return

    meta = service.spreadsheets().get(spreadsheetId=SPREADSHEET_ID).execute()
    print(f"Connected: {meta['properties']['title']}")

    values = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=SPREADSHEET_ID, range="'錯題處理表'!A1:N3")
        .execute()
        .get("values", [])
    )
    print(json.dumps(values, ensure_ascii=False, indent=2))

    if "--write-test" in sys.argv:
        body = {"values": [["Python服務帳戶寫入測試"]]}
        (
            service.spreadsheets()
            .values()
            .update(
                spreadsheetId=SPREADSHEET_ID,
                range="'錯題處理表'!Y1",
                valueInputOption="RAW",
                body=body,
            )
            .execute()
        )
        print("Write test OK: 錯題處理表!Y1")


if __name__ == "__main__":
    main()
