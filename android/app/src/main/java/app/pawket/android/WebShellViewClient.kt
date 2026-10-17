package app.pawket.android

import android.content.Intent
import android.graphics.Bitmap
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.net.toUri

/**
 * What may load inside Pawket: Pawket's own origin, and nothing else. A
 * wallet-intent URL starts the wallet app (Mobile Wallet Adapter); another
 * site opens in the browser; every other scheme — file:, content:, data: —
 * goes nowhere.
 */
class WebShellViewClient(private val activity: MainActivity) : WebViewClient() {
    override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest,
    ): Boolean {
        val url = request.url
        // Pawket has no frames of its own, and a frame never reaches the bridge (it is main-frame only); still,
        // nothing from another site is drawn inside the app, where no address bar would say whose it is.
        if (!request.isForMainFrame) return !ShellRules.frameAllowed(url.scheme, url.origin(), activity.origin)
        when (url.scheme?.lowercase()) {
            "http", "https" -> {
                if (activity.isTrusted(url)) return false
                activity.openOutside(url)
            }

            "solana-wallet" -> {
                if (activity.launch(Intent(Intent.ACTION_VIEW, url))) {
                    // Mobile Wallet Adapter waits for the page to blur to know a wallet opened; a WebView never
                    // blurs on its own, so the shell says it did (the official shell does the same).
                    view.evaluateJavascript("window.dispatchEvent(new Event('blur'))", null)
                }
            }

            "intent" -> launchIntentUrl(url.toString())

            "mailto", "tel", "sms" -> activity.launch(Intent(Intent.ACTION_VIEW, url))
        }
        return true
    }

    /** An intent: link, made safe: only an implicit, browsable target, with no URI grants. */
    private fun launchIntentUrl(url: String) {
        val intent =
            try {
                Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
            } catch (_: Exception) {
                return
            }
        val data = intent.data ?: return
        if (intent.action != Intent.ACTION_VIEW || data.scheme?.lowercase() !in setOf("https", "http", "solana-wallet", "mailto", "tel", "sms")) return
        // Rebuild the navigation request: no component, selector, extras or flags from the page.
        val safe = Intent(Intent.ACTION_VIEW, data).addCategory(Intent.CATEGORY_BROWSABLE)
        if (!activity.launch(safe)) intent.getStringExtra("browser_fallback_url")?.toUri()?.let(activity::openOutside)
    }

    override fun onPageStarted(
        view: WebView,
        url: String?,
        favicon: Bitmap?,
    ) {
        // A navigation shouldOverrideUrlLoading never sees — a form posted to another site — still never stays inside.
        val page = url?.toUri()
        if (page != null && !ShellRules.pageAllowed(page.scheme, page.origin(), activity.origin)) {
            view.stopLoading()
            activity.openOutside(page)
            if (view.canGoBack()) view.goBack() else activity.loadStart()
            return
        }
        activity.pageStarted()
    }

    override fun onPageCommitVisible(
        view: WebView,
        url: String?,
    ) {
        activity.pagePainted()
    }

    override fun onReceivedError(
        view: WebView,
        request: WebResourceRequest,
        error: WebResourceError,
    ) {
        // Only the page itself failing to load is Pawket not opening; a failed image or call is the page's to say.
        if (request.isForMainFrame) activity.pageFailed()
    }

    override fun onRenderProcessGone(
        view: WebView,
        detail: RenderProcessGoneDetail,
    ): Boolean {
        activity.rendererGone(view)
        return true
    }
}
