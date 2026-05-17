import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { DEMO_TRANSACTIONS, DEMO_MEDICINES } from '../data/demoInventory'

const LOCAL_STORAGE_KEY = 'pharmavision_demo_medicines_v2'

export function useBilling() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState(DEMO_TRANSACTIONS)
  const [loading, setLoading]   = useState(true)

  const fetch = useCallback(async () => {
    if (!user) {
      setSessions(DEMO_TRANSACTIONS)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('*')
        .eq('sold_by', user.id)
        .order('transaction_time', { ascending: false })
      
      if (error) {
        console.warn("Supabase billing fetch failed, falling back to demo transactions", error)
        setSessions(DEMO_TRANSACTIONS)
      } else {
        console.log("TRANSACTION DATA", data)
        setSessions(data && data.length > 0 ? data : DEMO_TRANSACTIONS)
      }
    } catch (err) {
      console.warn("Exception during billing fetch, falling back to demo transactions", err)
      setSessions(DEMO_TRANSACTIONS)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const createBill = async ({ cart, patientName = 'Walk-in Patient' }) => {
    console.log("Processing Sale:", cart)
    const cashierName = user?.email?.split('@')[0] || 'Pharmacist'

    try {
      // 1. Validate Stock first
      for (const item of cart) {
        if (item.qty > item.currentQty) {
          throw new Error(`Insufficient stock for ${item.medicine_name}`)
        }
      }

      console.log("[BILLING] Updating stock");

      const transactions = cart.map(item => ({
        id: crypto.randomUUID(),
        medicine_id: item.id,
        medicine_name: item.medicine_name,
        quantity_sold: item.qty,
        total: item.unit_price * item.qty,
        total_amount: item.unit_price * item.qty,
        sold_by: user ? user.id : 'demo-user',
        patient_name: patientName,
        transaction_time: new Date().toISOString(),
        created_at: new Date().toISOString()
      }))

      // Dual persistence update (Supabase & localStorage)
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      let currentMeds = cached ? JSON.parse(cached) : DEMO_MEDICINES;

      for (const item of cart) {
        const newQty = Math.max(0, item.currentQty - item.qty);
        const newStatus = newQty <= 0 ? "Out of Stock" : newQty <= 10 ? "Low Stock" : "Optimal";

        // Update local memory / storage copy
        currentMeds = currentMeds.map(m => m.id === item.id ? { ...m, quantity: newQty, stock_status: newStatus } : m);

        if (user && !String(item.id).startsWith('med-')) {
          const updatePayload = {
            quantity: newQty,
            updated_at: new Date().toISOString()
          };
          console.log("SUPABASE UPDATE OBJECT", JSON.stringify(updatePayload, null, 2));

          const { error: updateErr } = await supabase
            .from('medicines')
            .update(updatePayload)
            .eq('id', item.id)
            .eq('user_id', user.id);

          if (updateErr) {
            console.error("[BILLING] Failed to update stock in Supabase", updateErr);
            throw updateErr;
          }
        }
      }

      // Save updated stock to local storage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(currentMeds));
      console.log("[BILLING] Stock updated successfully");

      // Insert Transactions into local state
      setSessions(p => [...transactions, ...p])

      if (user) {
        const supabasePayload = transactions
          .filter(t => !String(t.medicine_id).startsWith('med-'))
          .map(t => ({
            id: t.id,
            medicine_id: t.medicine_id,
            medicine_name: t.medicine_name,
            quantity_sold: Number(t.quantity_sold),
            total_amount: Number(t.total_amount),
            sold_by: t.sold_by,
            transaction_time: t.transaction_time
          }));

        if (supabasePayload.length > 0) {
          console.log('FINAL BILLING INSERT PAYLOAD', supabasePayload);
          try {
            const { error: dbErr } = await supabase.from('billing_transactions').insert(supabasePayload);
            if (dbErr) {
              console.error('Supabase billing insert error:', {
                table: 'billing_transactions',
                payload: supabasePayload,
                error: dbErr,
                message: dbErr.message,
                details: dbErr.details,
                hint: dbErr.hint
              });
            } else {
              console.log('[BILLING] Supabase transaction recorded successfully');
            }
          } catch (dbErr) {
            console.error('Unexpected exception during Supabase billing insert:', dbErr);
          }
        } else {
          console.log('[BILLING] No valid Supabase UUID items in cart; simulated locally for demo items');
        }
      }

      const totalValue = cart.reduce((s, i) => s + (i.unit_price * i.qty), 0)
      const firstTx = transactions[0]

      const receiptData = {
        id: firstTx.id,
        total_amount: totalValue,
        sold_by_name: cashierName,
        transaction_time: firstTx.transaction_time,
        items: cart
      }

      return { data: receiptData, error: null }

    } catch (err) {
      console.error("[BILLING] Failed to update stock", err)
      return { data: null, error: err }
    }
  }

  const todayRevenue = () => {
    const today = new Date().toISOString().split('T')[0]
    return sessions
      .filter(s => (s.transaction_time || s.created_at || '').startsWith(today))
      .reduce((sum, s) => sum + Number(s.total_amount || s.total || 0), 0)
  }

  return { sessions, loading, createBill, refetch: fetch, todayRevenue }
}
