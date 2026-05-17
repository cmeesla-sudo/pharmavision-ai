const PaymentSuccessModal = ({ isOpen, onClose, transactionData, onDownload }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" />
      
      <div className="relative w-full max-w-md glass-card rounded-[24px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300 text-center">
        {/* Success Animation Background */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse" />
        
        <div className="p-8">
          {/* Checkmark Icon */}
          <div className="w-24 h-24 mx-auto rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 animate-bounce">
            <span className="material-symbols-outlined text-[60px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>

          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Payment Successful!</h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            The transaction was completed successfully and inventory has been updated.
          </p>

          <div className="bg-surface-container-low rounded-2xl p-5 mb-8 border border-white/5">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[13px] text-on-surface-variant">Transaction ID</span>
              <span className="text-[13px] font-mono font-bold text-on-surface">#PV-{String(transactionData?.id || '').slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[13px] text-on-surface-variant">Amount Paid</span>
              <span className="text-xl font-bold text-primary">₹{Number(transactionData?.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onDownload}
              className="py-4 rounded-xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">download</span>
              Receipt
            </button>
            <button
              onClick={onClose}
              className="py-4 rounded-xl bg-surface-container text-on-surface font-bold hover:bg-surface-container-high transition-all"
            >
              Skip
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-4 py-2 text-[12px] text-on-surface-variant hover:text-on-surface transition-colors font-semibold"
          >
            Close Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessModal;
