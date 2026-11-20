# Android Deployment Plan (Google Play Store)

Platform-specific steps for building, signing, testing, and publishing KidSudoku to the **Google Play Store**.

> **Prerequisite:** Complete the shared offline prep, Capacitor core setup, and master assets in [`./common.md`](./common.md) first.

---

## Prerequisites

- **Google Play Console** developer account ($25 one-time registration).
- **JDK 17 or 21** + **Android Studio / Android SDK** (builds and signs natively on Linux—no macOS needed).
- Confirm Android SDK Platform & Build-Tools matching current Play Store target API requirements (**API 35+**).

---

## 1. Scaffold & Configure the Android Project

1. **Install Android platform package & generate `android/`:**
   ```bash
   pnpm add -D @capacitor/android
   pnpm run build
   pnpm exec cap add android
   pnpm exec capacitor-assets generate --android
   ```
2. **Add `justfile` helper recipe:**
   - `just cap-android` → `pnpm run build && pnpm exec cap sync android && pnpm exec cap open android`
3. **Verify Gradle settings (`android/app/build.gradle` & `android/variables.gradle`):**
   - `applicationId`: `"com.calmstead.kidsudoku"`
   - `targetSdkVersion`: `35` (or latest Play-mandated API level)
   - `minSdkVersion`: Capacitor default (API 23/24+)
   - `versionCode`: `1` (increment monotonically on every Play upload)
   - `versionName`: `"1.0.0"`
4. **Adaptive icon & edge-to-edge check:**
   - Verify generated `mipmap-anydpi-v26/ic_launcher.xml` adaptive icon renders cleanly in circle, squircle, and rounded-square masks.
   - Verify system status bar and gesture navigation bar contrast across `warm-paper`, `matcha-garden`, and `cozy-dusk` themes (including Android 15 edge-to-edge insets with `.safe-shell`).

---

## 2. Upload Keystore & Signed `.aab` Build

Google Play requires releases as a signed **Android App Bundle (`.aab`)** enrolled in **Play App Signing** (Google holds the final distribution key; you sign uploads with your upload key).

1. **Generate an upload keystore once (store securely outside Git, e.g., password manager + encrypted backup):**
   ```bash
   keytool -genkey -v \
     -keystore kidsudoku-upload.jks \
     -keyalg RSA -keysize 2048 \
     -validity 10000 \
     -alias upload
   ```
2. **Wire release signing in `android/app/build.gradle`** reading credentials from an untracked `android/keystore.properties` file (or environment variables in CI):
   ```properties
   # android/keystore.properties (gitignored!)
   storeFile=/path/to/kidsudoku-upload.jks
   storePassword=...
   keyAlias=upload
   keyPassword=...
   ```
3. **Build the signed App Bundle locally:**
   ```bash
   pnpm run build
   pnpm exec cap sync android
   cd android && ./gradlew bundleRelease
   ```
   Output artifact: `android/app/build/outputs/bundle/release/app-release.aab`.

---

## 3. On-Device Verification

Test the release build (not just debug!) on a physical Android phone and, if available, an Android tablet:

- Install via Android Studio or convert `.aab` with `bundletool build-apks --mode=universal` + `adb install`.
- Test checklist:
  - [ ] Cold launch in **Airplane Mode** (fonts `Fredoka` + `Nunito`, audio, and assets load cleanly).
  - [ ] Tactile haptics on number pad tap, wrong answer, solve, and set completion.
  - [ ] Web Audio marimba SFX + logo voice clip play cleanly and respect mute toggle.
  - [ ] Tap and touch drag-and-drop feel responsive across `2×2`, `2 Blank`, `4×4`, and `Daily`.
  - [ ] Portrait and landscape orientation + system back button behavior (closes open modals rather than abruptly exiting if desired—consider `@capacitor/app` `backButton` listener).
  - [ ] All 3 themes (`warm-paper`, `matcha-garden`, `cozy-dusk`) sync system status bar contrast cleanly.
  - [ ] Progress (`totalSolved`, `targetSum`, unlocked stamps/themes) persists across full app restarts.

---

## 4. Google Play Console Submission

1. **Create app & opt into Play App Signing** in Google Play Console.
2. **Complete App Content declarations:**
   - **Privacy Policy URL:** Link to the static page from [`./common.md`](./common.md).
   - **Data Safety:** Declare _No user data collected or shared_.
   - **Ads:** Declare _No, my app does not contain ads_.
   - **App Access:** All functionality available without login/credentials.
   - **Content Rating (IARC):** Complete questionnaire → Everyone / PEGI 3.
   - **Target Audience & Content (Families Policy):**
     - Select age groups (e.g. Under 5 / 6–8 / 9–12 if targeting young learners).
     - Confirm full Families Policy compliance (no ads, no unapproved SDKs, no personal data collection).
     - Optionally apply for the **Teacher Approved** badge once live.
3. **Upload Store Listing assets:**
   - App icon: `512×512` PNG (32-bit)
   - Feature graphic: `1024×500` PNG/JPEG
   - Phone screenshots: 4–6 clean captures (`2×2`, `2 Blank`, `4×4`, `Settings`, `Stamps`, `Cozy Dusk`)
   - 7-inch and 10-inch tablet screenshots (recommended—kids frequently play on tablets)
4. **Closed Testing Gate (New Personal Developer Accounts):**
   - Personal Play Console accounts created after Nov 2023 must run a **Closed Test with at least 12 opted-in testers continuously for 14 days** before Google unlocks Production access.
   - _(Organization accounts verified with a D-U-N-S number bypass this gate.)_
   - Plan this 14-day window early: upload the first `.aab` to a Closed Testing track, invite 12+ testers via email/Google Group, and have them opt in and keep the app installed for 14 days.
5. **Promote to Production & Submit for Review:**
   - Review typically takes 2–7 days for a first release (faster for subsequent updates).

---

## 5. Ongoing Update Loop

```bash
# 1. Bump versionCode & versionName in android/app/build.gradle
# 2. Build web bundle, sync into Android, build signed .aab
pnpm run check
pnpm run build
pnpm exec cap sync android
cd android && ./gradlew bundleRelease
# 3. Upload android/app/build/outputs/bundle/release/app-release.aab in Play Console
```

_(Note: Android also supports Bubblewrap/TWA wrapping a hosted HTTPS PWA, but Capacitor is used here so Android shares the exact offline bundle, native haptics, and build workflow with iOS.)_
