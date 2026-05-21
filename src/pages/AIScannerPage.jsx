import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Webcam from 'react-webcam';
import { analyzeMedicineImage } from '../services/nvidiaAI';
import { supabase } from '../lib/supabase';
import { useMedicines } from '../hooks/useMedicines';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Clock, Package, Layers, RefreshCw, Zap, Sparkles, Plus, Minus, AlertTriangle, ArrowRight, Search, ShieldCheck, Upload, Camera, FileText, Database, X, Tag, MapPin } from 'lucide-react';

const TABS = ['upload', 'camera'];

const getDeterministicRack = (medName) => {
  if (!medName) return 'Rack A-01';
  const char = medName.charAt(0).toUpperCase();
  let num = 0;
  for (let i = 0; i < medName.length; i++) {
    num += medName.charCodeAt(i);
  }
  const section = (num % 5) + 1;
  const shelf = (num % 4) + 1;
  return `Rack ${char}-${section < 10 ? '0' + section : section} (Shelf ${shelf})`;
};

const getStockHealth = (med) => {
  const quantity = Number(med?.quantity) || 0;
  const expiry = med?.expiry_date ? new Date(med.expiry_date) : null;
  const today = new Date();
  const daysLeft = expiry ? Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)) : null;

  if (quantity === 0) {
    return { status: 'Out of Stock', color: 'bg-red-500/10 text-red-500 border-red-500/30', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]', icon: AlertTriangle };
  }
  if (daysLeft !== null && daysLeft < 0) {
    return { status: 'Expired', color: 'bg-red-500/10 text-red-500 border-red-500/30', glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]', icon: AlertTriangle };
  }
  if (daysLeft !== null && daysLeft <= 30) {
    return { status: 'Expiring Soon', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]', icon: Clock };
  }
  if (quantity <= 10) {
    return { status: 'Low Stock', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', glow: 'shadow-[0_0_15px_rgba(245,158,11,0.2)]', icon: AlertCircle };
  }
  if (quantity <= 30) {
    return { status: 'Adequate Stock', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30', glow: 'shadow-[0_0_15px_rgba(59,130,246,0.2)]', icon: CheckCircle2 };
  }
  return { status: 'Optimal', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.2)]', icon: Zap };
};

export default function AIScannerPage() {
  const { medicines, add, update } = useMedicines();
  const { showToast } = useUI();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const fileRef = useRef();
  const webcamRef = useRef(null);

  const [activeTab, setActiveTab] = useState('upload');
  const [imageUrl, setImageUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState('');
  
  // Pipeline & Intelligence states
  const [scanResultMode, setScanResultMode] = useState('idle'); // idle, scanning, found, not_found, register, error
  const [matchedMedicine, setMatchedMedicine] = useState(null);
  const [similarMedicines, setSimilarMedicines] = useState([]);
  const [lastSoldTime, setLastSoldTime] = useState('No recent sales');
  
  // Quantity Selector for current scanned match
  const [selectedQty, setSelectedQty] = useState(1);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const compressImage = async (imageSource) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const MAX_DIM = 800; // Resize so max dimension is 800px (< 500KB target)
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
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const b64 = dataUrl.split(',')[1];
        resolve(b64);
      };
      img.onerror = () => reject(new Error("Failed to load or resize image matrix"));
      img.src = imageSource;
    });
  };

  const convertImageToBase64 = async (imageSource) => {
    try {
      const b64Compressed = await compressImage(imageSource);
      return b64Compressed;
    } catch (e) {
      console.warn("Canvas compression fallback to direct read:", e);
      if (typeof imageSource === 'string' && imageSource.startsWith('data:image')) {
        return imageSource.split(',')[1] || imageSource;
      }
      const response = await fetch(imageSource);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  };

  const runExtraction = async (src) => {
    setError('');
    setScanning(true);
    setScanResultMode('scanning');
    setExtracted(null);
    setSelectedQty(1);

    // Rotating progress animation messages
    const rotatingMessages = [
      'Reading medicine label...',
      'Checking active inventory...',
      'Verifying batch & expiry data...',
      'Preparing assistant results...'
    ];
    let msgIdx = 0;
    setScanStep(rotatingMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % rotatingMessages.length;
      setScanStep(rotatingMessages[msgIdx]);
    }, 1500);

    try {
      if (!import.meta.env.VITE_NVIDIA_API_KEY) {
        throw new Error("NVIDIA API key is missing. Please add VITE_NVIDIA_API_KEY to your .env file.");
      }

      const base64Str = await convertImageToBase64(src);
      const analysisResult = await analyzeMedicineImage(base64Str);
      const aiData = analysisResult.data;

      const extractedNameClean = aiData.medicine_name ? aiData.medicine_name.toLowerCase().trim() : '';
      let foundMatch = null;
      let foundSimilar = [];

      if (extractedNameClean) {
        foundMatch = medicines.find(m => m.medicine_name.toLowerCase().trim() === extractedNameClean);
        if (!foundMatch) {
          foundMatch = medicines.find(m => m.medicine_name.toLowerCase().includes(extractedNameClean) || extractedNameClean.includes(m.medicine_name.toLowerCase()));
        }
        
        foundSimilar = medicines.filter(m => {
          if (foundMatch && m.id === foundMatch.id) return false;
          const mName = m.medicine_name.toLowerCase();
          const prefix = extractedNameClean.substring(0, 4);
          return prefix && mName.includes(prefix);
        }).slice(0, 4);
      }

      const finalData = {
        medicine_name: aiData.medicine_name || 'Unknown Medicine',
        batch_number:  aiData.batch_number || '',
        expiry_date:   aiData.expiry_date || '',
        unit_price:    foundMatch ? String(foundMatch.unit_price) : '150.00',
        quantity:      foundMatch ? String(foundMatch.quantity) : '0',
        manufacturer:  aiData.manufacturer || '',
        dosage:        aiData.dosage || '',
        composition:   aiData.medicine_name || '',
        tablet_count:  aiData.tablet_count || '',
        medicine_type: aiData.medicine_type || 'Tablet'
      };

      setExtracted(finalData);
      setForm(finalData);

      if (foundMatch) {
        setMatchedMedicine(foundMatch);
        setScanResultMode('found');
        
        // Fetch last sold time
        try {
          const { data: salesData } = await supabase
            .from('billing_transactions')
            .select('transaction_time')
            .eq('medicine_id', foundMatch.id)
            .order('transaction_time', { ascending: false })
            .limit(1);
          if (salesData && salesData.length > 0 && salesData[0].transaction_time) {
            const date = new Date(salesData[0].transaction_time);
            setLastSoldTime(date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
          } else {
            setLastSoldTime('No recent sales');
          }
        } catch (e) {
          console.error(e);
          setLastSoldTime('No recent sales');
        }
      } else {
        setSimilarMedicines(foundSimilar);
        setScanResultMode('not_found');
      }

    } catch (err) {
      console.error("NVIDIA Vision API Extraction Error:", err);
      setError(err.message || "Unable to analyze image. Please try again.");
      setScanResultMode('error');
    } finally {
      clearInterval(interval);
      setScanning(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setExtracted(null);
    setError('');
    setScanResultMode('idle');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setExtracted(null);
    setScanResultMode('idle');
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const startCamera = () => {
    setCameraActive(true);
    setError('');
  };

  const stopCamera = () => {
    setCameraActive(false);
  };

  const captureFrame = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImageUrl(imageSrc);
        setCameraActive(false);
        setExtracted(null);
        setScanResultMode('idle');
      }
    }
  }, [webcamRef]);

  const handleConfirmRegistration = async () => {
    setError('');
    if (!form.medicine_name) return setError('Medicine name is required.');
    setSaving(true);
    
    try {
      const payload = {
        medicine_name: form.medicine_name,
        batch_number:  form.batch_number || null,
        expiry_date:   form.expiry_date || null,
        quantity:      parseInt(form.quantity) || 0,
        unit_price:    parseFloat(form.unit_price) || 0,
        manufacturer:  form.manufacturer || null
      };

      const { error } = await add(payload);
      if (error) throw new Error(error.message);
      
      showToast(`Successfully registered "${form.medicine_name}"`, 'success');
      navigate('/inventory');
      
    } catch (err) {
      console.error(err);
      setError(err.message);
      setSaving(false);
    }
  };

  const resetScanner = () => {
    setExtracted(null);
    setImageUrl(null);
    setForm({});
    setScanResultMode('idle');
    setMatchedMedicine(null);
    setSimilarMedicines([]);
    setSelectedQty(1);
  };

  const handleAddToCart = () => {
    if (!matchedMedicine) return;
    addToCart(matchedMedicine, selectedQty);
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface flex items-center gap-2.5">
          <Sparkles className="w-8 h-8 text-primary" /> Smart Assistant OCR Scanner
        </h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">Instant Google Lens style item identification, stock checking, and fast retail workflow.</p>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-body-sm font-bold text-red-600">{error}</p>
        </motion.div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side / Visual Source Selection */}
        <section className={
          scanResultMode !== 'idle'
            ? 'lg:col-span-5 space-y-6 transition-all duration-500'
            : 'lg:col-span-6 space-y-6 transition-all duration-500'
        }>
          <div className="glass-panel p-6 rounded-3xl space-y-6 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
              <h3 className="font-headline-sm text-headline-sm font-extrabold text-on-surface flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" /> Image Source
              </h3>
              {imageUrl && (
                <button onClick={() => setImageUrl(null)} className="text-[12px] text-primary hover:underline font-bold">
                  Change Photo
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="flex bg-surface-container-highest/50 p-1.5 rounded-2xl gap-2 border border-outline-variant/20 shadow-inner">
              {TABS.map(t => (
                <button key={t} onClick={() => { setActiveTab(t); setError(''); if (t !== 'camera') stopCamera(); }}
                  className={`flex-1 py-3 rounded-xl text-[13px] font-bold capitalize transition-all flex items-center justify-center gap-2 ${activeTab === t ? 'bg-white text-primary shadow-md border border-outline-variant/30 font-extrabold' : 'text-on-surface-variant hover:text-on-surface'}`}>
                  {t === 'upload' ? <Upload className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                  {t === 'upload' ? 'Upload Photo' : 'Smart Camera'}
                </button>
              ))}
            </div>

            {/* Upload Area */}
            {activeTab === 'upload' && (
              <div>
                <div
                  onClick={() => fileRef.current.click()}
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  className="relative aspect-square max-h-[420px] rounded-2xl border-2 border-dashed border-outline-variant/60 hover:border-primary transition-all cursor-pointer bg-surface-container-lowest/80 flex flex-col items-center justify-center overflow-hidden group shadow-sm"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="Uploaded package preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <div className="text-center p-8 space-y-4">
                      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform shadow-lg shadow-primary/5 text-primary">
                        <Upload className="w-10 h-10" />
                      </div>
                      <div>
                        <p className="font-headline-sm text-[16px] font-extrabold text-on-surface">Drop medicine photo here</p>
                        <p className="text-[12px] text-on-surface-variant mt-1">Supports blister packs, bottles, and packaging boxes</p>
                      </div>
                      <button type="button" className="px-5 py-2.5 bg-primary/10 text-primary font-bold rounded-xl text-[13px] hover:bg-primary/20 transition-colors shadow-sm">
                        Browse System Files
                      </button>
                    </div>
                  )}
                  {imageUrl && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <span className="text-white font-bold text-[14px] flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Click or drop new photo
                      </span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            )}

            {/* Camera Area */}
            {activeTab === 'camera' && (
              <div className="space-y-4">
                <div className="aspect-square max-h-[420px] rounded-2xl border-2 border-outline-variant/40 overflow-hidden bg-black flex items-center justify-center relative shadow-lg">
                  {imageUrl && !cameraActive ? (
                    <img src={imageUrl} alt="Captured preview" className="w-full h-full object-contain p-2" />
                  ) : cameraActive ? (
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "environment", width: 1280, height: 1280 }}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center space-y-3">
                      <Camera className="w-16 h-16 text-white/30 mx-auto" />
                      <p className="text-white/60 font-medium text-[13px]">Camera stream ready to initialize</p>
                    </div>
                  )}
                  
                  {cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
                      <div className="w-[85%] h-[65%] border-2 border-primary/80 rounded-3xl relative overflow-hidden bg-primary/5 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                        <div className="absolute top-0 left-0 w-full h-[4px] bg-emerald-400 shadow-[0_0_15px_4px_rgba(52,211,153,0.8)] animate-[scan_2.5s_ease-in-out_infinite]" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  {!cameraActive ? (
                    <button onClick={startCamera} className="w-full py-3.5 emerald-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 transition-opacity">
                      <Camera className="w-5 h-5" /> Activate Live Camera
                    </button>
                  ) : (
                    <>
                      <button onClick={captureFrame} className="flex-1 py-3.5 emerald-gradient text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 transition-opacity">
                        <Sparkles className="w-5 h-5" /> Scan Medicine
                      </button>
                      <button onClick={stopCamera} className="px-5 py-3.5 bg-surface-container-high hover:bg-surface-container-highest font-bold text-on-surface-variant rounded-xl transition-colors">
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Run Analysis Button */}
            {imageUrl && scanResultMode === 'idle' && (
              <motion.button 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => runExtraction(imageUrl)}
                className="w-full py-4 emerald-gradient text-white rounded-2xl font-headline-sm text-[16px] font-extrabold flex items-center justify-center gap-3 shadow-2xl shadow-primary/40 hover:shadow-primary/60 active:scale-[0.98] transition-all group border border-emerald-400/30"
              >
                <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                Analyze Medicine Image
              </motion.button>
            )}
          </div>
        </section>

        {/* Right Side / Assistant Results Display */}
        <section className={
          scanResultMode !== 'idle'
            ? 'lg:col-span-7 space-y-6 transition-all duration-500'
            : 'lg:col-span-6 space-y-6 transition-all duration-500'
        }>
          
          <AnimatePresence mode="wait">
            {/* IDLE STATE */}
            {scanResultMode === 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl h-full min-h-[450px] flex flex-col items-center justify-center text-center p-12 border border-outline-variant/30 shadow-sm relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
                <div className="w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center mb-6 border border-primary/30 shadow-[0_0_40px_rgba(16,185,129,0.2)] text-primary">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h3 className="font-headline-md text-headline-md font-extrabold text-on-surface mb-3">Google Lens for Pharmacy POS</h3>
                <p className="text-body-md text-on-surface-variant max-w-md mx-auto leading-relaxed">
                  Upload or snap a photo of any blister pack or medicine bottle. Our Smart Assistant instantly extracts the drug brand, validates active store inventory, checks rack locations, and prepares billing quantities seamlessly.
                </p>
                <div className="flex items-center justify-center gap-6 mt-8 text-on-surface-variant font-bold text-[13px]">
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Fast OCR Scan</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Inventory Lookup</span>
                  <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Instant Cart Billing</span>
                </div>
              </motion.div>
            )}

            {/* SCANNING & PROCESSING STATE */}
            {scanResultMode === 'scanning' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl p-12 space-y-8 border border-primary/40 bg-gradient-to-b from-surface to-primary/5 shadow-2xl shadow-primary/10 flex flex-col items-center justify-center min-h-[450px]">
                <div className="relative w-36 h-36">
                  <div className="absolute inset-0 rounded-full border-[10px] border-primary/20 border-t-primary animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center text-primary">
                    <Sparkles className="w-14 h-14 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-3 max-w-md">
                  <h3 className="font-headline-md text-[24px] font-extrabold text-on-surface">🔍 Analyzing Medicine...</h3>
                  <motion.p key={scanStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="text-[16px] text-primary font-bold bg-primary/10 py-2.5 px-6 rounded-full inline-block border border-primary/20 shadow-sm">
                    {scanStep}
                  </motion.p>
                </div>
                <p className="text-[13px] text-on-surface-variant/80 font-medium">Please hold on while our secure vision assistant cross-references your database.</p>
              </motion.div>
            )}

            {/* ERROR STATE */}
            {scanResultMode === 'error' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl p-8 space-y-6 border-2 border-red-500/40 bg-gradient-to-b from-white via-surface to-red-500/5 shadow-2xl shadow-red-500/10 text-center">
                <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto border border-red-500/30 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                  <AlertTriangle className="w-10 h-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md font-extrabold text-on-surface">Scan Failed</h3>
                  <p className="text-body-md text-on-surface-variant max-w-md mx-auto mt-2 leading-relaxed font-semibold">
                    Unable to analyze image. Please try a clearer photo or adjust lighting.
                  </p>
                  {error && <p className="text-[12px] text-red-500 font-mono mt-1">{error}</p>}
                </div>
                <div className="flex gap-4 pt-4 border-t border-outline-variant/20 max-w-md mx-auto">
                  <button onClick={() => runExtraction(imageUrl)} className="flex-1 py-4 bg-primary text-white rounded-2xl font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 hover:opacity-90 transition-all">
                    <RefreshCw className="w-5 h-5" /> Retry Scan
                  </button>
                  <button onClick={resetScanner} className="px-6 py-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-2xl text-[15px] transition-colors flex items-center gap-2">
                    <Upload className="w-5 h-5" /> Upload Another Image
                  </button>
                </div>
              </motion.div>
            )}

            {/* FOUND STATE (CLEAN PHARMACY ASSISTANT CARD) */}
            {scanResultMode === 'found' && matchedMedicine && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-primary/40 bg-surface-container-lowest">
                
                {/* Header Banner */}
                <div className="p-6 bg-gradient-to-r from-primary to-teal-700 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-lg">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                      <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-3 py-0.5 bg-white text-primary text-[11px] font-extrabold rounded-full shadow-sm">INVENTORY MATCH</span>
                        <span className="px-2 py-0.5 bg-black/20 text-white text-[11px] font-bold rounded-full font-mono">ID: {matchedMedicine.id.substring(0, 8)}</span>
                      </div>
                      <h2 className="font-headline-md text-[24px] font-extrabold text-white">{matchedMedicine.medicine_name}</h2>
                      <p className="text-white/80 text-[13px] font-medium">{matchedMedicine.manufacturer || 'Generic Brand'}</p>
                    </div>
                  </div>

                  {/* Stock Health glowing badge */}
                  {(() => {
                    const health = getStockHealth(matchedMedicine);
                    const HealthIcon = health.icon;
                    return (
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 ${health.color} bg-white/90 font-extrabold text-[13px] shadow-lg ${health.glow} shrink-0 backdrop-blur-md`}>
                        <HealthIcon className="w-5 h-5" /> {health.status}
                      </div>
                    );
                  })()}
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Clean Pharmacy Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Stock Available</span>
                      <p className={`font-headline-sm text-[20px] font-extrabold mt-1 ${matchedMedicine.quantity <= 10 ? 'text-error' : 'text-primary'}`}>{matchedMedicine.quantity} units</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Unit Selling Price</span>
                      <p className="font-headline-sm text-[20px] font-extrabold text-on-surface mt-1 font-mono">₹{Number(matchedMedicine.unit_price).toFixed(2)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-teal-600" /> Rack Location</span>
                      <p className="font-headline-sm text-[16px] font-extrabold text-teal-700 mt-1 font-mono">{getDeterministicRack(matchedMedicine.medicine_name)}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Batch Number</span>
                      <p className="font-mono text-[14px] font-bold text-on-surface mt-1">{matchedMedicine.batch_number || 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Expiry Date</span>
                      <p className="font-mono text-[14px] font-bold text-on-surface mt-1">{matchedMedicine.expiry_date ? new Date(matchedMedicine.expiry_date).toLocaleDateString('en-IN') : 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-sm flex flex-col justify-center">
                      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Last Sold Time</span>
                      <p className="text-[13px] font-bold text-on-surface-variant mt-1 line-clamp-1">{lastSoldTime}</p>
                    </div>
                  </div>

                  {/* Quantity Controls & Actions */}
                  <div className="p-6 bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-5 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
                      <div>
                        <span className="text-[13px] font-extrabold text-on-surface uppercase tracking-wider block">Select Billing Quantity</span>
                        <p className="text-[12px] text-on-surface-variant mt-0.5">Specify units to add directly to global checkout cart.</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-surface-container p-1.5 rounded-xl border border-outline-variant/40 shadow-sm">
                          <button
                            onClick={() => setSelectedQty(p => Math.max(1, p - 1))}
                            className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-primary/20 hover:text-primary font-bold text-[18px] flex items-center justify-center text-on-surface-variant active:scale-95 transition-all"
                            title="Decrease"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-12 text-center font-extrabold font-mono text-[16px] text-on-surface">{selectedQty}</span>
                          <button
                            onClick={() => setSelectedQty(p => Math.min(matchedMedicine.quantity, p + 1))}
                            disabled={selectedQty >= matchedMedicine.quantity}
                            className="w-8 h-8 rounded-lg bg-surface-container-lowest hover:bg-primary/20 hover:text-primary font-bold text-[18px] flex items-center justify-center text-on-surface-variant active:scale-95 disabled:opacity-30 transition-all"
                            title="Increase"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        {selectedQty >= matchedMedicine.quantity && (
                          <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">⚠️ Only {matchedMedicine.quantity} available</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={handleAddToCart}
                        disabled={matchedMedicine?.quantity <= 0}
                        className={`flex-1 py-4 font-extrabold rounded-2xl text-[16px] flex items-center justify-center gap-3 shadow-xl shadow-primary/30 active:scale-[0.98] transition-all ${
                          matchedMedicine?.quantity <= 0
                            ? 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed shadow-none'
                            : 'emerald-gradient text-white hover:opacity-95 font-extrabold'
                        }`}
                      >
                        <Package className="w-5 h-5" />
                        {matchedMedicine?.quantity <= 0 ? 'Out of Stock' : `Add ${selectedQty} Units to Cart`}
                      </button>
                      
                      <Link to="/inventory" className="px-6 py-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-2xl text-[15px] transition-colors flex items-center justify-center gap-2 border border-outline-variant/30">
                        <Database className="w-5 h-5" /> View Inventory Overview
                      </Link>
                    </div>
                  </div>

                  <button onClick={resetScanner} className="w-full py-3.5 bg-surface-container text-on-surface-variant hover:text-on-surface font-bold rounded-xl text-[14px] transition-colors">
                    Scan Another Blister Pack / Bottle
                  </button>
                </div>
              </motion.div>
            )}

            {/* NOT FOUND STATE */}
            {scanResultMode === 'not_found' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-500/50 bg-gradient-to-br from-white via-surface to-amber-500/5">
                <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center gap-4 shadow-lg">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                    <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <span className="px-3 py-0.5 bg-white text-amber-700 text-[11px] font-extrabold rounded-full shadow-sm">UNRECORDED PRODUCT</span>
                    <h2 className="font-headline-md text-headline-md font-extrabold text-white mt-1">❌ "{extracted?.medicine_name}" Not Found</h2>
                    <p className="text-white/80 text-[13px] font-medium">This product does not currently exist in your active shop inventory database.</p>
                  </div>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Extracted Details Preview */}
                  <div className="p-5 bg-surface-container-low border border-outline-variant/30 rounded-2xl space-y-3">
                    <span className="text-[11px] font-bold text-outline-variant uppercase tracking-wider">Extracted Label Details</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
                      <div>
                        <span className="text-on-surface-variant font-bold">Dosage</span>
                        <p className="font-extrabold text-on-surface">{extracted?.dosage || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-bold">MRP</span>
                        <p className="font-extrabold text-on-surface">₹{extracted?.unit_price || '0.00'}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-bold">Batch Number</span>
                        <p className="font-mono font-bold text-primary">{extracted?.batch_number || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-on-surface-variant font-bold">Expiry Date</span>
                        <p className="font-mono font-bold text-primary">{extracted?.expiry_date || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Similar Medicines Suggestions */}
                  {similarMedicines.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[13px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" /> Similar Products in Inventory (Avoid Duplicates)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {similarMedicines.map(sim => (
                          <div key={sim.id} className="p-4 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest flex items-center justify-between hover:border-primary/50 transition-colors">
                            <div>
                              <p className="font-bold text-[14px] text-on-surface">{sim.medicine_name}</p>
                              <p className="text-[12px] text-on-surface-variant font-medium">Stock: <span className="font-bold text-primary">{sim.quantity} units</span> • ₹{Number(sim.unit_price).toFixed(2)}</p>
                            </div>
                            <button onClick={() => { setMatchedMedicine(sim); setScanResultMode('found'); }}
                              className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-[12px] rounded-xl transition-colors">
                              Select Match
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                    <button onClick={() => setScanResultMode('register')}
                      className="flex-1 py-4 emerald-gradient text-white font-extrabold rounded-2xl text-[16px] flex items-center justify-center gap-2 shadow-xl shadow-primary/30 hover:opacity-90 active:scale-[0.98] transition-all">
                      <Plus className="w-5 h-5" /> Add New Product
                    </button>
                    <button onClick={resetScanner}
                      className="px-6 py-4 bg-surface-container hover:bg-surface-container-high text-on-surface font-bold rounded-2xl text-[15px] transition-colors">
                      Scan Again
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* REGISTER / EDIT MODE */}
            {scanResultMode === 'register' && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl border border-primary/30">
                <div className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 emerald-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm font-extrabold text-on-surface">Register New Product</h3>
                      <p className="text-[12px] text-on-surface-variant">Confirm or modify extracted OCR parameters before database entry.</p>
                    </div>
                  </div>
                  <button onClick={() => setScanResultMode(matchedMedicine ? 'found' : 'not_found')} className="p-2 hover:bg-surface-container rounded-xl text-on-surface-variant transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[12px] font-bold text-on-surface">Medicine Name *</label>
                    <input type="text" value={form.medicine_name || ''} onChange={e => set('medicine_name', e.target.value)}
                      className="w-full px-4 py-3.5 bg-surface-container-lowest border border-primary/40 rounded-xl font-bold text-on-surface focus:ring-2 focus:ring-primary/30 outline-none shadow-sm" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-on-surface">Batch Number</label>
                    <input type="text" value={form.batch_number || ''} onChange={e => set('batch_number', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl font-mono text-[13px] text-on-surface focus:border-primary/50 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-on-surface">Expiry Date</label>
                    <input type="date" value={form.expiry_date || ''} onChange={e => set('expiry_date', e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:border-primary/50 outline-none" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-on-surface">Initial Stock Quantity</label>
                    <div className="flex">
                      <input type="number" value={form.quantity || ''} onChange={e => set('quantity', e.target.value)} placeholder="0"
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-l-xl text-[13px] text-on-surface focus:border-primary/50 outline-none" />
                      <span className="inline-flex items-center px-4 bg-outline-variant/20 font-bold text-[12px] text-on-surface-variant rounded-r-xl border border-l-0 border-outline-variant/40">Units</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[12px] font-bold text-on-surface">Unit Selling Price / MRP (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[14px]">₹</span>
                      <input type="number" step="0.01" value={form.unit_price || ''} onChange={e => set('unit_price', e.target.value)} placeholder="0.00"
                        className="w-full pl-8 pr-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:border-primary/50 outline-none" />
                    </div>
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-[12px] font-bold text-on-surface">Manufacturer / Pharmaceutical Brand</label>
                    <input type="text" value={form.manufacturer || ''} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Abbott, Sun Pharma"
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/40 rounded-xl text-[13px] text-on-surface focus:border-primary/50 outline-none" />
                  </div>
                </div>

                <div className="flex gap-4 pt-4 border-t border-outline-variant/20">
                  <button onClick={() => setScanResultMode(matchedMedicine ? 'found' : 'not_found')}
                    className="px-6 py-3.5 border border-outline-variant text-on-surface font-bold rounded-xl hover:bg-surface-container transition-colors">
                    Back to Overview
                  </button>
                  <button onClick={handleConfirmRegistration} disabled={saving}
                    className="flex-1 py-3.5 emerald-gradient text-white rounded-xl font-extrabold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                    <ShieldCheck className="w-5 h-5" /> Confirm Database Entry
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

      </div>
    </div>
  );
}
