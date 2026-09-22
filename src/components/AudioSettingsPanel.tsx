import React, { useState } from 'react';
import { Sliders, Scissors, Tag, Check, ChevronDown, ChevronUp, Music2 } from 'lucide-react';
import { AudioBitrate, AudioFormat, ConversionSettings } from '../types';

interface AudioSettingsPanelProps {
  settings: ConversionSettings;
  setSettings: React.Dispatch<React.SetStateAction<ConversionSettings>>;
  defaultTitle?: string;
  defaultAuthor?: string;
}

const FORMAT_OPTIONS: { id: AudioFormat; label: string; desc: string; ext: string }[] = [
  { id: 'mp3', label: 'MP3', desc: 'Universal • Recomendado para todos os dispositivos', ext: '.mp3' },
  { id: 'm4a', label: 'M4A (AAC)', desc: 'Excelente qualidade Apple & celular', ext: '.m4a' },
  { id: 'wav', label: 'WAV', desc: 'Áudio puro sem compressão (estúdio)', ext: '.wav' },
  { id: 'flac', label: 'FLAC', desc: 'Alta definição lossless (sem perdas)', ext: '.flac' },
];

const BITRATE_OPTIONS: { id: AudioBitrate; label: string; tag: string }[] = [
  { id: '320k', label: '320 kbps', tag: 'Ultra HD' },
  { id: '256k', label: '256 kbps', tag: 'Alta' },
  { id: '192k', label: '192 kbps', tag: 'Padrão' },
  { id: '128k', label: '128 kbps', tag: 'Leve' },
];

export const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({
  settings,
  setSettings,
  defaultTitle,
  defaultAuthor,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFormatChange = (fmt: AudioFormat) => {
    setSettings((prev) => ({ ...prev, format: fmt }));
  };

  const handleBitrateChange = (br: AudioBitrate) => {
    setSettings((prev) => ({ ...prev, bitrate: br }));
  };

  const toggleTrim = () => {
    setSettings((prev) => ({ ...prev, trim: !prev.trim }));
  };

  return (
    <div className="w-full bg-neutral-900/60 rounded-2xl border border-neutral-800 p-4 sm:p-5 space-y-5">
      {/* Format Selection */}
      <div>
        <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
          Formato de Saída
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FORMAT_OPTIONS.map((f) => {
            const isSelected = settings.format === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => handleFormatChange(f.id)}
                className={`flex flex-col text-left p-3 rounded-xl border transition-all select-none ${
                  isSelected
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-sm shadow-rose-950/40'
                    : 'bg-neutral-900/90 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-bold text-sm sm:text-base tracking-tight">{f.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-rose-500" />}
                </div>
                <span className="text-[11px] text-neutral-400 leading-tight">
                  {f.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bitrate Selection (shown for MP3) */}
      {settings.format === 'mp3' && (
        <div>
          <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2.5">
            Qualidade / Taxa de Bits (Bitrate)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BITRATE_OPTIONS.map((b) => {
              const isSelected = settings.bitrate === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => handleBitrateChange(b.id)}
                  className={`flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all text-xs sm:text-sm font-medium select-none ${
                    isSelected
                      ? 'bg-rose-500/10 border-rose-500 text-white font-semibold'
                      : 'bg-neutral-900/90 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                >
                  <span>{b.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    isSelected ? 'bg-rose-500/20 text-rose-300' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {b.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Advanced Collapsible Header */}
      <div className="pt-2 border-t border-neutral-800/80">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full py-1 text-xs font-semibold text-neutral-400 hover:text-neutral-200 transition-colors select-none"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-rose-400" />
            Opções Avançadas (Corte de Trecho e Tags de Metadados)
          </span>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4 pt-2 animate-in fade-in">
            {/* Audio Trimmer */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-semibold text-neutral-200">
                    Cortar trecho do áudio (Trim)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleTrim}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    settings.trim ? 'bg-rose-600' : 'bg-neutral-800'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      settings.trim ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.trim && (
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div>
                    <label className="block text-neutral-400 mb-1">Início (MM:SS)</label>
                    <input
                      type="text"
                      placeholder="00:00"
                      value={settings.trimStart}
                      onChange={(e) => setSettings((p) => ({ ...p, trimStart: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Fim (MM:SS)</label>
                    <input
                      type="text"
                      placeholder="ex: 03:45"
                      value={settings.trimEnd}
                      onChange={(e) => setSettings((p) => ({ ...p, trimEnd: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-neutral-100 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ID3 Tags Editor */}
            <div className="p-3.5 rounded-xl bg-neutral-950/70 border border-neutral-800/80 space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-neutral-200">
                  Personalizar Tags do Arquivo (ID3)
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-neutral-400 mb-1">Título da Música</label>
                  <input
                    type="text"
                    placeholder={defaultTitle || 'Título da faixa'}
                    value={settings.customTitle}
                    onChange={(e) => setSettings((p) => ({ ...p, customTitle: e.target.value }))}
                    className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-rose-500 text-xs"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-neutral-400 mb-1">Artista</label>
                    <input
                      type="text"
                      placeholder={defaultAuthor || 'Nome do Artista ou Canal'}
                      value={settings.customArtist}
                      onChange={(e) => setSettings((p) => ({ ...p, customArtist: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-rose-500 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-neutral-400 mb-1">Álbum</label>
                    <input
                      type="text"
                      placeholder="YouTube MP3"
                      value={settings.customAlbum}
                      onChange={(e) => setSettings((p) => ({ ...p, customAlbum: e.target.value }))}
                      className="w-full bg-neutral-900 border border-neutral-700/80 rounded-lg px-3 py-2 text-neutral-100 focus:outline-none focus:border-rose-500 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
