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

object CareReminder {
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

    fun allowed(context: Context): Boolean =
        NotificationManagerCompat.from(context).areNotificationsEnabled() &&
            (
                Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU ||
                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            )

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
        } catch (_: SecurityException) {}
    }

    private fun channel(context: Context) {
        val channel = NotificationChannel(CHANNEL, context.getString(R.string.care_channel), NotificationManager.IMPORTANCE_DEFAULT)
        channel.description = context.getString(R.string.care_channel_about)
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}

class CareReminderReceiver : BroadcastReceiver() {
    override fun onReceive(
        context: Context,
        intent: Intent,
    ) {
        CareReminder.show(context, intent)
    }
}
