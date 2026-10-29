package app.pawket.android

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.net.toUri

@SuppressLint("MissingOnRenderProcessGone")
class WebShellViewClient(private val activity: MainActivity) : WebViewClient() {
    override fun shouldOverrideUrlLoading(
        view: WebView,
        request: WebResourceRequest,
    ): Boolean {
        val url = request.url
        if (!request.isForMainFrame) return !ShellRules.frameAllowed(url.scheme, url.origin(), activity.origin)
        val scheme = url.scheme?.lowercase()
        if (scheme == "http" || scheme == "https") {
            if (activity.isTrusted(url)) return false
            activity.openOutside(url)
            return true
        }
        if (!ShellRules.launchAllowed(view.url?.toUri()?.origin().orEmpty(), activity.origin)) return true
        when (scheme) {
            "solana-wallet" -> {
                if (activity.launch(Intent(Intent.ACTION_VIEW, url))) {
                    // Mobile Wallet Adapter waits for a blur to know the wallet opened, and a WebView never blurs.
                    view.evaluateJavascript("window.dispatchEvent(new Event('blur'))", null)
                }
            }

            "intent" -> launchIntentUrl(url.toString())

            "mailto", "tel", "sms" -> activity.launch(Intent(Intent.ACTION_VIEW, url))
        }
        return true
    }

    private fun launchIntentUrl(url: String) {
        val intent =
            try {
                Intent.parseUri(url, Intent.URI_INTENT_SCHEME)
            } catch (_: Exception) {
                return
            }
        val data = intent.data ?: return
        if (intent.action != Intent.ACTION_VIEW || data.scheme?.lowercase() !in setOf("https", "http", "solana-wallet", "mailto", "tel", "sms")) return
        val safe = Intent(Intent.ACTION_VIEW, data).addCategory(Intent.CATEGORY_BROWSABLE)
        if (!activity.launch(safe)) intent.getStringExtra("browser_fallback_url")?.toUri()?.let(activity::openOutside)
    }

    override fun onPageStarted(
        view: WebView,
        url: String?,
        favicon: Bitmap?,
    ) {
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
