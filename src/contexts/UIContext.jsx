import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/shared/ConfirmModal';
import Toast from '../components/shared/Toast';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger', // danger, info, success
    itemDetails: null // For specific details like medicine name
  });

  const [toast, setToast] = useState({
    isOpen: false,
    message: '',
    type: 'success'
  });

  const showConfirm = useCallback(({ title, message, onConfirm, confirmText, cancelText, type, itemDetails }) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm: async () => {
        if (onConfirm) await onConfirm();
        setModal(prev => ({ ...prev, isOpen: false }));
      },
      confirmText: confirmText || 'Confirm',
      cancelText: cancelText || 'Cancel',
      type: type || 'danger',
      itemDetails
    });
  }, []);

  const closeConfirm = useCallback(() => {
    setModal(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ isOpen: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, isOpen: false }));
    }, 3000);
  }, []);

  return (
    <UIContext.Provider value={{ showConfirm, showToast }}>
      {children}
      {modal.isOpen && (
        <ConfirmModal 
          {...modal} 
          onClose={closeConfirm} 
        />
      )}
      {toast.isOpen && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(prev => ({ ...prev, isOpen: false }))} 
        />
      )}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};
