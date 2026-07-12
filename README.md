# UN Campus Results Portal

A responsive two-interface examination results portal built with plain HTML, CSS, and JavaScript.

## Interfaces

- `index.html` — Student result search portal
- `admin.html` — Admin dashboard to add, edit, delete, import, and export student results

## Demo search

- Batch: `DIIT 01`
- NIC: `20001234567`

## How to run

Open `index.html` directly in a modern browser, or serve the folder with a local web server:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Data storage

This version stores records in the browser's `localStorage`, making it ideal for a functional prototype or local demonstration. Data entered on one browser/device will not automatically appear on another device.

For a production deployment, connect the interfaces to a secure backend such as Supabase, Firebase, MySQL/PHP, Node.js/Express, or Laravel. Add authenticated admin access, server-side validation, audit logs, and regular backups.

## Included features

- Student search by batch and NIC
- Attendance calculation and progress display
- Module-wise marks, grades, and pass/fail status
- Grading scale
- Admin dashboard and student management
- Batch management
- JSON import/export backup
- Success/error notifications and confirmation dialogs
- Live date and time
- Dark/light mode
- Responsive design and print-friendly result sheet
