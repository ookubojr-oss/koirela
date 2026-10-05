import { PushNotifications } from '@capacitor/push-notifications';
import { supabase, configured } from './koirela-backend.js';

export async function initializePushNotifications() {
  if (!configured || !supabase) return { configured: false };

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { configured: true, signedIn: false };

  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') {
    return { configured: true, signedIn: true, granted: false };
  }

  await PushNotifications.removeAllListeners();

  await PushNotifications.addListener('registration', async token => {
    await supabase.from('push_tokens').upsert({
      user_id: authData.user.id,
      platform: 'ios',
      token: token.value,
      last_seen_at: new Date().toISOString()
    }, { onConflict: 'token' });
  });

  await PushNotifications.addListener('registrationError', error => {
    console.error('Push registration error', error);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const route = action.notification.data?.route;
    if (route && typeof window !== 'undefined') window.location.hash = route;
  });

  await PushNotifications.register();
  return { configured: true, signedIn: true, granted: true };
}
