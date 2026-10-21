#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
keystore="${PAWKET_ANDROID_KEYSTORE:?Set PAWKET_ANDROID_KEYSTORE to the release keystore (never in the repository).}"
: "${ANDROID_HOME:?Set ANDROID_HOME to the Android SDK.}"
# apksigner runs the java on PATH.
if [ -n "${JAVA_HOME:-}" ]; then export PATH="$JAVA_HOME/bin:$PATH"; fi

if [ -z "${SOLANA_MOBILE_KEYSTORE_PASSWORD:-}" ] && command -v security >/dev/null 2>&1; then
  SOLANA_MOBILE_KEYSTORE_PASSWORD="$(security find-generic-password -s pawket-android-release-keystore -w)"
fi
export SOLANA_MOBILE_KEYSTORE_PASSWORD="${SOLANA_MOBILE_KEYSTORE_PASSWORD:?Set SOLANA_MOBILE_KEYSTORE_PASSWORD.}"

cd "$root"
if [ -n "$(git status --porcelain -- android public/.well-known)" ]; then
  echo "android/ or public/.well-known has uncommitted changes; build a release from a commit." >&2
  exit 1
fi
commit="$(git rev-parse HEAD)"
prop() { sed -n "s/^$1=//p" "$root/android/gradle.properties"; }

cd "$root/android"
./gradlew --console=plain clean assembleRelease \
  -PSOLANA_MOBILE_KEYSTORE_PATH="$keystore" \
  -PSOLANA_MOBILE_KEYSTORE_ALIAS=pawket

apk="$root/android/app/build/outputs/apk/release/app-release.apk"
tools="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"
badging="$("$tools/aapt2" dump badging "$apk")"
certs="$("$tools/apksigner" verify --print-certs "$apk")"
echo
echo "$badging" | grep -E "^package:|^minSdkVersion|^targetSdkVersion|^application-label:"
echo "$certs" | grep -E "certificate (DN|SHA-256)"
shasum -a 256 "$apk"

expected="package: name='$(prop SOLANA_MOBILE_APPLICATION_ID)' versionCode='$(prop SOLANA_MOBILE_VERSION_CODE)' versionName='$(prop SOLANA_MOBILE_VERSION_NAME)'"
case "$badging" in
  "$expected"*) ;;
  *) echo "The APK's package or version is not android/gradle.properties'." >&2; exit 1 ;;
esac
# apksigner labels signers by scheme or by number, depending on its version.
signers="$(echo "$certs" | sed -n 's/.*certificate SHA-256 digest: //p' | sort -u | tr a-f A-F | sed 's/../&:/g; s/:$//')"
for signer in ${signers:-none}; do
  if ! grep -q "\"$signer\"" "$root/public/.well-known/assetlinks.json"; then
    echo "The APK's signer $signer is not in public/.well-known/assetlinks.json, so Pawket's links would not open in it." >&2
    exit 1
  fi
done

origin="$(prop SOLANA_MOBILE_URL | sed -E 's#^(https?://[^/]+).*#\1#')"
hosted="$(curl -fsS --max-time 10 "$origin/api/health" 2>/dev/null | sed -n 's/.*"commit":"\([^"]*\)".*/\1/p' || true)"
echo "shell commit: $commit"
echo "hosted web commit ($origin): ${hosted:-unknown — read $origin/api/health}"
