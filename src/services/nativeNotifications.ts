import { Capacitor } from '@capacitor/core';
import { LocalNotifications, LocalNotificationSchema } from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';
import { AppSettings, LessonSession } from '../types';
import { sessionEpochMs, formatManilaTime } from '../utils/timezone';

export const ALARM_CHANNEL_ID = 'class-alarms';
const ALARM_SOUND = 'alarm.wav'; // android/app/src/main/res/raw/alarm.wav (added by CI)
const MAX_SCHEDULE_DAYS = 14;

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function hashId(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 2147483646 || 1;
}

/**
 * Request permissions + create the high-importance alarm channel. Safe to call
 * repeatedly. Pass `openExactAlarmSettings=true` (from the Settings button) to
 * send the user to the Android exact-alarm permission screen if needed.
 */
export async function ensureNotificationSetup(openExactAlarmSettings = false): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return false;
    }

    await LocalNotifications.createChannel({
      id: ALARM_CHANNEL_ID,
      name: 'Class Alarms',
      description: 'Rings before each scheduled class (Manila time)',
      importance: 5,
      visibility: 1,
      sound: ALARM_SOUND,
      vibration: true,
      lights: true,
      lightColor: '#be185d',
    });

    // Android 12+ exact-alarm permission so alarms fire on time even in Doze mode.
    try {
      const exact = await LocalNotifications.checkExactNotificationSetting();
      if (
        openExactAlarmSettings &&
        (exact as { exact_alarm?: string }).exact_alarm !== 'granted'
      ) {
        await LocalNotifications.changeExactNotificationSetting();
      }
    } catch {
      /* older Android / plugin version – ignore */
    }
    return true;
  } catch (err) {
    console.warn('Notification setup failed:', err);
    return false;
  }
}

/**
 * Cancel old pending alarms and (re)schedule one local notification per upcoming
 * session, `alarmNoticeMinutes` (default 15) before the Manila-time start.
 * Local notifications are delivered by Android even when the app is closed.
 */
export async function scheduleSessionAlarms(
  sessions: LessonSession[],
  settings: AppSettings
): Promise<number> {
  if (!isNativeApp()) return 0;
  const ready = await ensureNotificationSetup();
  if (!ready) return 0;

  const now = Date.now();
  const horizon = now + MAX_SCHEDULE_DAYS * 86_400_000;

  const notifications: LocalNotificationSchema[] = [];
  for (const s of sessions) {
    if (s.isCompleted || !s.alarmEnabled) continue;
    const start = sessionEpochMs(s);
    const notice = (s.alarmNoticeMinutes || settings.defaultAlarmNoticeMinutes || 15) * 60_000;
    const fireAt = start - notice;
    if (fireAt <= now || start > horizon) continue;

    const noticeMin = s.alarmNoticeMinutes || settings.defaultAlarmNoticeMinutes || 15;
    notifications.push({
      id: hashId(s.id),
      channelId: ALARM_CHANNEL_ID,
      title: `⏰ Class in ${noticeMin} minutes`,
      body: `${s.studentName} • ${s.subject} at ${formatManilaTime(start)} (Manila)`,
      sound: ALARM_SOUND,
      autoCancel: true,
      ongoing: false,
      schedule: { at: new Date(fireAt), allowWhileIdle: true },
      extra: { sessionId: s.id, route: 'next-class' },
    });
  }

  // Replace all previously scheduled alarms with the fresh set.
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }
  if (notifications.length > 0) {
    await LocalNotifications.schedule({ notifications });
  }
  return notifications.length;
}

/** Fire a test notification a few seconds from now (lets the user verify sound/permission). */
export async function sendTestNotification(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const ready = await ensureNotificationSetup();
  if (!ready) return false;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 999999,
        channelId: ALARM_CHANNEL_ID,
        title: '🔔 Test alarm',
        body: 'Notifications are working. You will be reminded 15 minutes before each class (Manila time).',
        sound: ALARM_SOUND,
        autoCancel: true,
        schedule: { at: new Date(Date.now() + 4000), allowWhileIdle: true },
      },
    ],
  });
  return true;
}

/** Listen for notification taps so the app can jump to the Next Class tab. */
export async function setupNotificationListeners(
  onOpenNextClass: () => void
): Promise<PluginListenerHandle | null> {
  if (!isNativeApp()) return null;
  return LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
    const extra = action.notification.extra as { route?: string } | undefined;
    if (!extra?.route || extra.route === 'next-class') onOpenNextClass();
  });
}
