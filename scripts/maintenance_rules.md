# Maintenance Rules

## Google API Access

Any Python script, scheduled job, Skill, or other automation that reads or writes
Google Drive, Google Sheets, Google Docs, or Gmail must use a Google Cloud
Service Account unless the user explicitly chooses another method.

Required practice:

1. Put the service account JSON key at:
   `secrets/google-service-account.json`
2. Share the target Google file or folder with the JSON file's `client_email`.
3. Grant only the permission needed for the task, usually Viewer for read-only
   checks and Editor for spreadsheet updates.
4. Keep all Google credentials and tokens out of git.
5. Do not paste service account private keys into chat, source files, logs, or
   documentation.

Reason:

Service accounts are stable for unattended Python maintenance jobs. They do not
depend on a personal browser session, Google cookies, or manual re-login, so they
are the default path for daily automated quiz-bank maintenance.
