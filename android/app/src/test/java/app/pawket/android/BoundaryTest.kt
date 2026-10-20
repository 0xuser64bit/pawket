package app.pawket.android

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.util.Base64

/** What the shell lets in: the origin it trusts, and what the bridge takes as a picture or a file name. */
class BoundaryTest {
    private val png = byteArrayOf(0x89.toByte(), 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3)

    private fun dataUrl(
        bytes: ByteArray,
        type: String = "image/png",
    ) = "data:$type;base64," + Base64.getEncoder().encodeToString(bytes)

    @Test
    fun anOriginIsSchemeHostAndAPortThatIsNotTheDefault() {
        assertEquals("https://pawket.world", originOf("https", "pawket.world", -1))
        assertEquals("https://pawket.world", originOf("HTTPS", "Pawket.World", 443))
        assertEquals("http://localhost:3000", originOf("http", "localhost", 3000))
        assertEquals("http://localhost", originOf("http", "localhost", 80))
    }

    @Test
    fun anotherSchemePortOrHostIsAnotherOrigin() {
        val pawket = originOf("https", "pawket.world", -1)
        assert(originOf("http", "pawket.world", -1) != pawket)
        assert(originOf("https", "pawket.world", 8443) != pawket)
        assert(originOf("https", "pawket.world.evil.example", -1) != pawket)
        assert(originOf("https", "www.pawket.world", -1) != pawket)
        assert(originOf("https", "pawket-pets.vercel.app", -1) != pawket)
    }

    @Test
    fun noSchemeOrNoHostIsNoOrigin() {
        assertEquals("", originOf(null, "pawket.world", -1))
        assertEquals("", originOf("https", null, -1))
        assertEquals("", originOf("https", "", -1))
        assertEquals("", originOf("file", null, -1))
    }

    @Test
    fun aPngDataUrlDecodesToItsBytes() {
        assertArrayEquals(png, PawketBridge.decodePng(dataUrl(png)))
    }

    @Test
    fun anythingElseIsNotAPicture() {
        assertNull(PawketBridge.decodePng(dataUrl(png, "image/jpeg")))
        assertNull(PawketBridge.decodePng(dataUrl(byteArrayOf(1, 2, 3, 4, 5, 6, 7, 8, 9))))
        assertNull(PawketBridge.decodePng("data:image/png;base64,not base64!"))
        assertNull(PawketBridge.decodePng("https://pawket.world/icon"))
        assertNull(PawketBridge.decodePng("data:image/png;base64,"))
    }

    @Test
    fun aSuggestedFileNameKeepsOnlyLettersDigitsAndDashes() {
        assertEquals("pawket-pixel-6-oct", PawketBridge.fileName("Pawket — Pixel, 6 Oct"))
        assertEquals("etc-passwd", PawketBridge.fileName("../../etc/passwd"))
        assertEquals("pawket", PawketBridge.fileName("///"))
        assertEquals(60, PawketBridge.fileName("a".repeat(200)).length)
    }

    @Test
    fun sharedWordsAreCappedAndEndWithTheLink() {
        assertEquals("Mango, kept on Solana. https://pawket.world/pet/x", PawketBridge.shareWords("Mango, kept on Solana.", "https://pawket.world/pet/x"))
        assertEquals("https://pawket.world/pet/x", PawketBridge.shareWords("   ", "https://pawket.world/pet/x"))
        assertEquals(280 + 1 + 4, PawketBridge.shareWords("a".repeat(500), "link").length)
    }
}
