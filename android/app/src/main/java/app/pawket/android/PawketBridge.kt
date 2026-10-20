package app.pawket.android

import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.CalendarContract
import android.provider.MediaStore
import android.util.Log
import android.view.HapticFeedbackConstants
import android.webkit.WebView
import androidx.core.content.FileProvider
import androidx.core.net.toUri
import androidx.lifecycle.lifecycleScope
import androidx.webkit.JavaScriptReplyProxy
import androidx.webkit.WebMessageCompat
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONException
import org.json.JSONObject
import java.io.File
import java.util.Base64

/**
 * The page's one way to ask the phone for something: `window.PawketAndroid`,
 * injected only into Pawket's own origin and heard only from its main frame.
 * It knows nine requests — share or save a photo, share a link, share a
 * record's card with its link, set a daily reminder in the calendar, allow
 * and set the one care reminder, a haptic, the room's colours — and checks
 * every field of each. It never carries a key, a transaction, a file path or a URL
 * to load: a wallet is the wallet app's, and Solana is the page's.
 *
 * Requests are JSON `{ id, op, … }`; the answer, for those that have one, is
 * JSON `{ id, ok, reason? }` posted back.
 */
class PawketBridge(private val activity: MainActivity) : WebViewCompat.WebMessageListener {
    fun attach(view: WebView) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            Log.w(MainActivity.TAG, "This WebView cannot take messages: Pawket runs here as it would in a browser")
            return
        }
        WebViewCompat.addWebMessageListener(view, OBJECT_NAME, setOf(activity.origin), this)
    }

    override fun onPostMessage(
        view: WebView,
        message: WebMessageCompat,
        sourceOrigin: Uri,
        isMainFrame: Boolean,
        replyProxy: JavaScriptReplyProxy,
    ) {
        if (!isMainFrame || sourceOrigin.origin() != activity.origin) return
        if (message.type != WebMessageCompat.TYPE_STRING) return
        val raw = message.data ?: return
        if (raw.length > MAX_MESSAGE_CHARS) return
        val request =
            try {
                JSONObject(raw)
            } catch (_: JSONException) {
                return
            }
        val id = request.optString("id").take(40)
        // The request's name only, never its contents: so a development build shows what the page asked for.
        if (BuildConfig.DEBUG) Log.d(MainActivity.TAG, "bridge: ${request.optString("op")} ${request.optString("kind")}".trim())
        // A failure says why; a success says nothing more.
        val answer = { ok: Boolean, reason: String? -> reply(replyProxy, id, ok, reason.takeUnless { ok }) }
        when (request.optString("op")) {
            "haptic" -> haptic(view, request.optString("kind"))
            "room" -> room(request)
            "share-image" -> picture(request, share = true, answer)
            "save-image" -> picture(request, share = false, answer)
            "share-card" -> card(request, answer)
            "share-link" -> shareLink(request, answer)
            "remind" -> remind(request, answer)
            "allow-reminders" -> activity.allowNotifications { allowed -> answer(allowed, "denied") }
            "care-reminder" -> careReminder(request, answer)
            else -> answer(false, "unknown")
        }
    }

    private fun reply(
        proxy: JavaScriptReplyProxy,
        id: String,
        ok: Boolean,
        reason: String?,
    ) {
        if (id.isEmpty()) return
        val body = JSONObject().put("id", id).put("ok", ok)
        if (reason != null) body.put("reason", reason)
        try {
            proxy.postMessage(body.toString())
        } catch (_: IllegalStateException) {
            // The page or renderer went away while a picture was being written.
        }
    }

    /** A care kept, a level, a refusal: the system's own feedback, so the phone's touch-feedback setting decides. */
    private fun haptic(
        view: WebView,
        kind: String,
    ) {
        val modern = Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
        val effect =
            when (kind) {
                "done", "cheer" -> if (modern) HapticFeedbackConstants.CONFIRM else HapticFeedbackConstants.VIRTUAL_KEY
                "refuse" -> if (modern) HapticFeedbackConstants.REJECT else HapticFeedbackConstants.LONG_PRESS
                else -> return
            }
        view.performHapticFeedback(effect)
        if (kind == "cheer") view.postDelayed({ view.performHapticFeedback(effect) }, CHEER_GAP_MS)
    }

    private fun room(request: JSONObject) {
        val ground = request.optString("ground")
        if (!HEX_COLOUR.matches(ground)) return
        activity.roomChanged(android.graphics.Color.parseColor(ground), request.optBoolean("dark"))
    }

    /** A record's card (a PNG data URL) and the link to it, a page of Pawket's, into the share sheet together. */
    private fun card(
        request: JSONObject,
        answer: (Boolean, String?) -> Unit,
    ) {
        val url = request.optString("url").toUri()
        if (!activity.isTrusted(url)) return answer(false, "not-pawket")
        picture(request, share = true, answer, words = shareWords(request.optString("text"), "$url"))
    }

    /** A printed photo, as the page made it (a PNG data URL): into the share sheet, or into Pictures/Pawket. */
    private fun picture(
        request: JSONObject,
        share: Boolean,
        answer: (Boolean, String?) -> Unit,
        words: String? = null,
    ) {
        val data = request.optString("data")
        val name = fileName(request.optString("name"))
        val title = request.optString("title").take(120)
        activity.lifecycleScope.launch {
            val bytes = withContext(Dispatchers.Default) { decodePng(data) }
            if (bytes == null) return@launch answer(false, "not-a-picture")
            val stored =
                withContext(Dispatchers.IO) {
                    if (share) stageForShare(bytes, name) else saveToPictures(bytes, name)
                }
            when {
                stored == null -> answer(false, if (share) "not-staged" else "not-saved")
                share -> answer(activity.launch(shareIntent(stored, title, words)), "no-target")
                else -> answer(true, null)
            }
        }
    }

    /** Writes the picture under cache/shared/ (clearing yesterday's), and returns its content URI. */
    private fun stageForShare(
        bytes: ByteArray,
        name: String,
    ): Uri? =
        try {
            val dir = File(activity.cacheDir, "shared").apply { mkdirs() }
            val stale = System.currentTimeMillis() - SHARED_KEEP_MS
            dir.listFiles()?.filter { it.lastModified() < stale }?.forEach { it.delete() }
            val file = File.createTempFile("pawket-$name-", ".png", dir).apply { writeBytes(bytes) }
            FileProvider.getUriForFile(activity, "${activity.packageName}.pictures", file)
        } catch (error: Exception) {
            Log.w(MainActivity.TAG, "Could not stage a picture to share", error)
            null
        }

    private fun shareIntent(
        picture: Uri,
        title: String,
        words: String?,
    ): Intent {
        val send =
            Intent(Intent.ACTION_SEND)
                .setType("image/png")
                .putExtra(Intent.EXTRA_STREAM, picture)
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        send.clipData = ClipData.newRawUri(title, picture)
        if (title.isNotBlank()) send.putExtra(Intent.EXTRA_TITLE, title)
        // A card goes with its words and link: an app that takes both (a chat, a post) gets both.
        if (words != null) send.putExtra(Intent.EXTRA_TEXT, words)
        return Intent.createChooser(send, activity.getString(R.string.share_picture))
    }

    /** Pictures/Pawket through MediaStore: the gallery sees it, and no storage permission is asked. */
    @SuppressLint("InlinedApi")
    private fun saveToPictures(
        bytes: ByteArray,
        name: String,
    ): Uri? {
        val resolver = activity.contentResolver
        val values =
            ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, "$name.png")
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                put(MediaStore.Images.Media.RELATIVE_PATH, "${Environment.DIRECTORY_PICTURES}/Pawket")
                put(MediaStore.Images.Media.IS_PENDING, 1)
            }
        var item: Uri? = null
        return try {
            item = resolver.insert(MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values) ?: return null
            resolver.openOutputStream(item)?.use { it.write(bytes) } ?: throw IllegalStateException("no stream")
            if (resolver.update(item, ContentValues().apply { put(MediaStore.Images.Media.IS_PENDING, 0) }, null, null) != 1) {
                throw IllegalStateException("not published")
            }
            item
        } catch (error: Exception) {
            Log.w(MainActivity.TAG, "Could not save a picture", error)
            item?.let { runCatching { resolver.delete(it, null, null) } }
            null
        }
    }

    /** A link to a page of Pawket's — a Passport, a guild, a round — into the share sheet. */
    private fun shareLink(
        request: JSONObject,
        answer: (Boolean, String?) -> Unit,
    ) {
        val url = request.optString("url").toUri()
        if (!activity.isTrusted(url)) return answer(false, "not-pawket")
        val send =
            Intent(Intent.ACTION_SEND)
                .setType("text/plain")
                .putExtra(Intent.EXTRA_TEXT, shareWords(request.optString("text"), "$url"))
        request.optString("title").take(120).takeIf { it.isNotBlank() }?.let { send.putExtra(Intent.EXTRA_TITLE, it) }
        answer(activity.launch(Intent.createChooser(send, activity.getString(R.string.share_link))), "no-target")
    }

    /**
     * A daily reminder, in the phone's own calendar: the calendar app opens
     * with the event filled in and the player saves it there. Nothing is
     * scheduled by Pawket and no permission is asked.
     */
    private fun remind(
        request: JSONObject,
        answer: (Boolean, String?) -> Unit,
    ) {
        val url = request.optString("url").toUri()
        val at = request.optLong("at")
        val now = System.currentTimeMillis()
        if (!activity.isTrusted(url) || at < now - HOUR_MS || at > now + 2 * DAY_MS) return answer(false, "invalid")
        val days = request.optInt("days", 30).coerceIn(1, 60)
        val title = request.optString("title").take(120)
        val notes = request.optString("notes").take(500)
        val insert =
            Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI)
                .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, at)
                .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, at + REMINDER_LENGTH_MS)
                .putExtra(CalendarContract.Events.TITLE, title)
                .putExtra(CalendarContract.Events.DESCRIPTION, if (notes.isBlank()) "$url" else "$notes\n$url")
                .putExtra(CalendarContract.Events.RRULE, "FREQ=DAILY;COUNT=$days")
        answer(activity.launch(insert), "no-calendar")
    }

    /** The one care reminder, set for the time the page worked out, or cleared. Never asks the player anything. */
    private fun careReminder(
        request: JSONObject,
        answer: (Boolean, String?) -> Unit,
    ) {
        if (!request.optBoolean("on")) {
            CareReminder.cancel(activity)
            return answer(true, null)
        }
        val reminder =
            CareReminder.checked(request.optLong("at"), System.currentTimeMillis(), request.optString("title"), request.optString("text"))
                ?: return answer(false, "invalid")
        if (!CareReminder.allowed(activity)) {
            // The phone took its permission back: the one set before goes too.
            CareReminder.cancel(activity)
            return answer(false, "not-allowed")
        }
        CareReminder.schedule(activity, reminder)
        answer(true, null)
    }

    companion object {
        const val OBJECT_NAME = "PawketAndroid"
        private const val MAX_MESSAGE_CHARS = 24_000_000
        private const val MAX_PICTURE_BYTES = 16 * 1024 * 1024
        private const val SHARED_KEEP_MS = 24 * 60 * 60 * 1000L
        private const val CHEER_GAP_MS = 140L
        private const val HOUR_MS = 60 * 60 * 1000L
        private const val DAY_MS = 24 * HOUR_MS
        private const val REMINDER_LENGTH_MS = 10 * 60 * 1000L
        private const val MAX_SHARE_TEXT = 280
        private val HEX_COLOUR = Regex("^#[0-9a-fA-F]{6}$")
        private val PNG_SIGNATURE = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)
        private const val PNG_DATA_URL = "data:image/png;base64,"

        /** A PNG, from a data URL, or null for anything else or anything too large. */
        fun decodePng(data: String): ByteArray? {
            if (!data.startsWith(PNG_DATA_URL)) return null
            val bytes =
                try {
                    Base64.getDecoder().decode(data.substring(PNG_DATA_URL.length))
                } catch (_: IllegalArgumentException) {
                    return null
                }
            if (bytes.size > MAX_PICTURE_BYTES || bytes.size < PNG_SIGNATURE.size) return null
            return if (bytes.copyOfRange(0, PNG_SIGNATURE.size).contentEquals(PNG_SIGNATURE)) bytes else null
        }

        /** What a shared link says: the page's words, capped, then the link. */
        fun shareWords(
            text: String,
            url: String,
        ): String = text.take(MAX_SHARE_TEXT).trim().let { if (it.isEmpty()) url else "$it $url" }

        /** A file name the page suggested, kept to letters, digits and dashes. */
        fun fileName(suggested: String): String =
            suggested
                .lowercase()
                .replace(Regex("[^a-z0-9-]+"), "-")
                .trim('-')
                .take(60)
                .ifEmpty { "pawket" }
    }
}
