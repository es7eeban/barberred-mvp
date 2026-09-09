import { useState, useEffect } from 'react';
import { Scissors, Database, Server, Globe, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function App() {
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [backendMessage, setBackendMessage] = useState<string>('');

  const checkBackend = async () => {
    setBackendStatus('checking');
    try {
      const res = await fetch('/api');
      if (res.ok) {
        const text = await res.text();
        setBackendStatus('connected');
        setBackendMessage(text || 'Respuesta OK de NestJS');
      } else {
        setBackendStatus('error');
        setBackendMessage(`Error HTTP: ${res.status}`);
      }
    } catch {
      setBackendStatus('error');
      setBackendMessage('No se pudo conectar a http://localhost:3000/api');
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-3xl space-y-8">
        
        {/* Header con Marca BarberRed */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/20 text-red-500 border border-red-500/30 shadow-lg shadow-red-600/20">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Barber<span className="text-red-500">Red</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md mx-auto">
            Plataforma de agendamiento para barberías (MVP) — Metodología SDD
          </p>
        </div>

        {/* Panel de Estado de los Servicios */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h2 className="text-lg font-semibold text-slate-200">
              Estado del Entorno Local (Fase 0)
            </h2>
            <button
              onClick={checkBackend}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Tarjeta Frontend */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Frontend Web</h3>
                  <p className="text-xs text-slate-400">React + Vite + Tailwind</p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 text-xs font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>Activo (Puerto 5173)</span>
              </div>
            </div>

            {/* Tarjeta Backend */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Backend API</h3>
                  <p className="text-xs text-slate-400">NestJS (Puerto 3000)</p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 text-xs font-medium">
                {backendStatus === 'connected' && (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> Conectado: "{backendMessage}"
                  </span>
                )}
                {backendStatus === 'checking' && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Verificando conexión...
                  </span>
                )}
                {backendStatus === 'error' && (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {backendMessage}
                  </span>
                )}
              </div>
            </div>

            {/* Tarjeta PostgreSQL */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">PostgreSQL 16</h3>
                  <p className="text-xs text-slate-400">Docker + Prisma</p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-2 text-xs font-medium text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                <span>Migración & Seed Listos</span>
              </div>
            </div>

          </div>
        </div>

        {/* Resumen de Documentación SDD */}
        <div className="bg-slate-900/50 border border-slate-800/60 rounded-2xl p-6 text-sm text-slate-400 space-y-3">
          <h3 className="text-white font-semibold text-base">Especificaciones SDD del MVP disponibles:</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <li className="p-2 bg-slate-950/40 rounded border border-slate-800/60">
              📄 <strong className="text-slate-200">functional-spec.md</strong>: Reglas de negocio y turnos 45+15m
            </li>
            <li className="p-2 bg-slate-950/40 rounded border border-slate-800/60">
              ⚙️ <strong className="text-slate-200">technical-spec.md</strong>: Modelo Prisma, endpoints y Twilio
            </li>
            <li className="p-2 bg-slate-950/40 rounded border border-slate-800/60">
              🎨 <strong className="text-slate-200">design-reference.md</strong>: Tokens, wireframes y mobile-first
            </li>
            <li className="p-2 bg-slate-950/40 rounded border border-slate-800/60">
              🚀 <strong className="text-slate-200">development-plan.md</strong>: Plan de fases y pruebas de calidad
            </li>
          </ul>
        </div>

      </div>
    </div>
  );
}
