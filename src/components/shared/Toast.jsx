const Toast = ({ message, type = 'success', onClose }) => {
  const isSuccess = type === 'success';
  const isError = type === 'error';

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-8 fade-in duration-500">
      <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
        isSuccess 
          ? 'bg-primary/20 border-primary/30 text-primary' 
          : isError 
            ? 'bg-error/20 border-error/30 text-error'
            : 'bg-surface-container/20 border-white/10 text-on-surface'
      }`}>
        <span className="material-symbols-outlined text-[20px]">
          {isSuccess ? 'check_circle' : isError ? 'error' : 'info'}
        </span>
        <p className="font-label-md text-label-md font-bold whitespace-nowrap">{message}</p>
        <button 
          onClick={onClose}
          className="ml-4 p-1 hover:bg-white/10 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
};

export default Toast;
