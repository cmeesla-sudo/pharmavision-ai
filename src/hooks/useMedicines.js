import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_MEDICINES } from '../data/demoInventory'

const LOCAL_STORAGE_KEY = 'pharmavision_demo_medicines_v2'

export function useMedicines() {
  const { user } = useAuth()
  const [medicines, setMedicines] = useState(DEMO_MEDICINES)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    if (!user) {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (cached) {
        try {
          setMedicines(JSON.parse(cached))
        } catch (e) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_MEDICINES))
          setMedicines(DEMO_MEDICINES)
        }
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_MEDICINES))
        setMedicines(DEMO_MEDICINES)
      }
      setLoading(false)
      return
    }

    try {
      const { data, error: fetchErr } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (fetchErr) {
        console.warn("Supabase fetch failed, falling back to cached/demo dataset", fetchErr)
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
        setMedicines(cached ? JSON.parse(cached) : DEMO_MEDICINES)
      } else if (data && data.length > 0) {
        setMedicines(data)
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
      } else {
        // Auto-seed initial demo dataset strictly adhering to schema for new user
        console.log("Seeding initial demo inventory to Supabase for user...");
        const seedItems = DEMO_MEDICINES.map(m => ({
          medicine_name: m.medicine_name,
          batch_number: m.batch_number || null,
          expiry_date: m.expiry_date || null,
          quantity: Number(m.quantity) || 0,
          unit_price: parseFloat(m.unit_price) || 0.0,
          manufacturer: m.manufacturer || 'General',
          user_id: user.id
        }));

        const { data: insertedData, error: seedErr } = await supabase
          .from('medicines')
          .insert(seedItems)
          .select();

        if (!seedErr && insertedData && insertedData.length > 0) {
          setMedicines(insertedData)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(insertedData))
        } else {
          setMedicines(DEMO_MEDICINES)
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_MEDICINES))
        }
      }
    } catch (err) {
      console.warn("Exception during fetch, falling back to cached dataset", err)
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY)
      setMedicines(cached ? JSON.parse(cached) : DEMO_MEDICINES)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (med) => {
    const qtyNum = Number(med.quantity) || 0
    const newMed = {
      ...med,
      id: `med-${Date.now()}`,
      quantity: qtyNum,
      stock_status: qtyNum <= 0 ? "Out of Stock" : qtyNum <= 10 ? "Low Stock" : "In Stock",
      created_at: new Date().toISOString()
    }

    setMedicines(p => [newMed, ...p])

    if (user) {
      try {
        const supabaseAdd = {
          medicine_name: med.medicine_name,
          batch_number: med.batch_number || null,
          expiry_date: med.expiry_date || null,
          quantity: qtyNum,
          unit_price: parseFloat(med.unit_price) || 0.0,
          manufacturer: med.manufacturer || 'General',
          user_id: user.id
        }
        const { data: inserted, error: insertErr } = await supabase
          .from('medicines')
          .insert([supabaseAdd])
          .select()
        if (!insertErr && inserted && inserted[0]) {
          newMed.id = inserted[0].id
        }
      } catch (err) {
        console.warn("Demo mode: Insert simulated locally", err)
      }
    }
    
    setMedicines(curr => {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(curr))
      return curr
    })

    return { data: newMed, error: null }
  }

  const update = async (id, updates) => {
    if (updates.quantity !== undefined) {
      const q = Number(updates.quantity)
      updates.stock_status = q <= 0 ? "Out of Stock" : q <= 10 ? "Low Stock" : "In Stock"
    }

    setMedicines(p => {
      const updated = p.map(m => m.id === id ? { ...m, ...updates } : m)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated))
      return updated
    })

    if (user) {
      try {
        const allowedCols = ['medicine_name', 'batch_number', 'expiry_date', 'quantity', 'unit_price', 'manufacturer']
        const supabaseUpdate = { updated_at: new Date().toISOString() }
        for (const col of allowedCols) {
          if (updates[col] !== undefined) supabaseUpdate[col] = updates[col]
        }
        console.log("SUPABASE UPDATE OBJECT", JSON.stringify(supabaseUpdate, null, 2))
        await supabase.from('medicines').update(supabaseUpdate).eq('id', id).eq('user_id', user.id)
      } catch (err) {
        console.warn("Demo mode: Update simulated locally", err)
      }
    }
    return { data: { id, ...updates }, error: null }
  }

  const remove = async (id) => {
    if (user) {
      try {
        const { error: supabaseError } = await supabase.from('medicines').delete().eq('id', id).eq('user_id', user.id)
        if (supabaseError) {
          console.error("Supabase delete failed:", supabaseError)
          return { error: supabaseError }
        }
      } catch (err) {
        console.error("Delete exception:", err)
        return { error: err }
      }
    }

    setMedicines(p => {
      const filtered = p.filter(m => m.id !== id)
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered))
      return filtered
    })

    return { error: null }
  }

  // Enriched medicines with dynamic stock status
  const enrichedMedicines = medicines.map(m => {
    const qty = Number(m.quantity) || 0
    const status = qty <= 0 ? "Out of Stock" : qty <= 10 ? "Low Stock" : "In Stock"
    return {
      ...m,
      stock_status: m.stock_status || status
    }
  })

  // Computed stats
  const today = new Date()
  const in30  = new Date(today); in30.setDate(today.getDate() + 30)

  const stats = {
    total:         enrichedMedicines.length,
    lowStock:      enrichedMedicines.filter(m => m.quantity <= 10 && m.quantity > 0).length,
    expiringSoon:  enrichedMedicines.filter(m => m.expiry_date && new Date(m.expiry_date) <= in30 && new Date(m.expiry_date) >= today).length,
    expired:       enrichedMedicines.filter(m => m.expiry_date && new Date(m.expiry_date) < today).length,
    totalValue:    enrichedMedicines.reduce((s, m) => s + (m.quantity * (m.unit_price || 0)), 0),
    byCategory:    enrichedMedicines.reduce((acc, m) => {
      const cat = m.category || 'General'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {})
  }

  return { medicines: enrichedMedicines, loading, error, stats, refetch: fetch, add, update, remove }
}
