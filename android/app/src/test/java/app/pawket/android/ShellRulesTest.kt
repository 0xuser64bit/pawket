package app.pawket.android

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

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
        assertTrue(ShellRules.pageAllowed("about", "", pawket))
    }

    @Test
    fun onlyPawketsOwnPageOpensAnotherApp() {
        assertTrue(ShellRules.launchAllowed(pawket, pawket))
        assertFalse(ShellRules.launchAllowed("https://evil.example", pawket))
        assertFalse(ShellRules.launchAllowed("http://pawket.world", pawket))
        assertFalse(ShellRules.launchAllowed("https://pawket.world:8443", pawket))
        assertFalse(ShellRules.launchAllowed("", pawket))
        assertFalse(ShellRules.launchAllowed("", ""))
    }

    @Test
    fun aRendererThatDiesTwiceInAMinuteWaitsForThePlayer() {
        val crashes = CrashWindow()
        assertTrue(crashes.bringBack(0))
        assertFalse(crashes.bringBack(30_000))
        assertTrue(crashes.bringBack(200_000))
    }
}
