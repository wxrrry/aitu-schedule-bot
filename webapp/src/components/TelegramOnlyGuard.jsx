import React from 'react';
import { Send, QrCode, Smartphone, ShieldCheck, ExternalLink } from 'lucide-react';

export default function TelegramOnlyGuard() {
  const botUrl = "https://t.me/aituraspisaniebot";

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col justify-between p-4 sm:p-6 font-sans selection:bg-white selection:text-black">
      {/* Top Header */}
      <header className="flex items-center justify-between max-w-md mx-auto w-full pt-2 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="px-1.5 py-0.5 bg-white text-black font-black text-xs tracking-tight rounded-xs select-none font-mono">
            AITU
          </div>
          <span className="font-bold text-xs tracking-[0.15em] text-white uppercase font-sans">
            AITU // СЕТЬ
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-900 border border-neutral-700 text-zinc-400 font-mono text-[10px] uppercase tracking-wider">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>MINI APP ONLY</span>
        </div>
      </header>

      {/* Main Content Card */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-8 text-center">
        
        {/* Telegram Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-[#229ED9]/10 border border-[#229ED9]/30 flex items-center justify-center mb-5 shadow-lg shadow-[#229ED9]/5">
          <Send className="w-7 h-7 text-[#229ED9] ml-0.5 -mt-0.5" />
        </div>

        <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-white mb-2 font-mono">
          ДОСТУП ЧЕРЕЗ TELEGRAM
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto mb-6 leading-relaxed">
          Веб-приложение расписания и сервисов колледжа работает исключительно как защищенный <span className="text-white font-semibold">Telegram Mini App</span>.
        </p>

        {/* QR Code Container with High-tech styling */}
        <div className="relative p-3 bg-white rounded-xl shadow-2xl mb-4 group transition-transform hover:scale-[1.02]">
          <img 
            src="/qr_bot.png" 
            alt="QR-код бота @aituraspisaniebot" 
            className="w-48 h-48 sm:w-52 sm:h-52 object-contain block"
          />
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-white" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-white" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-white" />
          <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-white" />
        </div>

        <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] uppercase tracking-wider mb-6">
          <QrCode className="w-3.5 h-3.5" />
          <span>Наведите камеру смартфона для входа</span>
        </div>

        {/* Action Button */}
        <div className="w-full space-y-2.5">
          <a
            href={botUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 bg-[#229ED9] hover:bg-[#1e8ec3] active:scale-95 text-white font-mono text-xs font-black tracking-wider uppercase transition-all rounded-xs shadow-md flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 fill-current" />
            <span>ОТКРЫТЬ В TELEGRAM (@aituraspisaniebot)</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          <div className="p-3 bg-neutral-900/80 border border-neutral-800 rounded-xs text-left space-y-1">
            <div className="font-mono text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
              КАК ЗАПУСТИТЬ:
            </div>
            <ol className="text-[11px] text-zinc-300 space-y-0.5 list-decimal list-inside font-sans">
              <li>Откройте бота <span className="font-mono text-white">@aituraspisaniebot</span></li>
              <li>Нажмите синюю кнопку <span className="font-semibold text-white">«Открыть приложение»</span> слева от поля ввода</li>
            </ol>
          </div>

          
        </div>

      </main>
    </div>
  );
}
