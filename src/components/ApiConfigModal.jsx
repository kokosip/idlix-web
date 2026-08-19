import React, { useState } from 'react';
import { X, Server, Check, AlertCircle, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { getApiBaseUrl, setApiBaseUrl, checkApiStatus } from '../services/api';

export default function ApiConfigModal({ isOpen, onClose, onStatusUpdated }) {
  const [url, setUrl] = useState(getApiBaseUrl());
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const clean = setApiBaseUrl(url);
    setUrl(clean);

    const res = await checkApiStatus();
    setIsTesting(false);
    
    if (res.success) {
      setTestResult({
        success: true,
        message: 'Koneksi ke IDLIX API Server Berhasil!',
        data: res.data,
      });
      if (onStatusUpdated) onStatusUpdated(true);
    } else {
      setTestResult({
        success: false,
        message: `Gagal terhubung ke API Host: ${res.error}`,
      });
      if (onStatusUpdated) onStatusUpdated(false);
    }
  };

  const handleSave = () => {
    setApiBaseUrl(url);
    handleTestConnection();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md glass-panel rounded-3xl overflow-hidden shadow-2xl border border-dark-border p-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-dark-border/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Pengaturan API Host</h3>
              <p className="text-xs text-gray-400">IDLIX REST API Server Config</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-dark-card text-gray-400 hover:text-white hover:bg-dark-hover transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
              Base URL Endpoint:
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:3000"
                className="w-full bg-dark-card border border-dark-border rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <LinkIcon className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5">
              Ubah ke port/host tempat Anda menjalankan server <code className="text-brand-500 font-mono">idlix-api</code>.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 font-semibold">Preset:</span>
            <button
              type="button"
              onClick={() => setUrl('http://localhost:3000')}
              className="px-2.5 py-1 rounded-md bg-dark-card border border-dark-border text-[11px] text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              localhost:3000
            </button>
            <button
              type="button"
              onClick={() => setUrl('http://localhost:8080')}
              className="px-2.5 py-1 rounded-md bg-dark-card border border-dark-border text-[11px] text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              localhost:8080
            </button>
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {testResult.success ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="font-bold">{testResult.message}</div>
                {testResult.data && (
                  <div className="text-[10px] opacity-80 mt-1 truncate">
                    Status: {JSON.stringify(testResult.data)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-dark-card border border-dark-border hover:bg-dark-hover text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-brand-500' : ''}`} />
            <span>{isTesting ? 'Mengecek...' : 'Tes Koneksi'}</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold shadow-glow-red transition-all"
          >
            Simpan & Pakai
          </button>
        </div>

      </div>
    </div>
  );
}
