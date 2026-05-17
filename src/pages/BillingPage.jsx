import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMedicines } from '../hooks/useMedicines'
import { useBilling }   from '../hooks/useBilling'
import { useAuth }      from '../contexts/AuthContext'
import { useCart }      from '../contexts/CartContext'
import PinVerification  from '../components/shared/PinVerification'
import { generateReceipt } from '../utils/receiptGenerator'
import PaymentSuccessModal from '../components/shared/PaymentSuccessModal'
import { useUI } from '../contexts/UIContext'
import { Receipt, Trash2, ArrowLeft, CheckCircle2, ShoppingCart, User, Plus, Minus, Tag, AlertTriangle } from 'lucide-react'

export default function BillingPage() {
  const { refetch: refetchMedicines } = useMedicines()
  const { sessions, createBill, loading: billLoading } = useBilling()
  const { profile } = useAuth()
  const { showToast } = useUI()
  const { cart, increaseQuantity, decreaseQuantity, removeFromCart, clearCart, calculateTotals } = useCart()

  const [patientName, setPatient] = useState('')
  const [pinOpen, setPinOpen]     = useState(false)
  const [pinLoading, setPinLoading] = useState(false)
  const [pinError, setPinError]   = useState('')
  
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const [lastTransaction, setLastTransaction] = useState(null)

  const { subtotal, totalItems, grandTotal } = calculateTotals()

  const handleVerify = async (pin) => {
    setPinError('')
    if (pin !== (profile?.billing_pin || '1234')) {
      setPinError('Incorrect PIN. Please try again.')
      return
    }
    setPinLoading(true)
    try {
      // Map global cart structure to exact format expected by useBilling & Supabase
      const formattedCart = cart.map(item => ({
        ...item,
        id: item.medicine_id,
        qty: item.quantity,
        currentQty: item.stock_available
      }))

      const { data, error } = await createBill({ cart: formattedCart, patientName: patientName || 'Walk-in Patient' })
      if (error) {
        showToast(error.message || 'Payment Failed', 'error')
        setPinError(error.message)
        return
      }
      
      // Refresh inventory and global state
      await refetchMedicines()
      clearCart()
      
      setLastTransaction(data)
      setPinOpen(false)
      setPatient('')
      setSuccessModalOpen(true)
      showToast('Payment successful! Stock updated.', 'success')
    } catch (err) {
      console.error("Billing Flow Error:", err)
      showToast('Critical error during payment. Check logs.', 'error')
      setPinError('Transaction failed. Try again.')
    } finally {
      setPinLoading(false)
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
            <ShoppingCart className="w-8 h-8 text-primary" /> Active POS Checkout Terminal
          </h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">Review items, adjust quantities, and confirm payment securely.</p>
        </div>
        <Link to="/inventory" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors font-bold text-[13px]">
          <ArrowLeft className="w-4 h-4" /> Back to Inventory
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT SIDE: Current Cart & Checkout */}
        <section className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-3xl space-y-6 border border-outline-variant/30 shadow-sm">
            
            {/* Patient Name section */}
            <div className="flex items-center gap-3 p-4 bg-surface-container-low border border-outline-variant/30 rounded-2xl shadow-inner">
              <User className="w-5 h-5 text-primary shrink-0" />
              <input
                type="text"
                value={patientName}
                onChange={e => setPatient(e.target.value)}
                placeholder="Enter Patient Name or ID (Optional — defaults to Walk-in)"
                className="w-full bg-transparent border-none text-[14px] font-semibold text-on-surface placeholder:text-on-surface-variant/50 focus:ring-0 outline-none"
              />
            </div>

            {/* Itemized Cart List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <span className="text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider">Itemized Cart Contents ({totalItems} Units)</span>
                {cart.length > 0 && (
                  <button onClick={clearCart} className="text-[12px] font-bold text-error flex items-center gap-1 hover:underline">
                    <Trash2 className="w-3.5 h-3.5" /> Empty Cart
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="p-16 text-center space-y-4 rounded-2xl bg-surface-container-lowest border border-dashed border-outline-variant/40">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto text-primary">
                    <ShoppingCart className="w-8 h-8 opacity-60" />
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-extrabold">Your Global Cart is Empty</h3>
                    <p className="text-[13px] text-on-surface-variant max-w-md mx-auto mt-1">Add medicines from the Inventory overview or AI Blister Pack Scanner to start billing.</p>
                  </div>
                  <Link to="/inventory" className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-on-primary font-bold rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all text-[14px]">
                    Browse Inventory
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/20 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm">
                  {cart.map(item => (
                    <div key={item.medicine_id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-low/50 transition-colors">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 font-bold text-[16px]">
                          {item.medicine_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-headline-sm text-[15px] font-extrabold text-on-surface truncate">{item.medicine_name}</h4>
                          <p className="text-[12px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                            <span>MRP: <b className="text-primary font-mono">₹{Number(item.unit_price).toFixed(2)}</b></span>
                            <span>•</span>
                            <span>Batch: <b className="font-mono">{item.batch_number || 'N/A'}</b></span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-3 sm:pt-0 border-outline-variant/20">
                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3 bg-surface-container-low p-1.5 rounded-xl border border-outline-variant/30">
                          <button
                            onClick={() => decreaseQuantity(item.medicine_id)}
                            className="w-7 h-7 rounded-lg bg-surface-container hover:bg-primary/20 hover:text-primary flex items-center justify-center font-bold transition-all text-on-surface-variant active:scale-95"
                            title="Decrease"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-extrabold text-[14px] text-on-surface">{item.quantity}</span>
                          <button
                            onClick={() => increaseQuantity(item.medicine_id)}
                            disabled={item.quantity >= item.stock_available}
                            className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                            title="Increase"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Subtotal & Delete */}
                        <div className="flex items-center gap-4 min-w-[110px] justify-end">
                          <div className="text-right">
                            <span className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Subtotal</span>
                            <span className="font-extrabold text-[16px] text-primary font-mono">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.medicine_id)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Bill Calculation Summary */}
            <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/30 space-y-4 shadow-sm">
              <div className="space-y-2 pb-4 border-b border-outline-variant/30 text-[14px]">
                <div className="flex justify-between font-semibold text-on-surface-variant">
                  <span>Subtotal Amount</span>
                  <span className="font-mono text-on-surface font-extrabold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-on-surface-variant">
                  <span>Total Items Count</span>
                  <span className="font-mono text-on-surface font-extrabold">{totalItems} Units</span>
                </div>
                <div className="flex justify-between font-semibold text-emerald-600">
                  <span className="flex items-center gap-1.5"><Tag className="w-4 h-4" /> Member Discount</span>
                  <span className="font-mono font-extrabold">−₹0.00</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[12px] font-extrabold text-on-surface-variant uppercase tracking-wider block">Grand Total Due</span>
                  <span className="font-headline-md text-headline-md font-extrabold text-primary font-mono">₹{grandTotal.toFixed(2)}</span>
                </div>

                <button
                  onClick={() => cart.length > 0 && setPinOpen(true)}
                  disabled={cart.length === 0 || pinLoading}
                  className={`px-8 py-4 emerald-gradient text-white font-extrabold rounded-2xl text-[16px] flex items-center gap-3 shadow-xl shadow-primary/30 hover:opacity-95 active:scale-[0.98] transition-all ${
                    cart.length === 0 ? 'opacity-40 cursor-not-allowed shadow-none' : ''
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirm Payment
                </button>
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT SIDE: Recent Transactions & History */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-outline-variant/30 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-[16px] font-extrabold text-on-surface flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" /> Recent POS Transactions
              </h3>
              <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">Live Feed</span>
            </div>

            {billLoading ? (
              <div className="p-12 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[36px] animate-spin">refresh</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-12 text-center text-on-surface-variant text-[13px]">
                No previous billing transactions recorded.
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[520px] custom-scrollbar pr-1">
                {sessions.slice(0, 8).map(tx => {
                  const txTime = tx.transaction_time ?? tx.created_at;
                  const dateStr = txTime ? new Date(txTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : "No Date";
                  const amount = Number((tx.total_amount ?? tx.total) || 0);
                  const title = tx.medicine_name ? `${tx.medicine_name} (${tx.quantity_sold ?? 1}x)` : tx.patient_name || 'Walk-in Patient';
                  return (
                    <div key={tx.id} className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex items-center justify-between gap-3 shadow-sm hover:border-primary/40 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[13px] text-on-surface truncate">{title}</p>
                          <p className="text-[11px] text-on-surface-variant mt-0.5">{dateStr} • {tx.patient_name || 'Walk-in'}</p>
                        </div>
                      </div>
                      <span className="font-extrabold text-[14px] text-primary shrink-0 font-mono">₹{amount.toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

      </div>

      {/* PIN Verification Modal */}
      <PinVerification
        isOpen={pinOpen}
        onClose={() => { setPinOpen(false); setPinError('') }}
        onVerify={handleVerify}
        loading={pinLoading}
        externalError={pinError}
      />

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        transactionData={lastTransaction}
        onDownload={() => generateReceipt(lastTransaction, lastTransaction ? lastTransaction.items : [])}
      />
    </div>
  )
}
