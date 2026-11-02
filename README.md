# CreateYourJourney

A small, responsive minicab driver ledger that runs in a modern browser. It records trip fares, prints invoices, scans receipt photos, and tracks expenses. Data is stored in the browser on the device where it was entered.

## Free features

- Trip invoices with customer, pickup, destination, date, payment method and fare.
- Sequential invoice numbers starting at `INV000020`.
- Saved sole trader or LTD invoice identity and contact details, including trading name, address, company number and VAT number fields.
- Monthly, yearly and custom date reports for invoices or expenses, with customer/category filters and CSV export.
- Saved customer names and contact details, plus reusable invoice items with usual fares.
- A Bookings area that imports trip details from pasted booking emails or saved `.eml` / `.txt` files, then fills a draft invoice.
- Assistant attachments route receipt photos to expense scanning and booking emails to Bookings; uncertain scans ask you where to allocate them.
- Print or save an invoice as PDF using the browser's print dialog.
- Download invoices as PDF, or share them through the device's email/share sheet.
- Export all expenses to an editable Excel workbook with receipt photos embedded in the matching rows.
- Receipt photo capture on supported phones, with in-browser OCR to suggest merchant, date, amount and expense type.
- Voice input and typed task help using browser speech recognition and a local command helper.
- Income, expenses and estimated profit summaries; JSON export.
- Responsive layout and installable PWA support.

Receipt OCR, Excel export and PDF download use free open-source browser libraries loaded from public CDNs, so these actions need an internet connection. The helper is a basic command assistant, not a general-purpose LLM. No paid AI API is configured. Please verify every scanned receipt field before saving.

Invoice fields are escaped before printing, receipt previews accept raster image data only, and scan uploads are limited to 12 MB. This local version has no app password and does not encrypt browser-stored records; protect the Mac and iPhone with their device passcodes and keep exported backups private.

## Open on a computer

Open `index.html` in a browser. Most functions work directly; service-worker installation and offline caching require the app to be served from localhost or HTTPS.

## Install on iPhone

1. Put this folder on a free static HTTPS host (for example, a GitHub Pages site or another static web host). No server or paid subscription is needed for the app itself.
2. Open the resulting HTTPS address in Safari.
3. Tap **Share → Add to Home Screen**.
4. Open CreateYourJourney from the new Home Screen icon.

The phone keeps its own browser data. For manual cross-device sync, use **Settings → Sync with iCloud Drive → Save sync file**, save or replace the same `CreateYourJourney-sync.json` file in iCloud Drive, then use **Import and merge** on the other device. The backup includes trips, bookings, customers, expenses, receipt photos and settings. Repeat after updates to carry them back to the first device. Avoid making separate edits on both devices between syncs; this is not automatic background sync.

To email an invoice, use **Email** beside a trip. On supported phones this opens the share sheet with the PDF attached; otherwise the app downloads the PDF and opens a prefilled email so you can attach it. The app does not send email itself.
