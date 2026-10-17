package app.pawket.android

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/**
 * One care reminder, kept on the phone. The page works out when a pet will
 * first need care (the program's own decay, `src/lib/reminders/care.ts`) and
 * the phone says so then, once; a newer reminder replaces it. Nothing about
 * it leaves the phone: no server knows who wants reminding. A restart clears
 * it until Pawket is opened again.
 */
object CareReminder {
    /** Three days: every vital is below a need's line well before then. */
    const val MAX_AHEAD_MS = 3 * 24 * 60 * 60 * 1000L
    private const val MAX_TITLE = 120
    private const val MAX_TEXT = 160
    private const val CHANNEL = "care"
    private const val NOTIFICATION_ID = 1
    private const val ACTION = "app.pawket.android.CARE_REMINDER"
    private const val EXTRA_TITLE = "title"
    private const val EXTRA_TEXT = "text"

    data class Reminder(
        val at: Long,
        val title: String,
        val text: String,
    )

    /** The reminder the page asked for, checked: a time after now and within three days, and words to show. */
    fun checked(
        at: Long,
        now: Long,
        title: String,
        text: String,
    ): Reminder? {
        val heading = plain(title).take(MAX_TITLE)
        if (heading.isEmpty() || at <= now || at > now + MAX_AHEAD_MS) return null
        return Reminder(at, heading, plain(text).take(MAX_TEXT))
    }

    private fun plain(words: String): String = words.filterNot { it.isISOControl() }.trim()

    /** Whether the phone lets Pawket post: the permission (Android 13 and later) and the app's own switch. */
    fun allowed(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled() &&
            (
                Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            )

    /** Inexact, and allowed while the phone dozes: a nudge, not an alarm, so no exact-alarm permission. */
    fun schedule(
        context: Context,
        reminder: Reminder,
    ) {
        channel(context)
        val fire =
            Intent(context, CareReminderReceiver::class.java)
                .setAction(ACTION)
                .putExtra(EXTRA_TITLE, reminder.title)
                .putExtra(EXTRA_TEXT, reminder.text)
        val pending = PendingIntent.getBroadcast(context, 0, fire, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, reminder.at, pending)
    }

    fun cancel(context: Context) {
        val fire = Intent(context, CareReminderReceiver::class.java).setAction(ACTION)
        val pending = PendingIntent.getBroadcast(context, 0, fire, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_NO_CREATE) ?: return
        context.getSystemService(AlarmManager::class.java).cancel(pending)
        pending.cancel()
    }

    /** The reminder, said: tapping it opens Pawket as the launcher would, where it was left. */
    fun show(
        context: Context,
        intent: Intent,
    ) {
        if (intent.action != ACTION) return
        val title = intent.getStringExtra(EXTRA_TITLE) ?: return
        if (!allowed(context)) return
        val open = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
        channel(context)
        val notification =
            NotificationCompat
                .Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(intent.getStringExtra(EXTRA_TEXT))
                .setStyle(NotificationCompat.BigTextStyle().bigText(intent.getStringExtra(EXTRA_TEXT)))
                .setCategory(NotificationCompat.CATEGORY_REMINDER)
                .setContentIntent(PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE))
                .setAutoCancel(true)
                .build()
        try {
            NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, notification)
        } catch (_: SecurityException) {
            // The permission was taken back between the check and the post: nothing is said.
        }
    }

    /** Its own channel, so the phone's settings can quiet care reminders apart from anything else. */
    private fun channel(context: Context) {
        val channel = NotificationChannel(CHANNEL, context.getString(R.string.care_channel), NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = context.getString(R.string.care_channel_about)
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}

/** Fires the one care reminder; not exported, so only this app's own alarm reaches it. */
class CareReminderReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        CareReminder.show(context, intent)
    }
}
