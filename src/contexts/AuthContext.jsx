import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
const DEMO_AVATAR_KEY = 'pharmavision_demo_avatar_v1'

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(() => {
    try {
      const savedAvatar = localStorage.getItem(DEMO_AVATAR_KEY)
      return {
        owner_name: 'Dr. Sarah Mitchell',
        pharmacy_name: 'MedLife Central POS',
        mobile: '+91 98765 43210',
        avatar_url: savedAvatar || null
      }
    } catch (e) {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error("Error fetching profile:", error)
    } else if (data) {
      setProfile(data)
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { 
        try {
          const savedAvatar = localStorage.getItem(DEMO_AVATAR_KEY)
          setProfile({
            owner_name: 'Dr. Sarah Mitchell',
            pharmacy_name: 'MedLife Central POS',
            mobile: '+91 98765 43210',
            avatar_url: savedAvatar || null
          })
        } catch (e) {
          setProfile(null)
        }
        setLoading(false) 
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = (email, password, meta) =>
    supabase.auth.signUp({ email, password, options: { data: meta } })

  const signOut = () => supabase.auth.signOut()

  const updateProfile = async (updates) => {
    if (!user) {
      // Demo mode local persistence
      if (updates.avatar_url !== undefined) {
        if (updates.avatar_url === null) localStorage.removeItem(DEMO_AVATAR_KEY)
        else localStorage.setItem(DEMO_AVATAR_KEY, updates.avatar_url)
      }
      setProfile(prev => ({ ...prev, ...updates }))
      return { data: { ...profile, ...updates }, error: null }
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) setProfile(data)
    return { data, error }
  }

  const uploadAvatar = async (file) => {
    if (!file.type.startsWith('image/')) {
      throw new Error("Selected file must be an image (JPEG, PNG, WEBP)");
    }

    // Client-side image compression & sizing via HTML5 Canvas
    const dataUrl = await new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_DIM = 400; // Perfect square dimension for avatars
        let width = img.width;
        let height = img.height;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = MAX_DIM;
        canvas.height = MAX_DIM;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, MAX_DIM, MAX_DIM);
        
        // Center crop image
        const offsetX = (MAX_DIM - width) / 2;
        const offsetY = (MAX_DIM - height) / 2;
        ctx.drawImage(img, offsetX, offsetY, width, height);

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image for compression"));
      img.src = url;
    });

    if (!user) {
      // Demo Mode
      const { error } = await updateProfile({ avatar_url: dataUrl });
      if (error) throw error;
      return dataUrl;
    }

    // Convert dataUrl to blob for Supabase Storage
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const bucket = 'profile-images';
    const filePath = `${user.id}/avatar_${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg'
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}. Ensure bucket '${bucket}' exists and allows authenticated uploads.`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const { error: profileError } = await updateProfile({ avatar_url: publicUrl });
    if (profileError) throw profileError;

    return publicUrl;
  };

  const removeAvatar = async () => {
    if (!user) {
      await updateProfile({ avatar_url: null });
      return;
    }

    const { error } = await updateProfile({ avatar_url: null });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      updateProfile,
      uploadAvatar,
      removeAvatar,
      fetchProfile
    }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
