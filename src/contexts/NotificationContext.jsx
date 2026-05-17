import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { DEMO_NOTIFICATIONS } from '../data/demoInventory';

const NotificationContext = createContext();
const DEMO_STORAGE_KEY = 'pharmavision_demo_notifications_v2';

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Initialize notification state from localStorage if available (especially for demo persistence)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEMO_NOTIFICATIONS;
    } catch (e) {
      return DEMO_NOTIFICATIONS;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync demo notifications to localStorage whenever state changes
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(notifications));
      } catch (e) {
        console.warn("Could not save demo notifications to localStorage", e);
      }
    }
  }, [notifications, user]);

  const fetch = useCallback(async () => {
    if (!user) {
      try {
        const saved = localStorage.getItem(DEMO_STORAGE_KEY);
        setNotifications(saved ? JSON.parse(saved) : DEMO_NOTIFICATIONS);
      } catch (e) {
        setNotifications(DEMO_NOTIFICATIONS);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Supabase notification fetch failed, falling back to local demo state", error);
        setNotifications(DEMO_NOTIFICATIONS);
      } else {
        // Explicitly set data even if empty array [], preventing stale demo notifications from returning on reload
        setNotifications(data || []);
      }
    } catch (err) {
      console.warn("Exception during notification fetch", err);
      setNotifications(DEMO_NOTIFICATIONS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Real-time synchronization with Supabase table
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('realtime_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, () => {
        fetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetch]);

  const markRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (user && !String(id).startsWith('notif-')) {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        if (error) console.error("Supabase markRead error:", error);
      } catch (err) {
        console.warn("Demo mode: Mark read simulated locally");
      }
    }
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    if (user) {
      try {
        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
        if (error) console.error("Supabase markAllRead error:", error);
      } catch (err) {
        console.warn("Demo mode: Mark all read simulated locally");
      }
    }
  };

  const remove = async (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user && !String(id).startsWith('notif-')) {
      try {
        const { error } = await supabase.from('notifications').delete().eq('id', id);
        if (error) console.error("Supabase remove error:", error);
      } catch (err) {
        console.warn("Demo mode: Delete simulated locally");
      }
    }
  };

  const addNotification = async ({ title, message, type = 'info' }) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      title,
      message,
      type,
      is_read: false,
      created_at: new Date().toISOString(),
      user_id: user ? user.id : 'demo-user'
    };

    if (user) {
      try {
        const { data, error } = await supabase.from('notifications').insert([{
          title,
          message,
          type,
          is_read: false,
          user_id: user.id
        }]).select();

        if (!error && data && data[0]) {
          setNotifications(prev => [data[0], ...prev]);
          return;
        }
      } catch (err) {
        console.warn("Could not insert notification into Supabase", err);
      }
    }
    setNotifications(prev => [newNotif, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      loading,
      unreadCount,
      markRead,
      markAllRead,
      remove,
      addNotification,
      refetch: fetch
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotificationsContext = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotificationsContext must be used within NotificationProvider');
  return context;
};
