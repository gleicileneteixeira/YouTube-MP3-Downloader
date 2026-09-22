import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Zap, Smartphone, Music4 } from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
  icon?: React.ReactNode;
}

const FAQS: FaqItem[] = [
  {
    question: 'Como funciona o download de MP3 por link do YouTube?',
    answer: 'Basta copiar o link de qualquer vídeo ou Shorts do YouTube, colar no campo principal e clicar em "Obter Áudio". Você poderá escolher a qualidade (ex: 320 kbps), opcionalmente cortar trechos ou editar metadados, e clicar em "Converter e Baixar".',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
  },
  {
    question: 'Qual a diferença entre as taxas de bits (128k, 192k, 256k e 320k)?',
    answer: 'O bitrate (taxa de bits) define a fidelidade do som. 320 kbps é a taxa máxima do padrão MP3, preservando timbres, agudos cristalinos e graves profundos. 192 kbps é o equilíbrio padrão para o dia a dia, enquanto 128 kbps gera arquivos menores e mais rápidos para transferir.',
    icon: <Music4 className="w-4 h-4 text-rose-400" />,
  },
  {
    question: 'Funciona em smartphones Android, iPhone e tablets?',
    answer: 'Sim! O conversor é 100% web e responsivo. No Android, o arquivo MP3 vai diretamente para a pasta "Downloads" e para o seu player de música padrão. No iOS (iPhone/iPad), o Safari baixa o arquivo que pode ser salvo no app Arquivos ou compartilhado com qualquer aplicativo de áudio.',
    icon: <Smartphone className="w-4 h-4 text-emerald-400" />,
  },
  {
    question: 'Suporta vídeos normais, YouTube Shorts e links curtos youtu.be?',
    answer: 'Sim! O sistema reconhece automaticamente todos os formatos de links oficiais do YouTube: links convencionais (youtube.com/watch?v=...), links curtos (youtu.be/...), links de Shorts (youtube.com/shorts/...) e YouTube Music.',
    icon: <ShieldCheck className="w-4 h-4 text-teal-400" />,
  },
  {
    question: 'Como cortar apenas uma parte específica da música?',
    answer: 'Ao carregar o vídeo, expanda "Opções Avançadas" e ative a chave "Cortar trecho do áudio (Trim)". Insira o tempo de início (ex: 00:30) e o tempo final (ex: 02:45). O servidor fará o recorte preciso via FFmpeg sem perder qualidade.',
    icon: <Zap className="w-4 h-4 text-purple-400" />,
  },
];

export const FaqGuide: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2 px-1">
        <HelpCircle className="w-5 h-5 text-rose-500" />
        <h2 className="text-base sm:text-lg font-bold text-white">
          Perguntas Frequentes & Dicas de Uso
        </h2>
      </div>

      <div className="space-y-3">
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="rounded-xl bg-neutral-900/80 border border-neutral-800 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggle(index)}
                className="w-full p-4 flex items-center justify-between text-left gap-3 select-none hover:bg-neutral-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {faq.icon}
                  <span className="text-xs sm:text-sm font-semibold text-neutral-200">
                    {faq.question}
                  </span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed border-t border-neutral-800/60 bg-neutral-950/40 animate-in fade-in">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
