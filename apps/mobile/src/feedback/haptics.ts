/**
 * Thin, safe wrapper around expo-haptics.
 *
 * Pawket is a tactile care game — every ritual should be *felt*. Haptics are
 * native-only and can throw on unsupported hardware, so every call is guarded
 * and fails silently. Screens import these named intents instead of reaching
 * for the raw API, keeping the feedback vocabulary consistent.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS !== 'web';

function safe(run: () => Promise<void>) {
  if (!enabled) return;
  // Haptics rejects on unsupported devices; we never want that to surface.
  void run().catch(() => {});
}

/** A light tick — selection, toggles, nav taps. */
export function tapLight() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** A firmer tap — a committed care action. */
export function tapMedium() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** A heavy thud — big, rare moments (level up). */
export function tapHeavy() {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

/** Success chime — reward claimed, adoption complete. */
export function notifySuccess() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Warning buzz — recoverable error / blocked action. */
export function notifyWarning() {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}

/** Discrete selection tick — moving through option pickers. */
export function selection() {
  safe(() => Haptics.selectionAsync());
}

/**
 * The signature "care landed" pattern: a medium tap with a light echo. Used as
 * the haptic payoff when a care ritual resolves.
 */
export function careLanded() {
  tapMedium();
}

/** A celebratory triple-beat for level ups and sealed streaks. */
export function celebrate() {
  if (!enabled) return;
  tapHeavy();
  setTimeout(notifySuccess, 90);
}
