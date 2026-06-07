import { useEffect, useState } from 'react';
import { Bell, X, Check } from 'lucide-react';

export default function PushNotificationPrompt({ user, onPermissionChange }) {
  const [show, setShow] = useState(false);
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [isSupported] = useState('serviceWorker' in navigator && 'Notification' in window);

  useEffect(() => {
    // Show prompt if notifications are not yet requested
    if (isSupported && Notification?.permission === 'default') {
      // Wait 2 seconds before showing prompt
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSupported]);

  const handleAllow = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        setShow(false);
        onPermissionChange?.(true);
        // Show welcome notification
        new Notification('🎉 Notifications Enabled!', {
          body: 'You\'ll now receive real-time updates on bookings, service dispatch, and reminders.',
          icon: '/icon.png',
          badge: '/badge.png',
        });
      }
    } catch (err) {
      console.error('Error requesting notification permission', err);
    }
  };

  if (!show || !isSupported || permission !== 'default') return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/10 border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 flex items-center gap-3">
          <Bell className="w-5 h-5 text-white flex-shrink-0 animate-bounce" />
          <div>
            <h3 className="font-bold text-white">Stay Updated</h3>
            <p className="text-xs text-white/80">Get real-time alerts for your bookings and services</p>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-600">
            Enable notifications to receive instant updates when your technician is dispatched, services are completed, and more.
          </p>

          <div className="flex gap-2">
            <button
              onClick={() => setShow(false)}
              className="flex-1 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Not Now
            </button>
            <button
              onClick={handleAllow}
              className="flex-1 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
            >
              <Check className="w-4 h-4" /> Enable
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}