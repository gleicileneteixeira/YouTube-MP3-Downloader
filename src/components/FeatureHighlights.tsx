import React from 'react';
import { Zap, Music, ShieldCheck, Smartphone } from 'lucide-react';

export const FeatureHighlights: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 pt-6">
      <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-left space-y-1.5">
        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-neutral-200">Alta Velocidade</h4>
        <p className="text-[11px] text-neutral-400 leading-snug">
          Servidores otimizados para extrair o áudio em segundos.
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-left space-y-1.5">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
          <Music className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-neutral-200">Até 320 kbps</h4>
        <p className="text-[11px] text-neutral-400 leading-snug">
          Qualidade acústica máxima sem compressão excessiva.
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-left space-y-1.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
          <Smartphone className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-neutral-200">Todos Dispositivos</h4>
        <p className="text-[11px] text-neutral-400 leading-snug">
          Compatível com Android, iPhone, Windows e Mac.
        </p>
      </div>

      <div className="p-3.5 rounded-xl bg-neutral-900/50 border border-neutral-800/80 text-left space-y-1.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <h4 className="text-xs font-bold text-neutral-200">Sem Anúncios Invasivos</h4>
        <p className="text-[11px] text-neutral-400 leading-snug">
          Interface limpa e focada exclusivamente no seu download.
        </p>
      </div>
    </div>
  );
};
