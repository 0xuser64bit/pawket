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
        // Pawket has no frames of its own; a frame never reaches the bridge either (it is main-frame only).
        if (!request.isForMainFrame) return false
        val url = request.url
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
        intent.addCategory(Intent.CATEGORY_BROWSABLE)
        intent.component = null
        intent.selector = null
        intent.removeFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION or
                Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                Intent.FLAG_GRANT_PREFIX_URI_PERMISSION,
        )
        if (!activity.launch(intent)) {
            intent.getStringExtra("browser_fallback_url")?.toUri()?.let(activity::openOutside)
        }
    }

    override fun onPageStarted(
        view: WebView,
        url: String?,
        favicon: Bitmap?,
    ) {
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
