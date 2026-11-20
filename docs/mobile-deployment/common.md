# Mobile Deployment — Common Setup (iOS & Android)

Shared architecture, offline prep, Capacitor scaffolding, and privacy/policy baseline for packaging KidSudoku as a native app.

Platform-specific build, signing, and store submission steps live in:

- **Android (Google Play Store):** [`./android-play-store.md`](./android-play-store.md)
- **iOS (Apple App Store):** [`./apple-app-store.md`](./apple-app-store.md)

---

## Approach: Capacitor

Wrap the existing Vite + React + Tailwind `dist/` production bundle with **[Capacitor](https://capacitorjs.com/)** inside native iOS (`WKWebView`) and Android (`WebView`) shells.

**Why Capacitor:**

- **One pipeline for both stores:** Android supports Trusted Web Activity (TWA / Bubblewrap) around a hosted PWA, but Apple does not allow PWAs on the App Store. Capacitor ships one offline codebase to both.
- **100% offline by default:** JS, CSS, audio (`audio/kidsudoku-japanese.mp3`), and self-hosted fonts live inside the app bundle—ideal for kids on tablets and airplanes.
- **Aligned with Dune layers:** Native bridges (haptics, status bar, splash screen) sit cleanly behind `src/platform/` with transparent web fallbacks, matching [`../dune-architecture-plan.md`](../dune-architecture-plan.md).

---

## Current Readiness Audit

| Area                   | Current State                                          | Action Needed                                                       |
| ---------------------- | ------------------------------------------------------ | ------------------------------------------------------------------- |
| Layout & safe areas    | `viewport-fit=cover`, `.safe-shell`, `min-h-dvh`       | Verify notch, Dynamic Island, navigation bars & tablet layouts      |
| Fonts                  | Loaded from Google Fonts CDN in `index.html`           | Bundle locally for offline play and zero-network privacy            |
| Audio                  | Web Audio SFX + bundled MP3 in `src/platform/sound.ts` | Verify inside native WebViews (see platform guides)                 |
| Haptics                | `navigator.vibrate` in `src/platform/sound.ts`         | Add `@capacitor/haptics` bridge with web fallback                   |
| Theme / Status Bar     | Syncs `<meta name="theme-color">` in `src/App.tsx`     | Sync native status bar via `@capacitor/status-bar`                  |
| Persistence            | `localStorage` via `src/platform/storage.ts`           | Works in Capacitor WebView; optional `@capacitor/preferences`       |
| Icons & Splash         | `public/icons/{192,512,apple-touch-icon}.png`          | Add master `1024×1024` icon + `2732×2732` splash under `resources/` |
| Ads / Trackers / Links | None                                                   | Keep zero ads/trackers/external links for smooth Kids review        |

---

## Step 1: Offline & Native-Feel Prep

Keep all Capacitor imports inside `src/platform/` so web builds (`just dev`, `just build`, `just check`) work cleanly without a native runtime.

1. **Self-host fonts (zero external network calls):**
   - Install `@fontsource/fredoka` (weights 500, 600, 700) and `@fontsource/nunito` (weights 600, 700, 800) and import them in `src/main.tsx`.
   - Remove the `fonts.googleapis.com` and `fonts.gstatic.com` `<link>` tags from `index.html`.
   - Verify in DevTools Network tab (Offline checked) that cold load makes **zero** external requests.
2. **Bridge native haptics (`src/platform/sound.ts` or `src/platform/haptics.ts`):**
   - When `Capacitor.isNativePlatform()` is true, map `HapticKind` to `@capacitor/haptics`:
     - `tap` → `Haptics.impact({ style: ImpactStyle.Light })`
     - `wrong` → `Haptics.notification({ type: NotificationType.Warning })`
     - `correct` → `Haptics.notification({ type: NotificationType.Success })`
     - `setComplete` → `Haptics.notification({ type: NotificationType.Success })` + follow-up impact
   - Retain `navigator.vibrate` fallback on web.
3. **Sync native status bar & splash screen (`src/platform/nativeChrome.ts`):**
   - On theme change (`warm-paper`, `matcha-garden`, `cozy-dusk`):
     - Call `StatusBar.setStyle(...)` (`Style.Light` for light paper themes, `Style.Dark` for `cozy-dusk`).
     - On Android, also call `StatusBar.setBackgroundColor({ color })` matching `THEME_META_COLORS`.
   - Call `SplashScreen.hide()` once React mounts to prevent a white flash.

---

## Step 2: Shared Capacitor Scaffolding & Assets

1. **Install core Capacitor dependencies:**
   ```bash
   pnpm add @capacitor/core @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen
   pnpm add -D @capacitor/cli @capacitor/assets
   ```
2. **Create `capacitor.config.ts`:**
   - `appId`: `com.calmstead.kidsudoku` _(confirm final reverse-DNS ID before first store submission—it cannot be changed later)._
   - `appName`: `KidSudoku`
   - `webDir`: `dist`
   - Configure `SplashScreen` background color (`#FBF7EF`) and manual hide (`launchAutoHide: false` or short duration after mount).
3. **Prepare master assets in `resources/`:**
   - `resources/icon-only.png` (`1024×1024`, opaque PNG, no transparency—required by Apple).
   - `resources/icon-foreground.png` & `resources/icon-background.png` (`1024×1024`, for Android adaptive icons).
   - `resources/splash.png` (`2732×2732`, `#FBF7EF` background) & `resources/splash-dark.png` (`2732×2732`, `#1D222E` background).
   - Once platforms are added, generate all native icon & splash sets via:
     ```bash
     pnpm exec capacitor-assets generate
     ```
4. **Shared `justfile` sync recipe:**
   - `just cap-sync` → `pnpm run build && pnpm exec cap sync`
5. **Repository hygiene (`.gitignore`):**
   - Commit `capacitor.config.ts`, `resources/`, `android/`, and `ios/` so native config and icons are reproducible.
   - Ignore native build outputs and secrets (`*.jks`, `*.keystore`, `android/keystore.properties`, `*.p12`, `*.mobileprovision`, `ios/App/build/`, `android/app/build/`).

---

## Step 3: Shared Privacy & Kids-App Baseline

Both Apple App Review and Google Play Families Policy scrutinize children's apps closely. Keep these invariants across releases:

- [ ] **Zero external network calls:** Fonts, audio, icons, and scripts are 100% bundled locally.
- [ ] **Zero analytics, ads, or third-party tracking SDKs:** Keeps Apple Privacy Nutrition Label and Google Play Data Safety strictly "No data collected or shared".
- [ ] **Hosted Privacy Policy & Support URL:** Publish a simple static page (e.g. `calmstead.com/kidsudoku/privacy` or GitHub Pages) stating that KidSudoku stores progress locally on-device only and collects no personal data.
- [ ] **No un-gated external links:** Keep zero outbound URLs inside the app. If a link (e.g., support or `calmstead.com`) is ever added later, protect it behind a **parental gate** (e.g., hold-for-3-seconds or grown-up multiplication challenge).

---

## Shared Implementation Sequence

1. **`feat(offline): self-host Fredoka and Nunito fonts`** — Add `@fontsource/*`, drop Google Fonts CDN links from `index.html`, verify offline build.
2. **`feat(platform): add Capacitor native adapters with web fallbacks`** — Install Capacitor core + plugins, add `capacitor.config.ts`, wire haptics, status bar, and splash screen under `src/platform/`.
3. **`chore(mobile): add master icons/splashes and scaffold native projects`** — Populate `resources/`, add platforms per [`./android-play-store.md`](./android-play-store.md) and [`./apple-app-store.md`](./apple-app-store.md), run `capacitor-assets generate`.
4. **`docs(store): publish Privacy Policy URL and capture store screenshots`** — Complete platform-specific signing, testing, and store submission checklists.
