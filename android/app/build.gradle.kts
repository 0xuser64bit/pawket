import java.net.URI

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
}

fun String.escapeForBuildConfig(): String = replace("\\", "\\\\").replace("\"", "\\\"")

val webShellUrl = providers.gradleProperty("SOLANA_MOBILE_URL").get().trim()
val webShellApplicationId = providers.gradleProperty("SOLANA_MOBILE_APPLICATION_ID").get().trim()
val webShellVersionCode = providers.gradleProperty("SOLANA_MOBILE_VERSION_CODE").get().trim().toInt()
val webShellVersionName = providers.gradleProperty("SOLANA_MOBILE_VERSION_NAME").get().trim()
require(webShellUrl.isNotEmpty() && webShellApplicationId.isNotEmpty() && webShellVersionName.isNotEmpty()) {
    "Pawket URL, application ID and version name must not be blank."
}
require(webShellVersionCode > 0) { "Pawket version code must be positive." }
val webShellSigningStoreFile =
    (findProperty("SOLANA_MOBILE_KEYSTORE_PATH") as String?)
        ?.trim()
        ?.ifBlank { null }
val webShellSigningStorePassword =
    (findProperty("SOLANA_MOBILE_KEYSTORE_PASSWORD") as String?)
        ?.trim()
        ?.ifBlank { null }
        ?: System
            .getenv("SOLANA_MOBILE_KEYSTORE_PASSWORD")
            ?.trim()
            ?.ifBlank { null }
val webShellSigningKeyAlias =
    (findProperty("SOLANA_MOBILE_KEYSTORE_ALIAS") as String?)
        ?.trim()
        ?.ifBlank { null }
val webShellSigningKeyPassword =
    (findProperty("SOLANA_MOBILE_KEY_PASSWORD") as String?)
        ?.trim()
        ?.ifBlank { null }
        ?: System
            .getenv("SOLANA_MOBILE_KEY_PASSWORD")
            ?.trim()
            ?.ifBlank { null }
val hasReleaseSigning =
    webShellSigningStoreFile != null &&
        webShellSigningStorePassword != null &&
        webShellSigningKeyAlias != null

android {
    namespace = "app.pawket.android"
    compileSdk {
        version = release(37)
    }

    defaultConfig {
        applicationId = webShellApplicationId
        // 29: pictures save through MediaStore with no storage permission.
        minSdk = 29
        targetSdk = 37
        versionCode = webShellVersionCode
        versionName = webShellVersionName

        buildConfigField("String", "SOLANA_MOBILE_URL", "\"${webShellUrl.escapeForBuildConfig()}\"")
        // The host whose links open in the app (verified by its /.well-known/assetlinks.json).
        manifestPlaceholders["pawketHost"] = URI(webShellUrl).host
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("webShellRelease") {
                storeFile = file(webShellSigningStoreFile!!)
                storePassword = webShellSigningStorePassword
                keyAlias = webShellSigningKeyAlias
                keyPassword = webShellSigningKeyPassword ?: webShellSigningStorePassword
            }
        }
    }

    buildTypes {
        debug {
            // Beside the release on one phone, with its own storage, and named so it is never mistaken for it.
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("webShellRelease")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.webkit)
    testImplementation(libs.junit)
}
