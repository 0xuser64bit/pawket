package app.pawket.android

import android.os.Message
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/**
 * The page's requests of the app: a new window (a link that opens in a new
 * tab — Pawket's own opens here, anything else in the browser), progress, and
 * nothing else. Pawket asks for no camera, microphone or location.
 */
class WebShellChromeClient(private val activity: MainActivity) : WebChromeClient() {
    override fun onProgressChanged(
        view: WebView,
        newProgress: Int,
    ) {
        activity.progressed(newProgress)
    }

    override fun onConsoleMessage(consoleMessage: ConsoleMessage): Boolean {
        // The page's console can carry anything: never written to logcat in a release build.
        if (BuildConfig.DEBUG) {
            Log.d(MainActivity.TAG, "${consoleMessage.message()} — ${consoleMessage.sourceId()}:${consoleMessage.lineNumber()}")
        }
        return true
    }

    override fun onCreateWindow(
        view: WebView,
        isDialog: Boolean,
        isUserGesture: Boolean,
        resultMsg: Message,
    ): Boolean {
        if (!isUserGesture) return false
        val transport = resultMsg.obj as? WebView.WebViewTransport ?: return false
        // A throwaway WebView only to learn where the new window was going; it never loads anything.
        val catcher = WebView(view.context)
        catcher.webViewClient =
            object : WebViewClient() {
                override fun onRenderProcessGone(caught: WebView, detail: RenderProcessGoneDetail): Boolean {
                    caught.destroy()
                    return true
                }

                override fun shouldOverrideUrlLoading(
                    caught: WebView,
                    request: WebResourceRequest,
                ): Boolean {
                    val url = request.url
                    if (activity.isTrusted(url)) activity.loadInside(url) else activity.openOutside(url)
                    caught.post { caught.destroy() }
                    return true
                }
            }
        transport.webView = catcher
        resultMsg.sendToTarget()
        return true
    }

    override fun onPermissionRequest(request: PermissionRequest) {
        request.deny()
    }

    override fun onGeolocationPermissionsShowPrompt(
        origin: String,
        callback: GeolocationPermissions.Callback,
    ) {
        callback.invoke(origin, false, false)
    }
}
