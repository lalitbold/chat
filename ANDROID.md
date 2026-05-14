# Android packaging

The smallest Android build for this app is a Trusted Web Activity (TWA). It keeps the web app hosted on Firebase Hosting and ships a thin Android shell that opens the installed PWA without a browser address bar. This avoids bundling a separate WebView runtime, which is why it is usually much smaller than Capacitor/Cordova for an app like this.

## Recommended path: TWA with Bubblewrap

Prerequisites:

- Deploy the PWA to HTTPS, for example Firebase Hosting.
- Install Node.js, JDK, and Android command line tools or Android Studio.
- Choose the final Android package name, for example `com.yourcompany.chat`.

Build flow:

```powershell
cd C:\work\poc\chat
firebase deploy
npx @bubblewrap/cli init --manifest https://YOUR_FIREBASE_HOSTING_DOMAIN/manifest.webmanifest
npx @bubblewrap/cli build
```

Bubblewrap reads the web manifest and creates an Android project that can produce an APK/AAB.

## Digital Asset Links

A TWA must prove that the Android app and website belong together. After creating the Android signing key or enabling Play App Signing, copy `.well-known/assetlinks.example.json` to `.well-known/assetlinks.json` and replace:

- `package_name` with the final Android package name.
- `sha256_cert_fingerprints` with the SHA-256 certificate fingerprint from Play Console or your release keystore.

Deploy again:

```powershell
firebase deploy
```

The file must be reachable at:

```text
https://YOUR_FIREBASE_HOSTING_DOMAIN/.well-known/assetlinks.json
```

## Size guidance

- Prefer TWA for the first Android version.
- Avoid Capacitor/Cordova unless native device APIs are required.
- Keep Firebase loaded from CDN as this project already does; the Android shell stays tiny because app logic remains hosted.
- Keep images compressed and avoid adding large splash/background assets.
- Build an Android App Bundle (`.aab`) for Play Store distribution.

## When not to use TWA

Use a native Kotlin app only if you need deep Android integration, offline-first local storage beyond the current PWA cache, background services, widgets, or native push behavior that cannot be handled through the web app.
