import { useState, useMemo, useEffect } from 'react';

export default function DashboardListModal({ isOpen, onClose, title, type, medicines }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Process data based on type
  const processedData = useMemo(() => {
    if (!medicines || !Array.isArray(medicines)) return [];

    let data = [...medicines];
    
    if (type === 'low_stock') {
      // Filter for low stock (e.g., <= 10)
      data = data.filter(m => (m.quantity || 0) <= 10);
    } else if (type === 'expiring') {
      // Filter for expiring within 30 days
      const today = new Date();
      data = data.filter(m => {
        if (!m.expiry_date) return false;
        try {
          const expiry = new Date(m.expiry_date);
          if (isNaN(expiry.getTime())) return false;
          const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          return daysLeft >= 0 && daysLeft <= 30;
        } catch (e) {
          return false;
        }
      });
      // Sort by nearest expiry
      data.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    }

    // Apply search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      data = data.filter(m => {
        const name = m.medicine_name || '';
        const mfg = m.manufacturer || '';
        const batch = m.batch_number || '';
        return name.toLowerCase().includes(lowerSearch) || 
               mfg.toLowerCase().includes(lowerSearch) ||
               batch.toLowerCase().includes(lowerSearch);
      });
    }

    return data;
  }, [medicines, type, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getStockStatus = (qty) => {
    if (qty === 0) return { label: 'Critical', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    if (qty <= 5) return { label: 'Critical', color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    return { label: 'Low Stock', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  const getExpiryStatus = (dateStr) => {
    const today = new Date();
    const expiry = new Date(dateStr);
    const daysLeft = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) return { days: daysLeft, color: 'bg-red-500/10 text-red-500 border-red-500/20' };
    return { days: daysLeft, color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl max-h-[90vh] glass-panel rounded-3xl border border-outline-variant/30 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300 bg-surface">
        
        {/* Header */}
        <div className="p-6 border-b border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type === 'low_stock' ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
              <span className="material-symbols-outlined text-[24px]">
                {type === 'low_stock' ? 'inventory' : 'event_busy'}
              </span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">{title}</h2>
              <p className="text-[13px] text-on-surface-variant">{processedData.length} items found</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
              <input 
                type="text" 
                placeholder="Search medicines..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-surface-container rounded-xl border border-outline-variant/30 text-[13px] focus:outline-none focus:border-primary/50 w-full sm:w-64"
              />
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-on-surface-variant transition-colors shrink-0">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface-container-lowest/50">
          {processedData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <span className="material-symbols-outlined text-[48px] text-outline-variant/50 mb-4">
                {type === 'low_stock' ? 'check_circle' : 'event_available'}
              </span>
              <h3 className="font-headline-sm text-on-surface font-bold">No Items Found</h3>
              <p className="text-[14px] text-on-surface-variant mt-1">
                {searchTerm ? 'Try adjusting your search terms.' : 'Everything looks good!'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {processedData.map(med => (
                <div key={med.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary/30 transition-colors shadow-sm">
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-label-lg font-bold text-on-surface text-[16px]">{med.medicine_name}</h4>
                      {type === 'low_stock' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStockStatus(med.quantity).color}`}>
                          {getStockStatus(med.quantity).label}
                        </span>
                      )}
                      {type === 'expiring' && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getExpiryStatus(med.expiry_date).color}`}>
                          {getExpiryStatus(med.expiry_date).days} Days Left
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-on-surface-variant">
                      <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">factory</span> {med.manufacturer || 'General'}</span>
                      {med.category && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">category</span> {med.category}</span>}
                      {type === 'expiring' && med.batch_number && (
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">tag</span> {med.batch_number}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:min-w-[200px]">
                    <div className="text-left sm:text-right">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase">Stock</p>
                      <p className={`font-mono font-bold text-[16px] ${type === 'low_stock' && med.quantity <= 5 ? 'text-error' : 'text-on-surface'}`}>
                        {med.quantity}
                      </p>
                    </div>
                    
                    {type === 'low_stock' ? (
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase">Price</p>
                        <p className="font-mono font-bold text-[16px] text-primary">₹{Number(med.unit_price).toFixed(2)}</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-on-surface-variant uppercase">Expiry</p>
                        <p className={`font-mono font-bold text-[14px] ${getExpiryStatus(med.expiry_date).days <= 7 ? 'text-error' : 'text-on-surface'}`}>
                          {new Date(med.expiry_date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
