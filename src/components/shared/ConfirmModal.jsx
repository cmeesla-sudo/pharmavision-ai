import { useState } from 'react';

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onClose, 
  confirmText, 
  cancelText, 
  type = 'danger',
  itemDetails 
}) => {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" 
        onClick={loading ? null : onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass-card rounded-[24px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        {/* Glow Effect */}
        <div className={`absolute -top-24 -left-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${isDanger ? 'bg-error' : 'bg-primary'}`} />
        <div className={`absolute -bottom-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-20 ${isDanger ? 'bg-error' : 'bg-primary'}`} />

        <div className="relative p-6 md:p-8 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 ${isDanger ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'} border border-white/5`}>
            <span className="material-symbols-outlined text-[40px] animate-pulse">
              {isDanger ? 'delete_forever' : 'help_outline'}
            </span>
          </div>

          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">{title}</h3>
          
          {itemDetails && (
            <div className="mb-4 inline-block px-4 py-2 bg-surface-container-high rounded-xl border border-white/5">
              <p className="text-body-md font-bold text-on-surface">{itemDetails.name}</p>
              {itemDetails.batch && <p className="text-[11px] text-on-surface-variant font-mono uppercase">Batch: {itemDetails.batch}</p>}
            </div>
          )}

          <p className="text-body-md text-on-surface-variant mb-8 leading-relaxed">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3.5 rounded-xl border border-white/10 text-on-surface font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={`flex-1 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 ${
                isDanger 
                  ? 'bg-error hover:shadow-error/20' 
                  : 'bg-primary hover:shadow-primary/20'
              }`}
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  {isDanger ? 'Removing...' : 'Processing...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">
                    {isDanger ? 'delete' : 'check'}
                  </span>
                  {confirmText}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
