# Alorix Global International

Corporate website, product catalogue, WhatsApp order cart, and B2B enquiry platform for **Alorix Global International**.

## Publishing on GitHub Pages

This repository is pre-configured with an automated GitHub Actions workflow (`.github/workflows/deploy-github-pages.yml`) and Vite SPA fallback (`404.html`, `.nojekyll`, and `CNAME`).

### 1. Push to GitHub

Push this project to the `main` branch of your GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit: Alorix Global International website"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Open your repository on GitHub and go to **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Go to the **Actions** tab and verify **Deploy to GitHub Pages** completes cleanly.
4. Your site will be live at the URL shown in the workflow summary (`https://<your-username>.github.io/<your-repo>/` or your custom domain).

### 3. Custom Domain (`www.alorixglobalinternational.com`)

A `CNAME` file is already included at the repository root and copied into `dist/` during builds.
To activate your custom domain on GitHub Pages:

1. Point your domain's DNS `CNAME` record for `www` to `<your-username>.github.io`.
2. In GitHub **Settings → Pages → Custom domain**, enter `www.alorixglobalinternational.com` and enable **Enforce HTTPS**.
3. Re-run **Actions → Deploy to GitHub Pages** (it automatically adjusts `VITE_BASE_PATH` to `/`).

### 4. Optional: Connect Full-Stack Backend (`/admin` & Live Enquiries)

GitHub Pages hosts static frontend files. When published statically without a backend:
- All product pages, About page, 2D Trade Map, WhatsApp Order Cart, and `mailto:support@alorixglobalinternational.com` enquiry fallback work directly in the browser.
- To enable `/admin`, live WebSocket Team Chat, and server-side enquiry archiving on your GitHub Pages site, host `server.ts` on a Node.js host (Render, Railway, Fly.io, or VPS), set `CORS_ORIGIN` on the backend to your GitHub Pages / custom domain origin, and add repository variable `VITE_API_BASE_URL` in **Settings → Secrets and variables → Actions → Variables**.

### Troubleshooting: "404 There isn't a GitHub Pages site here."

If GitHub shows this 404 page when you open your URL, check these 4 items:

1. **Push the latest files to GitHub (`main` or `master`)**: The updated `.github/workflows/deploy-github-pages.yml` must be on GitHub so the build runs cleanly.
2. **Set Pages Source to GitHub Actions**: Open **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions** (do *not* use "Deploy from a branch").
3. **Check the Actions tab**: Open **Actions → Deploy to GitHub Pages** and make sure both `build` and `deploy` jobs have green checkmarks. Also ensure the repository is **Public** (free GitHub accounts do not support Pages on private repos).
4. **Check Custom Domain (`www.alorixglobalinternational.com`)**: If you are opening `www.alorixglobalinternational.com` directly, make sure **Settings → Pages → Custom domain** is set to `www.alorixglobalinternational.com` and your DNS `CNAME` points to `<your-username>.github.io`. Until DNS is configured, open the `https://<your-username>.github.io/<your-repo>/` URL shown in the workflow's `deploy` job summary.

## Local Development

```bash
npm install
npm run dev
```

Build static output locally:

```bash
npm run build
```
