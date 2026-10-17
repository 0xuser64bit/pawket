package app.pawket.android

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** What may load inside the shell besides Pawket's own pages, and when a dying renderer is left to the player. */
class ShellRulesTest {
    private val pawket = "https://pawket.world"

    @Test
    fun aFrameLoadsOnlyPawketOrAnEmptyDocument() {
        assertTrue(ShellRules.frameAllowed("https", pawket, pawket))
        assertTrue(ShellRules.frameAllowed("about", "", pawket))
        assertFalse(ShellRules.frameAllowed("https", "https://evil.example", pawket))
        assertFalse(ShellRules.frameAllowed("http", "http://pawket.world", pawket))
        assertFalse(ShellRules.frameAllowed("data", "", pawket))
        assertFalse(ShellRules.frameAllowed("https", "", ""))
    }

    @Test
    fun aPageFromAnotherSiteNeverStaysInside() {
        assertTrue(ShellRules.pageAllowed("https", pawket, pawket))
        assertFalse(ShellRules.pageAllowed("https", "https://evil.example", pawket))
        assertFalse(ShellRules.pageAllowed("HTTP", "http://evil.example", pawket))
        // Not a web page at all (about:blank before the first load): nothing to send outside.
        assertTrue(ShellRules.pageAllowed("about", "", pawket))
    }

    @Test
    fun aRendererThatDiesTwiceInAMinuteWaitsForThePlayer() {
        val crashes = CrashWindow()
        assertTrue(crashes.bringBack(0))
        assertFalse(crashes.bringBack(30_000))
        // A minute after both, one loss is brought back again.
        assertTrue(crashes.bringBack(200_000))
    }
}
