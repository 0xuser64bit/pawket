package app.pawket.android

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** What the page may ask the phone to say, and when: a time ahead and within three days, and plain words. */
class CareReminderTest {
    private val now = 1_800_000_000_000L

    @Test
    fun aReminderIsForLaterAndWithinThreeDays() {
        assertEquals(now + 1, CareReminder.checked(now + 1, now, "Mango is hungry.", "")?.at)
        assertEquals(now + CareReminder.MAX_AHEAD_MS, CareReminder.checked(now + CareReminder.MAX_AHEAD_MS, now, "Mango", "")?.at)
        assertNull(CareReminder.checked(now, now, "Mango is hungry.", ""))
        assertNull(CareReminder.checked(now - 60_000, now, "Mango is hungry.", ""))
        assertNull(CareReminder.checked(now + CareReminder.MAX_AHEAD_MS + 1, now, "Mango is hungry.", ""))
    }

    @Test
    fun itSaysOnlyPlainWordsOfALength() {
        val reminder = CareReminder.checked(now + 1, now, "  Mango\u0000 is\n hungry.‮ ", "A meal\r would help.")
        assertEquals("Mango is hungry.‮", reminder?.title)
        assertEquals("A meal would help.", reminder?.text)
        assertNull(CareReminder.checked(now + 1, now, " \n\t ", "words"))
        assertEquals(120, CareReminder.checked(now + 1, now, "m".repeat(500), "")?.title?.length)
        assertEquals(160, CareReminder.checked(now + 1, now, "Mango", "w".repeat(500))?.text?.length)
    }
}
