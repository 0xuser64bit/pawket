package app.pawket.android

import android.annotation.SuppressLint
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color as AndroidColor
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebSettings
import android.webkit.WebView
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import androidx.core.net.toUri
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen

/**
 * Pawket on Android: the hosted app in one WebView, and the few things a
 * phone does better — the wallet apps (Mobile Wallet Adapter, through the
 * shell's wallet-intent handling), the share sheet, the gallery, the
 * calendar, haptics and the back gesture. Nothing about a pet, a key or a
 * transaction lives here: the page and Solana keep all of that.
 */
class MainActivity : ComponentActivity() {
    /** Where Pawket is served from; nothing else loads inside the app. */
    lateinit var origin: String
        private set
    private val crashes = CrashWindow()
    private lateinit var startUrl: String
    private lateinit var bridge: PawketBridge

    private var webView by mutableStateOf<WebView?>(null)
    private var painted by mutableStateOf(false)
    private var failed by mutableStateOf(false)
    private var progress by mutableFloatStateOf(0f)
    /** The room the page is in, as it last said: its ground colour and whether it is a dark one. */
    private var ground by mutableStateOf<Pair<Int, Boolean>?>(null)
    private var created = 0L

    private val back =
        object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                val view = webView
                if (view == null || failed) return leave()
                // An open sheet or dialog closes first, then the page goes back, then Pawket goes to the background.
                view.evaluateJavascript(BACK_SCRIPT) { handled ->
                    if (handled == "true") return@evaluateJavascript
                    if (view.canGoBack()) view.goBack() else leave()
                }
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        val splash = installSplashScreen()
        super.onCreate(savedInstanceState)
        created = SystemClock.uptimeMillis()
        // The system splash holds until the page has drawn, or for 2.5s at most; then the loader below says what is happening.
        splash.setKeepOnScreenCondition { !painted && !failed && SystemClock.uptimeMillis() - created < SPLASH_HOLD_MS }
        applySystemBars(isNight())

        val url = BuildConfig.SOLANA_MOBILE_URL.trim().toUri()
        if (url.scheme != "https" && !(BuildConfig.DEBUG && url.scheme == "http")) {
            Log.e(TAG, "Refusing a start URL that is not https: $url")
            failed = true
        }
        startUrl = url.toString()
        origin = url.origin()
        bridge = PawketBridge(this)

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)
        if (!failed) {
            webView =
                makeWebView().also { view ->
                    // An app update may change the trusted origin. Never restore the previous host's page.
                    if (savedInstanceState == null || savedInstanceState.getString(SAVED_ORIGIN) != origin || view.restoreState(savedInstanceState) == null) {
                        view.loadUrl(launchUrl(intent))
                    }
                }
        }
        onBackPressedDispatcher.addCallback(this, back)
        setContent { Shell() }
        if (!failed) offerShortcuts()
    }

    /** Long-press the icon: home, today's round, the Park — each opens that page of Pawket's, nothing more. */
    private fun offerShortcuts() {
        val places =
            listOf(
                Triple("home", R.string.shortcut_home_short to R.string.shortcut_home_long, R.mipmap.ic_shortcut_home),
                Triple("playground", R.string.shortcut_playground_short to R.string.shortcut_playground_long, R.mipmap.ic_shortcut_playground),
                Triple("park", R.string.shortcut_park_short to R.string.shortcut_park_long, R.mipmap.ic_shortcut_park),
            )
        val shortcuts =
            places.map { (path, labels, icon) ->
                ShortcutInfoCompat
                    .Builder(this, path)
                    .setShortLabel(getString(labels.first))
                    .setLongLabel(getString(labels.second))
                    .setIcon(IconCompat.createWithResource(this, icon))
                    .setIntent(Intent(Intent.ACTION_VIEW, "$origin/$path".toUri(), this, MainActivity::class.java))
                    .build()
            }
        ShortcutManagerCompat.setDynamicShortcuts(this, shortcuts)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun makeWebView(): WebView =
        WebView(this).apply {
            layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            // The room's ground until the page paints over it: never a white flash.
            setBackgroundColor(getColor(R.color.pawket_ground))
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                allowFileAccess = false
                allowContentAccess = false
                mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
                javaScriptCanOpenWindowsAutomatically = false
                setSupportMultipleWindows(true)
                setSupportZoom(true)
                builtInZoomControls = true
                displayZoomControls = false
                loadWithOverviewMode = false
                useWideViewPort = false
                offscreenPreRaster = true
                textZoom = textZoomFor(resources.configuration)
                // The marker Mobile Wallet Adapter (>= 0.5.1) reads to treat this WebView as the official shell.
                userAgentString = "${userAgentString.trim()} $WEB_SHELL_MARKER"
            }
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, false)
            webViewClient = WebShellViewClient(this@MainActivity)
            webChromeClient = WebShellChromeClient(this@MainActivity)
            bridge.attach(this)
        }

    /** The page to open: a link into Pawket this app was handed, or home. */
    private fun launchUrl(intent: Intent?): String {
        val link = intent?.data
        return if (link != null && isTrusted(link)) link.toString() else startUrl
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        val link = intent.data ?: return
        if (isTrusted(link)) webView?.loadUrl(link.toString())
    }

    fun isTrusted(url: Uri): Boolean = url.origin() == origin

    /** Back to where Pawket starts. */
    fun loadStart() {
        webView?.loadUrl(startUrl)
    }

    /** Opens a link that is not Pawket's in the app that handles it — the browser, the Explorer, a wallet's site. */
    fun openOutside(url: Uri) {
        if (url.scheme != "http" && url.scheme != "https") return
        launch(Intent(Intent.ACTION_VIEW, url).addCategory(Intent.CATEGORY_BROWSABLE))
    }

    fun launch(intent: Intent): Boolean =
        try {
            startActivity(intent)
            true
        } catch (_: ActivityNotFoundException) {
            Log.w(TAG, "Nothing on this phone handles ${intent.data?.scheme ?: intent.action}")
            false
        } catch (_: SecurityException) {
            Log.w(TAG, "This phone refused ${intent.data?.scheme ?: intent.action}")
            false
        }

    fun loadInside(url: Uri) {
        if (isTrusted(url)) webView?.loadUrl(url.toString())
    }

    fun pageStarted() {
        failed = false
    }

    fun pagePainted() {
        painted = true
    }

    fun pageFailed() {
        failed = true
    }

    fun progressed(percent: Int) {
        progress = percent / 100f
    }

    /** The page's room changed: the bars around it take its ground, and its icons the right ink. */
    fun roomChanged(color: Int, dark: Boolean) {
        ground = color to dark
        applySystemBars(dark)
    }

    private fun applySystemBars(dark: Boolean) {
        val style =
            if (dark) {
                SystemBarStyle.dark(AndroidColor.TRANSPARENT)
            } else {
                SystemBarStyle.light(AndroidColor.TRANSPARENT, AndroidColor.TRANSPARENT)
            }
        enableEdgeToEdge(statusBarStyle = style, navigationBarStyle = style)
    }

    private fun isNight() = (resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    /**
     * The renderer died — out of memory, or killed. The page is all in the
     * renderer and every record is in storage or on Solana, so a new WebView
     * opens where the old one was, instead of the app closing with it.
     */
    fun rendererGone(view: WebView) {
        if (view != webView) return
        val url = view.url?.toUri()?.takeIf(::isTrusted)?.toString() ?: startUrl
        webView = null
        (view.parent as? ViewGroup)?.removeView(view)
        view.destroy()
        painted = false
        // A page that kills the renderer every time is not brought straight back into the same crash: the retry
        // screen waits for the player, and Try again starts from Pawket's first page.
        val again = crashes.bringBack(SystemClock.elapsedRealtime())
        webView = makeWebView().also { if (again) it.loadUrl(url) }
        if (!again) failed = true
    }

    private fun retry() {
        val view = webView ?: return
        failed = false
        progress = 0f
        if (view.url.isNullOrBlank() || view.url == "about:blank") view.loadUrl(startUrl) else view.reload()
    }

    /**
     * Back at the root goes home and keeps Pawket as it was — the platform's
     * own rule for a launcher's root since Android 12 — however Pawket was
     * opened (a link or a shortcut too), so coming back is instant, with the
     * page, the room and any send in flight still there.
     */
    private fun leave() {
        moveTaskToBack(true)
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        webView?.settings?.textZoom = textZoomFor(newConfig)
        if (ground == null) applySystemBars(isNight())
    }

    override fun onResume() {
        super.onResume()
        webView?.onResume()
    }

    override fun onPause() {
        // Hidden, not stopped: the page's timers and sockets keep running, so a
        // wallet app answering while Pawket is behind it is still heard.
        webView?.onPause()
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putString(SAVED_ORIGIN, origin)
        webView?.saveState(outState)
    }

    override fun onDestroy() {
        webView?.let { view ->
            (view.parent as? ViewGroup)?.removeView(view)
            view.destroy()
        }
        webView = null
        super.onDestroy()
    }

    @Composable
    private fun Shell() {
        val room = ground
        val background = room?.let { Color(it.first) } ?: colorResource(R.color.pawket_ground)
        Box(Modifier.fillMaxSize().background(background)) {
            webView?.let { view ->
                key(view) {
                    AndroidView(
                        factory = { view },
                        modifier = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing),
                    )
                }
            }
            if (failed) {
                Offline(onRetry = ::retry)
            } else if (!painted) {
                Opening(progress)
            }
        }
    }

    @Composable
    private fun Opening(progress: Float) {
        Column(
            Modifier.fillMaxSize().background(colorResource(R.color.pawket_ground)).windowInsetsPadding(WindowInsets.safeDrawing),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(painterResource(R.drawable.ic_launcher_foreground), contentDescription = null, modifier = Modifier.size(132.dp))
            Text(
                stringResource(R.string.loading),
                color = colorResource(R.color.pawket_ink_faint),
                fontSize = 15.sp,
            )
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier.padding(top = 20.dp).widthIn(max = 160.dp).fillMaxWidth(),
                color = colorResource(R.color.pawket_sun),
                trackColor = colorResource(R.color.pawket_sun_soft),
            )
        }
    }

    @Composable
    private fun Offline(onRetry: () -> Unit) {
        Column(
            Modifier
                .fillMaxSize()
                .background(colorResource(R.color.pawket_ground))
                .windowInsetsPadding(WindowInsets.safeDrawing)
                .padding(horizontal = 32.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(painterResource(R.drawable.ic_launcher_foreground), contentDescription = null, modifier = Modifier.size(112.dp))
            Text(
                stringResource(R.string.offline_title),
                color = colorResource(R.color.pawket_ink),
                fontSize = 22.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            )
            Text(
                stringResource(R.string.offline_body),
                color = colorResource(R.color.pawket_ink_faint),
                fontSize = 15.sp,
                lineHeight = 21.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp, bottom = 24.dp).widthIn(max = 360.dp),
            )
            Button(
                onClick = onRetry,
                shape = RoundedCornerShape(14.dp),
                colors =
                    ButtonDefaults.buttonColors(
                        containerColor = colorResource(R.color.pawket_sun),
                        contentColor = colorResource(R.color.pawket_on_sun),
                    ),
            ) {
                Text(stringResource(R.string.try_again), fontWeight = FontWeight.SemiBold)
            }
        }
    }

    companion object {
        const val TAG = "Pawket"
        const val WEB_SHELL_MARKER = "Solana Mobile Web Shell"
        private const val SPLASH_HOLD_MS = 2_500L
        private const val SAVED_ORIGIN = "pawket.origin"

        /** Asks the page to close its open sheet or dialog; true when it did. */
        private const val BACK_SCRIPT =
            "(function(){try{return typeof window.pawketBack==='function'&&window.pawketBack()===true}catch(e){return false}})()"

        private fun textZoomFor(configuration: Configuration) = (configuration.fontScale * 100).toInt().coerceIn(85, 200)
    }
}

/** What "the same site" means here: this URL's origin, as Android parsed it. */
fun Uri.origin(): String = originOf(scheme, host, port)

/** scheme://host[:port], lowercased, the default port left out; "" when there is no scheme or host. */
fun originOf(
    scheme: String?,
    host: String?,
    port: Int,
): String {
    val s = scheme?.lowercase() ?: return ""
    val h = host?.lowercase()?.takeIf { it.isNotEmpty() } ?: return ""
    val defaultPort = (s == "https" && port == 443) || (s == "http" && port == 80)
    return if (port == -1 || defaultPort) "$s://$h" else "$s://$h:$port"
}
