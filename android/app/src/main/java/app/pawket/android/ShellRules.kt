package app.pawket.android

/**
 * The shell's two small judgements, kept apart from the WebView so the JVM
 * tests can hold them: what a frame inside Pawket may load, and when a
 * renderer that keeps dying should stop being brought back.
 */
object ShellRules {
    /** A frame loads only Pawket's own origin, or an empty document of its own (about:blank, about:srcdoc). */
    fun frameAllowed(
        scheme: String?,
        origin: String,
        trusted: String,
    ): Boolean = scheme?.lowercase() == "about" || (origin.isNotEmpty() && origin == trusted)

    /** A main-frame page from anywhere but Pawket — a form posted away, which no other hook sees — goes outside. */
    fun pageAllowed(
        scheme: String?,
        origin: String,
        trusted: String,
    ): Boolean = scheme?.lowercase() !in setOf("http", "https") || origin == trusted
}

/**
 * Renderer losses, counted: more than [max] within [windowMs] means a page
 * that kills it every time (the 3D room on a phone short of memory, say), so
 * the shell shows its retry screen rather than reload into the same crash.
 */
class CrashWindow(
    private val max: Int = 1,
    private val windowMs: Long = 60_000,
) {
    private val losses = ArrayDeque<Long>()

    /** Records a loss at [now]; true while the renderer should simply be brought back. */
    fun bringBack(now: Long): Boolean {
        while (losses.isNotEmpty() && now - losses.first() > windowMs) losses.removeFirst()
        losses.addLast(now)
        return losses.size <= max
    }
}
