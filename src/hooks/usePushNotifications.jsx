import { list, filter, create, update, remove, subscribe, TABLES } from '@/lib/db';
import { useEffect, useState, useRef } from 'react';

export function usePushNotifications(user) {
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [isSupported, setIsSupported] = useState(false);
  const unsubscribeRef = useRef(null);

  // Check browser support and register service worker
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'Notification' in window;
    setIsSupported(supported);
    setPermission(Notification?.permission || 'default');

    if (supported && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Service worker registration optional
      });
    }
  }, []);

  // Request permission
  const requestPermission = async () => {
    if (!isSupported) return false;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (err) {
      console.error('Push notification permission denied', err);
      return false;
    }
  };

  // Send local notification
  const sendNotification = (title, options = {}) => {
    if (permission !== 'granted' || !isSupported) return;
    
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options,
      });
    } else if (window.Notification) {
      new Notification(title, options);
    }
  };

  // Subscribe to real-time booking updates
  useEffect(() => {
    if (!user || permission !== 'granted') return;

    // Listen for booking updates
    const bookingUnsub = subscribe(TABLES.bookings, (event) => {
      if (event.data?.client_email !== user.email) return;

      let title = 'Booking Update';
      let body = '';
      let icon = '📅';

      if (event.type === 'create') {
        title = '✅ Booking Confirmed';
        body = `Your ${event.data.service_type?.replace(/_/g, ' ')} on ${event.data.scheduled_date} is pending assignment.`;
        icon = '🎉';
      } else if (event.type === 'update') {
        const status = event.data.status;
        if (status === 'confirmed') {
          title = '✅ Booking Confirmed';
          body = `Your booking has been confirmed and assigned.`;
          icon = '✅';
        } else if (status === 'in_progress') {
          title = '🚀 Service In Progress';
          body = `Our team has arrived for your ${event.data.service_type?.replace(/_/g, ' ')}.`;
          icon = '🚀';
        } else if (status === 'completed') {
          title = '🎉 Service Completed';
          body = `Your ${event.data.service_type?.replace(/_/g, ' ')} is complete. Rate your experience!`;
          icon = '🎉';
        } else if (status === 'rescheduled') {
          title = '📅 Rescheduled';
          body = `Your booking has been rescheduled to ${event.data.scheduled_date}.`;
          icon = '📅';
        } else if (status === 'cancelled') {
          title = '❌ Booking Cancelled';
          body = 'Your booking has been cancelled.';
          icon = '❌';
        }
      }

      if (body) {
        sendNotification(title, {
          body,
          icon: '/icon.png',
          badge: '/badge.png',
          tag: `booking-${event.data?.id}`,
          requireInteraction: ['confirmed', 'in_progress', 'completed'].includes(event.data?.status),
          data: { url: '/Dashboard', bookingId: event.data?.id },
        });
      }
    });

    unsubscribeRef.current = bookingUnsub;
    return () => bookingUnsub?.();
  }, [user, permission]);

  return {
    isSupported,
    permission,
    requestPermission,
    sendNotification,
  };
}