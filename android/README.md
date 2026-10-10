# Pawket Android

This project is the Android shell for the hosted Pawket app. It adds Mobile
Wallet Adapter and native phone capabilities through a validated, origin-locked
bridge. The web application owns game rules and Solana sends.

See [Android build and release documentation](../docs/ANDROID.md) for setup,
signing, storage, security boundaries and physical-device validation.
`gradle.properties` owns the start URL, package ID and version; do not duplicate
them in this README.

```sh
./gradlew testDebugUnitTest lintDebug lintRelease
```

From the repository root, build the signed release with the publisher's
externally stored key:

```sh
PAWKET_ANDROID_KEYSTORE=/path/to/pawket-release.jks scripts/android-release.sh
```
