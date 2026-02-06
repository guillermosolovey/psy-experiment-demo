# You Just Did an Experiment

A single-page web app (HTML/CSS/JS) for a live lecture demo of random assignment, reaction time, and causal inference. Students complete a short task and immediately see aggregate class results.

## Files
- `index.html` – layout and view containers.
- `styles.css` – mobile-first styles with high contrast and large buttons.
- `script.js` – experiment logic, data handling, demo mode, and dashboard.
- `apps_script.gs` – Google Apps Script backend for a shared Google Sheet.

## Deploy the static site
Use any static hosting (GitHub Pages, Netlify, Vercel, etc.).

### GitHub Pages
1. Push this repo to GitHub.
2. In **Settings → Pages**, select your default branch and `/root`.
3. Visit the URL GitHub provides.

### Netlify
1. Drag-and-drop the folder into Netlify, or connect your repo.
2. Build command: none. Publish directory: `/`.

## Google Apps Script setup (shared “database”)
1. Create a new Google Sheet.
2. In the Sheet, go to **Extensions → Apps Script**.
3. Paste the contents of `apps_script.gs` into the editor.
4. Save the project.
5. Deploy: **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Copy the Web App URL.
7. Open `script.js` and paste the URL into `ENDPOINT_URL` at the top.

### Optional test
Visit your web app URL with `?limit=5` to confirm JSON returns.

## Demo mode (no endpoint)
If `ENDPOINT_URL` is empty, the app runs in **demo mode**. It simulates multi-user data so both student and dashboard views still show realistic aggregate results.

## Instructor dashboard
Open the dashboard at:
```
/?mode=dashboard
```
The dashboard shows aggregate results only, auto-refreshes every 5 seconds, and remembers the session code in localStorage.

## Notes
- Exclusion rule is displayed (150–2000 ms) but not enforced on trials outside the range.
- Data submitted: one row per participant, plus local download of trial-level CSV.
