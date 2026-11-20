# iOS Deployment Plan (Apple App Store)

Platform-specific steps for building, signing, testing, and publishing KidSudoku to the **Apple App Store (iPhone & iPad)**.

> **Prerequisite:** Complete the shared offline prep, Capacitor core setup, and master assets in [`./common.md`](./common.md) first.

---

## Prerequisites

- **Apple Developer Program** membership ($99/year).
- **Build environment** (iOS `.ipa` compilation and signing require macOS + Xcode):
  - **Option A — Mac with Xcode (recommended for first release):** Direct Simulator testing, Safari Web Inspector debugging of `WKWebView`, and USB installs on your iPhone/iPad.
  - **Option B — Linux + Cloud CI:** GitHub Actions (`macos-latest`) + **Fastlane** (`match` for certificates/provisioning profiles, `gym` to archive, `pilot` to upload to TestFlight), or **Codemagic** / **Ionic Appflow**.
  - _(Note: Even with Option B, you need an Apple Developer account and an App Store Connect API Key for headless uploads.)_

---

## 1. Scaffold & Configure the iOS Project

1. **Install iOS platform package & generate `ios/`:**
   ```bash
   pnpm add -D @capacitor/ios
   pnpm run build
   pnpm exec cap add ios
   pnpm exec capacitor-assets generate --ios
   ```
   _(On Linux, `cap add ios` scaffolds the project files; `pod install` / SPM resolution and Xcode builds run on macOS or in CI.)_
2. **Add `justfile` helper recipe (for macOS):**
   - `just cap-ios` → `pnpm run build && pnpm exec cap sync ios && pnpm exec cap open ios`
3. **Configure Xcode target (`ios/App/App.xcworkspace` → Target `App`):**
   - **Signing & Capabilities:** Select your Apple Developer Team; verify Bundle Identifier `com.calmstead.kidsudoku`.
   - **General:**
     - Display Name: `KidSudoku`
     - Version (`MARKETING_VERSION`): `1.0.0`
     - Build (`CURRENT_PROJECT_VERSION`): `1` (increment for every TestFlight/App Store upload)
     - Supported Destinations: **iPhone** and **iPad**
     - Orientations: Portrait + Landscape Left/Right (verify mobile landscape grid layout looks clean on iPhone SE/15/16 and iPad).
4. **Configure `ios/App/App/Info.plist`:**
   - Set `ITSAppUsesNonExemptEncryption` = `NO` (skips export-compliance questionnaires on every TestFlight build since KidSudoku makes no encrypted network requests).
   - Verify no unused privacy usage descriptions exist (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSLocationWhenInUseUsageDescription`, etc. should all be absent).
5. **App Icon validation:**
   - Ensure `AppIcon` (`1024×1024`) has **no alpha channel / transparency**—App Store Connect rejects transparent PNG icons.

---

## 2. iOS Runtime Details to Verify

1. **Taptic Engine Haptics:**
   - Verify `@capacitor/haptics` triggers crisp feedback on iPhone (remember `navigator.vibrate` is a no-op on iOS).
2. **`WKWebView` Audio & Hardware Mute Switch:**
   - Test both Web Audio synthesized marimba SFX and `audio/kidsudoku-japanese.mp3` playback inside `WKWebView` on a real iPhone (Simulator audio timing differs slightly from hardware).
   - Decide `AVAudioSession` behavior in `ios/App/App/AppDelegate.swift`:
     - `.ambient` (default, recommended for kids apps): respects the physical iPhone silent/mute switch and mixes nicely without interrupting parent audio.
     - `.playback`: plays audio even when the mute switch is on (only choose this if explicitly desired).
3. **Safe Areas & Gesture Conflicts:**
   - Verify `.safe-shell` clears the Dynamic Island / notch and bottom Home Indicator in both portrait and landscape.
   - Verify dragging number tiles near the bottom edge of the screen does not accidentally trigger the iOS Home Indicator swipe-up gesture (`touch-action: none` on `.num-key` already helps; test on a real iPhone).
4. **Offline Persistence:**
   - Verify `localStorage` survives force-quit and device reboot in `WKWebView`. If iOS storage eviction is ever observed under low disk space, swap `src/platform/storage.ts` to `@capacitor/preferences` (`UserDefaults`).

---

## 3. Physical Testing & TestFlight

1. Archive in Xcode (`Product → Archive`) or via CI (`fastlane gym` → `fastlane pilot`).
2. Upload to **App Store Connect → TestFlight**.
3. Install on a real iPhone (and iPad if available) via the TestFlight app and run a full smoke test in **Airplane Mode**:
   - [ ] Cold launch with no Wi-Fi/cellular (fonts, SFX, logo voice clip, confetti all work).
   - [ ] Taptic Engine haptics fire cleanly on taps, wins, and wrong answers.
   - [ ] All 4 modes (`2×2`, `2 Blank`, `4×4`, `Daily`), Settings modal (`5/10/20`, 5-star track), Stamps, and all 3 themes (`warm-paper`, `matcha-garden`, `cozy-dusk`) render and sync the status bar cleanly.

---

## 4. App Store Connect Submission

1. **Create App record** in App Store Connect with Bundle ID `com.calmstead.kidsudoku`.
2. **Metadata & Store Listing:**
   - Name: `KidSudoku` (or `KidSudoku — Calm Math Squares` if `KidSudoku` is taken globally on the App Store).
   - Subtitle, Promotional Text, Description, Keywords.
   - **Support URL** and **Privacy Policy URL** (from [`./common.md`](./common.md)).
   - **Screenshots:**
     - iPhone 6.9" / 6.7" (required; scales down to smaller iPhones automatically)
     - iPad 13" (required if iPad destination is enabled)
     - _(Tip: Capture clean, consistent screenshots across viewports via Playwright or Xcode Simulator.)_
3. **App Privacy ("Nutrition Label"):**
   - Select **No, we do not collect data from this app** → displays **Data Not Collected**.
4. **Age Rating & Kids Category:**
   - Complete the Age Rating questionnaire → **4+**.
   - Decide whether to opt into **Made for Kids (Kids Category — Guideline 1.3)**:
     - **Pros:** Higher discoverability for parents searching Kids / Education games.
     - **Rules:** Strictly zero third-party analytics/ads (already satisfied) and **no external links without a parental gate** (keep zero external links inside the app).
5. **App Review Notes (Guideline 4.2 — Minimum Functionality):**
   - Apple rejects thin website wrappers under Guideline 4.2. In _App Review Information → Notes_, briefly highlight that KidSudoku is a fully offline native puzzle game with four modes (`2×2`, `2 Blank`, `4×4`, `Daily`), adaptive visual hints, unlockable woodblock stamps & themes, synthesized audio, and native Taptic haptics.
6. Attach the verified TestFlight build and **Submit for Review** (typically 1–3 days).

---

## 5. Ongoing Update Loop

### From macOS

```bash
pnpm run check
pnpm run build
pnpm exec cap sync ios
pnpm exec cap open ios
# Bump Build number in Xcode -> Product -> Archive -> Distribute to App Store Connect
```

### From Linux via CI (Optional)

Add `.github/workflows/ios-testflight.yml` on `macos-latest` triggered by release tags (`v*`):

1. Install pnpm dependencies and run `pnpm run check && pnpm run build`.
2. Run `pnpm exec cap sync ios`.
3. Install signing certs/profiles via Fastlane `match` (App Store Connect API Key in GitHub Secrets).
4. Build `.ipa` (`gym`) and upload to TestFlight (`pilot`).
