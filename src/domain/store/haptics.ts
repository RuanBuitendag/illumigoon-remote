import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// What a finger feels, by the kind of event (D109). Frequent events get the lightest tap or none: a fader moves
// with no haptic, since Apple keeps haptics off what happens many times a second.
const ROLES = {
  // A light or a room turned on or off.
  power: () => Haptics.impact({ style: ImpactStyle.Light }),
  // A look or a scene picked, which changes the lights.
  pick: () => Haptics.impact({ style: ImpactStyle.Medium }),
  // A hold that starts a preview.
  hold: () => Haptics.impact({ style: ImpactStyle.Heavy }),
  // A light did not take a change (D110).
  refused: () => Haptics.notification({ type: NotificationType.Error }),
  // Something deleted, forgotten or reset (D101).
  destroy: () => Haptics.notification({ type: NotificationType.Warning }),
};

export type HapticRole = keyof typeof ROLES;

// The laptop and an iPhone build from before the plugin have no haptics, and stay silent.
const canFeel = () => Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Haptics');

export function feel(role: HapticRole) {
  if (canFeel()) ROLES[role]().catch(() => undefined);
}
