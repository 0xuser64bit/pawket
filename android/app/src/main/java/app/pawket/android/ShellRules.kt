package app.pawket.android

object ShellRules {
    fun frameAllowed(
        scheme: String?,
        origin: String,
        trusted: String,
    ): Boolean = scheme?.lowercase() == "about" || (origin.isNotEmpty() && origin == trusted)

    fun pageAllowed(
        scheme: String?,
        origin: String,
        trusted: String,
    ): Boolean = scheme?.lowercase() !in setOf("http", "https") || origin == trusted
}

class CrashWindow(
    private val max: Int = 1,
    private val windowMs: Long = 60_000,
) {
    private val losses = ArrayDeque<Long>()

    fun bringBack(now: Long): Boolean {
        while (losses.isNotEmpty() && now - losses.first() > windowMs) losses.removeFirst()
        losses.addLast(now)
        return losses.size <= max
    }
}
