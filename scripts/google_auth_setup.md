# Google Sheets Python Setup

目前 Codex 外掛可以讀取 Google Sheet，但缺少寫入權限；Python 也還沒有自己的 Google API 憑證。

依本專案維護規則，凡是 Python、排程、Skill 或自動化要連到 Google
Drive / Sheets / Docs / Gmail，預設都使用「服務帳戶」。

建議用「服務帳戶」讓每天自動跑的 Python 穩定讀寫：

1. 到 Google Cloud 建立或選擇一個專案。
2. 啟用 Google Sheets API。
3. 建立 Service Account。
4. 建立 JSON key，下載後放到：
   `secrets/google-service-account.json`
5. 打開 JSON，找到 `client_email`。
6. 把你的 Google 試算表分享給這個 `client_email`，權限給「編輯者」。
7. 安裝套件：
   `pip install -r requirements-maintenance.txt`
8. 測試：
   `python scripts/google_sheets_check.py`

如果測試成功，Python 就可以讀取試算表。下一步再加一個小範圍寫入測試，確認可更新指定儲存格。

詳細規則見 `scripts/maintenance_rules.md`。
