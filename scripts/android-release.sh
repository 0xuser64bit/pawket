#!/usr/bin/env bash
# Builds Pawket's signed release APK from android/ and prints what a release
# records: package, version, signer and SHA-256. See docs/ANDROID.md.
#
#   PAWKET_ANDROID_KEYSTORE=/path/to/pawket-release.jks scripts/android-release.sh
#
# Needs JDK 17+ (JAVA_HOME) and the Android SDK (ANDROID_HOME, with build-tools).
# The keystore's password comes from SOLANA_MOBILE_KEYSTORE_PASSWORD, or — on the
# Mac that made it — the login Keychain (service pawket-android-release-keystore).
# It is never passed on the command line, and never printed.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
keystore="${PAWKET_ANDROID_KEYSTORE:?Set PAWKET_ANDROID_KEYSTORE to the release keystore (never in the repository).}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK.}"
# apksigner runs the java on PATH; use the JDK that builds.
if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi

if [ -z "${SOLANA_MOBILE_KEYSTORE_PASSWORD:-}" ] && command -v security >/dev/null 2>&1; then
  SOLANA_MOBILE_KEYSTORE_PASSWORD="$(security find-generic-password -s pawket-android-release-keystore -w)"
fi
export SOLANA_MOBILE_KEYSTORE_PASSWORD="${SOLANA_MOBILE_KEYSTORE_PASSWORD:?Set SOLANA_MOBILE_KEYSTORE_PASSWORD.}"

cd "$root/android"
./gradlew --console=plain clean assembleRelease \
  -PSOLANA_MOBILE_KEYSTORE_PATH="$keystore" \
  -PSOLANA_MOBILE_KEYSTORE_ALIAS=pawket

apk="$root/android/app/build/outputs/apk/release/app-release.apk"
tools="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
echo
"$tools/aapt2" dump badging "$apk" | grep -E "^package:|^minSdkVersion|^targetSdkVersion|^application-label:"
"$tools/apksigner" verify --print-certs "$apk" | grep -E "certificate (DN|SHA-256)"
shasum -a 256 "$apk"
