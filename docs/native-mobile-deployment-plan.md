# Native Mobile Deployment Plan (iOS & Android)

Plan for packaging and publishing KidSudoku to the **Apple App Store (iPhone & iPad)** and **Google Play Store (Android)** while keeping the existing Vite + React + Tailwind codebase as the single source of truth.

---

## Approach: Capacitor

Use **[Capacitor](https://capacitorjs.com/)** to wrap the production `dist/` bundle inside native iOS (`WKWebView`) and Android (`WebView`) projects.

**Why Capacitor over alternatives:**

- **One pipeline for both stores:** Google Play allows Trusted Web Activity (TWA / Bubblewrap) around a hosted PWA, but Apple does not allow PWAs on the App Store. Capacitor targets both stores identically.
- **100% offline by default:** All JS, CSS, audio (`kidsudoku-japanese.mp3`), and self-hosted fonts ship inside the app bundle—ideal for kids on tablets and airplanes.
- **Native feel without a rewrite:** Native Taptic Engine haptics, native status bar theming, launch splash screen, and native storage/audio integration sit cleanly inside `src/platform/` (matching `docs/dune-architecture-plan.md`).

---

## Current Readiness Audit

| Area                 | Current State                                        | Gap for Native Stores                                                                                  |
| -------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Layout & safe areas  | `viewport-fit=cover`, `.safe-shell`, `min-h-dvh`     | Verify notch/Dynamic Island & iPad proportions                                                         |
| Fonts                | Loaded via Google Fonts HTTPS in `index.html`        | Must bundle locally for offline + zero-network privacy                                                 |
| Audio                | Web Audio SFX + bundled MP3 clip in `platform/sound` | Verify `WKWebView` & `AVAudioSession` mute-switch behavior                                             |
| Haptics              | `navigator.vibrate` in `src/platform/sound.ts`       | Ignored by iOS; wire `@capacitor/haptics` with web fallback                                            |
| Theme / Status Bar   | Syncs `<meta name="theme-color">` in `src/App.tsx`   | Sync native status bar color/style via `@capacitor/status-bar`                                         |
| Persistence          | `localStorage` via `src/platform/storage.ts`         | Works in Capacitor WebView; consider `@capacitor/preferences` if iOS storage eviction is ever observed |
| Icons & Splash       | `public/icons/{192,512,apple-touch-icon}.png`        | Need opaque `1024×1024` master icon + adaptive/splash assets                                           |
| External links / Ads | None                                                 | Keep zero ads/trackers/links for smooth Kids-policy review                                             |

---

## Phase 1: Offline & Native-Feel Prep (Web + Platform Layer)

Keep all native calls isolated behind `src/platform/` so web builds (`vp dev`, `vp build`) and tests continue working cleanly without Capacitor runtime errors.

1. **Bundle fonts locally (zero network requests):**
   - Install `@fontsource/fredoka` (weights 500, 600, 700) and `@fontsource/nunito` (weights 600, 700, 800) and import them in `src/main.tsx`.
   - Remove the `fonts.googleapis.com` and `fonts.gstatic.com` `<link>` tags from `index.html`.
   - Verify in DevTools Network tab (offline mode) that the app makes zero external requests.
2. **Add native haptics adapter (`src/platform/sound.ts` or `src/platform/haptics.ts`):**
   - When `Capacitor.isNativePlatform()` is true, map `HapticKind` to `@capacitor/haptics`:
     - `tap` → `Haptics.impact({ style: ImpactStyle.Light })`
     - `wrong` → `Haptics.notification({ type: NotificationType.Warning })`
     - `correct` → `Haptics.notification({ type: NotificationType.Success })`
     - `setComplete` → `Haptics.notification({ type: NotificationType.Success })` + follow-up light/medium impact
   - Keep the existing `navigator.vibrate` fallback on web.
3. **Sync native status bar with themes (`src/platform/nativeChrome.ts`):**
   - On theme change (`warm-paper`, `matcha-garden`, `cozy-dusk`):
     - Set status bar style (`Style.Light` on `warm-paper` / `matcha-garden`; `Style.Dark` on `cozy-dusk`) via `@capacitor/status-bar`.
     - On Android, also set `StatusBar.setBackgroundColor({ color })` to match `THEME_META_COLORS`.
   - Hide the native splash screen cleanly after first render via `SplashScreen.hide()`.
4. **Verify iOS audio session behavior:**
   - Decide whether sound effects should obey the physical iPhone mute switch (`.ambient` — respectful default for kids apps) or play through it (`.playback`).
   - Confirm `soundEngine.unlock()` and pre-decoded MP3 playback (`audio/kidsudoku-japanese.mp3`) work with zero latency inside `WKWebView`.

---

## Phase 2: Capacitor Scaffolding & Asset Pipeline

1. **Install Capacitor packages:**
   ```bash
   pnpm add @capacitor/core @capacitor/haptics @capacitor/status-bar @capacitor/splash-screen
   pnpm add -D @capacitor/cli @capacitor/assets @capacitor/ios @capacitor/android
   ```
2. **Initialize configuration (`capacitor.config.ts`):**
   - `appId`: `com.calmstead.kidsudoku` (confirm final reverse-DNS bundle ID before creating store records—it cannot be changed after publishing).
   - `appName`: `KidSudoku`
   - `webDir`: `dist`
   - Configure `SplashScreen` background color (`#FBF7EF`) and `ios.contentInset: "automatic"` / safe-area handling.
3. **Generate native projects:**
   ```bash
   pnpm run build
   pnpm exec cap add ios
   pnpm exec cap add android
   ```
4. **Generate icons & splash screens (`@capacitor/assets`):**
   - Prepare master assets under `resources/`:
     - `resources/icon-only.png` (`1024×1024`, opaque PNG, no alpha channel for Apple).
     - `resources/icon-foreground.png` & `resources/icon-background.png` (`1024×1024` for Android adaptive icons).
     - `resources/splash.png` & `resources/splash-dark.png` (`2732×2732`, `#FBF7EF` and `#1D222E`).
   - Run `pnpm exec capacitor-assets generate` to populate `ios/` and `android/` icon sets and splash screens.
5. **Add `justfile` recipes:**
   - `just cap-sync` → `pnpm run build && pnpm exec cap sync`
   - `just cap-android` → `pnpm run build && pnpm exec cap sync android && pnpm exec cap open android`
   - `just cap-ios` → `pnpm run build && pnpm exec cap sync ios && pnpm exec cap open ios`
6. **Repository hygiene:**
   - Commit `capacitor.config.ts`, `resources/`, `ios/`, and `android/` (excluding build caches, local signing keystores `*.jks`/`*.keystore`, and `keystore.properties` in `.gitignore`).

---

## Phase 3: Android Build & Google Play Store Deployment

Android builds and signs cleanly on Linux.

### Prerequisites

- **Google Play Console** developer account ($25 one-time registration).
- **JDK 17 or 21** + **Android Studio / Android SDK** installed locally.

### Build & Signing Steps

1. **Verify Gradle config (`android/app/build.gradle`):**
   - Confirm `applicationId "com.calmstead.kidsudoku"`.
   - Confirm `targetSdk` meets current Play Store requirement (API 35+).
   - Set `versionCode 1` and `versionName "1.0.0"`.
2. **Create an upload keystore (one-time, back up securely outside Git):**
   ```bash
   keytool -genkey -v -keystore kidsudoku-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
   ```
3. **Wire signing config** via untracked `android/keystore.properties` (and/or CI secrets) so `./gradlew bundleRelease` produces a signed **Android App Bundle** (`android/app/build/outputs/bundle/release/app-release.aab`).
4. **Device testing:** Install a release APK/AAB locally on a physical Android phone & tablet via `adb` / `bundletool` and test offline play, audio, haptics, drag-and-drop, rotation, and all 3 themes.

### Play Console Release Steps

1. Create the app in Google Play Console and enroll in **Play App Signing**.
2. Complete all **App Content** declarations:
   - **Privacy Policy URL** (static page stating zero data collected).
   - **Data Safety:** No user data collected or shared.
   - **Content Rating (IARC):** Everyone / 3+.
   - **Target Audience & Content (Families Policy):** Declare child audience (if targeting under 13) and confirm no ads, no in-app purchases, and no unapproved SDKs.
3. Upload store listing assets:
   - App icon (`512×512` PNG), Feature Graphic (`1024×500`), phone screenshots (min 2; ideally 4–6 showing 2×2, 2 Blank, 4×4, Settings, Stamps, Cozy Dusk), and 7"/10" tablet screenshots.
4. **Closed testing gate (personal accounts):**
   - New _personal_ Play Console accounts must run a **Closed Test with at least 12 opted-in testers continuously for 14 days** before Google unlocks Production publishing. (Organization accounts with a D-U-N-S number bypass this gate.)
5. Upload `.aab` → complete Closed Testing (if applicable) → submit to Production review (typically 2–7 days for first release).

---

## Phase 4: iOS Build & Apple App Store Deployment

iOS requires **macOS + Xcode** to compile and sign `.ipa` archives.

### Prerequisites

- **Apple Developer Program** membership ($99/year).
- **Build environment** (pick one):
  - **Option A — Mac with Xcode:** Fastest iteration, iOS Simulator, direct USB testing on your iPhone.
  - **Option B — Linux + Cloud CI:** GitHub Actions (`macos-latest`) with **Fastlane** (`match` for certificates/profiles + `pilot` for TestFlight upload), or **Codemagic** / **Ionic Appflow**.

### Build & Signing Steps

1. Open `ios/App/App.xcworkspace` in Xcode (`just cap-ios`).
2. Configure **Signing & Capabilities**:
   - Select your Apple Developer Team and verify Bundle Identifier (`com.calmstead.kidsudoku`).
   - Confirm Display Name (`KidSudoku`), Version (`1.0.0`), Build (`1`).
   - Select supported device families (**iPhone + iPad**) and orientations.
3. Review `ios/App/App/Info.plist`:
   - Confirm no unnecessary permission prompts (no camera, mic, location, tracking).
   - Set `ITSAppUsesNonExemptEncryption` to `NO` (avoids repeated export-compliance prompts on every TestFlight upload since the app makes no encrypted network calls).
4. Test on a physical iPhone (via Xcode USB or **TestFlight**):
   - Verify Taptic haptics, Web Audio + logo voice clip, mute switch behavior, drag-and-drop touch feel, Dynamic Island / home indicator safe areas, and cold offline launch in Airplane Mode.

### App Store Connect Release Steps

1. Create the App record in **App Store Connect** matching `com.calmstead.kidsudoku`.
2. Fill out metadata:
   - App name, subtitle (e.g., _Calm Math & Logic Squares_), description, keywords, Support URL, Privacy Policy URL.
   - Screenshots: iPhone 6.9"/6.7" and iPad 13" (can be automated cleanly via Playwright or Xcode Simulator).
   - **App Privacy ("Nutrition Label"):** Select **Data Not Collected**.
   - **Age Rating:** 4+ (decide whether to check **Made for Kids**—see policy checklist below).
3. Archive (`Product → Archive` or Fastlane `gym`) and upload to App Store Connect.
4. Run a quick internal **TestFlight** smoke test on a real iPhone.
5. Attach the verified build and **Submit for Review** (typically 1–3 days).

---

## Phase 5: Kids-App Policy & Privacy Checklist

Before submitting to either store, verify every item below:

- [ ] **Zero external network calls:** Fonts, audio, icons, and scripts are 100% bundled locally (verified in DevTools offline mode).
- [ ] **Zero third-party trackers / analytics / ads:** Keeps Apple Privacy Nutrition Label and Google Data Safety strictly "No data collected".
- [ ] **Hosted Privacy Policy & Support page:** Publish a simple static page (e.g. `calmstead.com/kidsudoku/privacy` or GitHub Pages) explicitly stating that KidSudoku stores puzzle progress locally on the device only and collects no personal information.
- [ ] **Parental Gate rule (Apple Kids Category, Guideline 1.3):** Keep zero external links inside the app. If a link to calmstead or support is ever added later, gate it behind an adult challenge (e.g., "Hold for 3 seconds" or a grown-up multiplication check).
- [ ] **Apple Guideline 4.2 (Minimum Functionality):** Native haptics, native status bar theming, offline bundle, multi-mode gameplay, stamps/themes, and tactile animations ensure the app behaves as a complete native game rather than a thin website wrapper.

---

## Suggested Atomic Implementation Sequence

Keep each phase verifiable with `just check` and `just build`:

1. **`feat(offline): self-host Fredoka and Nunito fonts`** — Add `@fontsource/fredoka` and `@fontsource/nunito`, remove Google Fonts CDN links from `index.html`, verify offline build.
2. **`feat(platform): add Capacitor native adapters with web fallbacks`** — Install Capacitor core/plugins, add `capacitor.config.ts`, wire `@capacitor/haptics`, `@capacitor/status-bar`, and `@capacitor/splash-screen` behind `src/platform/`.
3. **`chore(mobile): scaffold ios and android projects with generated assets`** — Add master icons/splashes under `resources/`, run `cap add ios` / `cap add android` / `capacitor-assets generate`, add `justfile` mobile recipes, update `.gitignore`.
4. **`ci(mobile): add release signing & store build pipelines`** — Configure Android `.aab` release build (`keystore.properties` template) and optional GitHub Actions `macos-latest` + Fastlane workflow for TestFlight uploads.
5. **`docs(store): add privacy policy page and store metadata/screenshots`** — Prepare Privacy Policy URL, store copy, and automated device screenshots before submitting to Play Console Closed Testing and App Store Connect.
