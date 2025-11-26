import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export default function PushNotificationSetup() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window);
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('Notification permission denied');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;

      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const subscriptionJSON = subscription.toJSON();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Save subscription to database
      const { error } = await supabase.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint || '',
        p256dh: subscriptionJSON.keys?.p256dh || '',
        auth: subscriptionJSON.keys?.auth || '',
      });

      if (error) throw error;

      setIsSubscribed(true);
      toast.success('Push notifications enabled');
    } catch (error: any) {
      console.error('Error subscribing to push:', error);
      toast.error(error.message || 'Failed to enable notifications');
    }
  };

  const unsubscribeFromPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', subscription.endpoint);

        if (error) throw error;

        setIsSubscribed(false);
        toast.success('Push notifications disabled');
      }
    } catch (error: any) {
      console.error('Error unsubscribing from push:', error);
      toast.error(error.message || 'Failed to disable notifications');
    }
  };

  const sendTestNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: user?.id,
          title: 'LifePilot Test',
          body: 'This is a test notification!',
        },
      });

      if (error) throw error;
      toast.success('Test notification sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send test notification');
    }
  };

  if (!isSupported) {
    return (
      <Card className="p-6">
        <p className="text-muted-foreground text-center">
          Push notifications are not supported in your browser
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <Bell className="h-5 w-5 text-primary" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h3 className="font-semibold">Push Notifications</h3>
            <p className="text-sm text-muted-foreground">
              {isSubscribed ? 'Enabled' : 'Get reminders for your schedule'}
            </p>
          </div>
        </div>
        <Button
          variant={isSubscribed ? 'outline' : 'default'}
          onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        >
          {isSubscribed ? 'Disable' : 'Enable'}
        </Button>
      </div>
      
      {isSubscribed && (
        <Button variant="secondary" onClick={sendTestNotification} className="w-full">
          Send Test Notification
        </Button>
      )}
    </Card>
  );
}