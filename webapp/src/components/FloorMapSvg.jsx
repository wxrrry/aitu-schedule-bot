import React from 'react';
import { 
  Footprints, 
  DoorOpen, 
  Utensils, 
  Shirt, 
  Cross, 
  ShieldAlert, 
  Trophy, 
  Layers,
  Sparkles,
  MapPin
} from 'lucide-react';

export default function FloorMapSvg({
  floor = 3,
  occupancy = { freeRooms: [], occupiedRooms: [] },
  activeRoom = null,
  onSelectRoom
}) {
  const freeRooms = occupancy.freeRooms || [];
  const occupiedRooms = occupancy.occupiedRooms || [];

  const getRoomStatus = (rmName) => {
    const isFree = freeRooms.includes(rmName);
    const occInfo = occupiedRooms.find(o => o.room === rmName);
    return { isFree, occInfo };
  };

  const handleRoomClick = (rmName) => {
    const status = getRoomStatus(rmName);
    if (onSelectRoom) {
      onSelectRoom({
        room: rmName,
        isFree: status.isFree,
        occInfo: status.occInfo
      });
    }
  };

  const handleAmenityClick = (amenity) => {
    if (onSelectRoom) {
      onSelectRoom({
        room: amenity.name,
        isAmenity: true,
        desc: amenity.desc,
        zone: amenity.zone
      });
    }
  };

  return (
    <div className="w-full bg-[#08090d] border border-cyan-500/25 rounded p-2 select-none relative overflow-hidden shadow-2xl">
      {/* Blueprint background grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />

      {/* Blueprint Header Tag with Address */}
      <div className="flex items-center justify-between pb-2 px-1 border-b border-white/[0.08] text-[10px] font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-white tracking-wider">
            СХЕМА ЗДАНИЯ // КОНДРАТЬЕВСКИЙ ПРОСПЕКТ, 46
          </span>
          <span className="px-1.5 py-0.2 bg-cyan-950 border border-cyan-500/40 text-cyan-300 font-bold text-[9px]">
            {floor}-Й ЭТАЖ
          </span>
        </div>
        <span className="text-zinc-400 text-[9px] uppercase hidden sm:inline">СПБ · УЧЕБНЫЙ КОРПУС</span>
      </div>

      {/* SVG Canvas Map */}
      <div className="w-full overflow-x-auto py-1">
        <svg 
          viewBox="0 0 820 440" 
          className="w-full h-auto min-w-[660px] max-h-[410px] font-mono"
          style={{ filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.15))' }}
        >
          <defs>
            {/* Pattern for stairs */}
            <pattern id="stairsPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />
            </pattern>

            {/* Pattern for gym court */}
            <pattern id="gymLines" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#1e1b4b" fillOpacity="0.35" />
              <circle cx="20" cy="20" r="14" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.35" />
            </pattern>
          </defs>

          {/* Exterior Street Labels (Ориентация по сторонам света и улицам) */}
          {/* Top: Courtyard */}
          <rect x="250" y="4" width="320" height="18" rx="3" fill="#18181b" stroke="#3f3f46" strokeWidth="0.8" />
          <text x="410" y="16" fill="#a1a1aa" fontSize="8" fontWeight="bold" textAnchor="middle">
            ▼ ВНУТРЕННИЙ ДВОР (ОКНА ВО ДВОР) ▼
          </text>

          {/* Bottom: Kondratyevsky Prospekt */}
          <rect x="220" y="418" width="380" height="18" rx="3" fill="#0c4a6e" fillOpacity="0.3" stroke="#0284c7" strokeWidth="1" />
          <text x="410" y="430" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="middle">
            ▲ КОНДРАТЬЕВСКИЙ ПРОСПЕКТ // ГЛАВНЫЙ ФАСАД ЗДАНИЯ ▲
          </text>

          {/* Left Wing label */}
          <text x="18" y="220" fill="#71717a" fontSize="7.5" textAnchor="middle" transform="rotate(-90 18 220)">
            ◄ КРЫЛО «А» (ПР. МЕТАЛЛИСТОВ)
          </text>

          {/* Right Wing label */}
          <text x="802" y="220" fill="#71717a" fontSize="7.5" textAnchor="middle" transform="rotate(90 802 220)">
            КРЫЛО «Б» (ПОЛЮСТРОВСКИЙ ПР.) ►
          </text>

          {/* Outer Building Walls (Контур корпуса Кондратьевский 46) */}
          <rect 
            x="36" y="28" width="748" height="380" rx="10" 
            fill="#090d16" 
            stroke="#0ea5e9" strokeWidth="2" strokeOpacity="0.6" 
          />
          <rect 
            x="42" y="34" width="736" height="368" rx="8" 
            fill="none" 
            stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.08" 
          />

          {/* Left Wing Stairs & Elevators (Лестница №1 и Лифты) */}
          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Лестница №1 (Главная)", zone: "Западное крыло", desc: "Главный лестничный марш для подъема на 1–8/9 этажи" })}>
            <rect x="48" y="160" width="64" height="110" rx="4" fill="url(#stairsPattern)" stroke="#38bdf8" strokeWidth="1" />
            <rect x="48" y="160" width="64" height="110" rx="4" fill="#0369a1" fillOpacity="0.15" />
            <text x="80" y="210" fill="#bae6fd" fontSize="8.5" fontWeight="bold" textAnchor="middle">ЛЕСТНИЦА</text>
            <text x="80" y="224" fill="#38bdf8" fontSize="8" textAnchor="middle">МАРШ №1</text>
            <text x="80" y="238" fill="#7dd3fc" fontSize="7" textAnchor="middle">ГЛАВНАЯ</text>
          </g>

          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Пассажирские лифты", zone: "Западный холл", desc: "Два пассажирских лифта для подъема с 1 по 8 этаж" })}>
            <rect x="48" y="280" width="64" height="60" rx="4" fill="#18181b" stroke="#0ea5e9" strokeWidth="1" />
            <text x="80" y="306" fill="#e4e4e7" fontSize="15" textAnchor="middle">🛗</text>
            <text x="80" y="324" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">ЛИФТЫ</text>
            <text x="80" y="334" fill="#71717a" fontSize="6.5" textAnchor="middle">1–8 ЭТАЖИ</text>
          </g>

          {/* Right Wing Stairs & Restroom (Лестница №2 и Санузлы) */}
          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Лестница №2 (Восточная)", zone: "Восточное крыло", desc: "Второй эвакуационный и переходный лестничный марш" })}>
            <rect x="708" y="160" width="64" height="110" rx="4" fill="url(#stairsPattern)" stroke="#38bdf8" strokeWidth="1" />
            <rect x="708" y="160" width="64" height="110" rx="4" fill="#0369a1" fillOpacity="0.15" />
            <text x="740" y="210" fill="#bae6fd" fontSize="8.5" fontWeight="bold" textAnchor="middle">ЛЕСТНИЦА</text>
            <text x="740" y="224" fill="#38bdf8" fontSize="8" textAnchor="middle">МАРШ №2</text>
            <text x="740" y="238" fill="#7dd3fc" fontSize="7" textAnchor="middle">ВОСТОЧНАЯ</text>
          </g>

          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Санузлы (WC)", zone: "Восточное крыло", desc: "Мужской и женский санузлы этажа" })}>
            <rect x="708" y="280" width="64" height="60" rx="4" fill="#18181b" stroke="#71717a" strokeWidth="1" />
            <text x="740" y="308" fill="#e4e4e7" fontSize="15" textAnchor="middle">🚻</text>
            <text x="740" y="326" fill="#a1a1aa" fontSize="8.5" fontWeight="bold" textAnchor="middle">САНУЗЛЫ</text>
            <text x="740" y="336" fill="#71717a" fontSize="6.5" textAnchor="middle">М / Ж</text>
          </g>

          {/* ======================================================== */}
          {/* FLOOR 1: КОНДРАТЬЕВСКИЙ 46 — ВХОД, СТОЛОВАЯ, ГАРДЕРОБ, СПОРТЗАЛ */}
          {/* ======================================================== */}
          {floor === 1 && (
            <g>
              {/* Gym (Спортивный зал - со стороны двора) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Спортивный зал (С/з)", zone: "Дворовый корпус", desc: "Большой игровой зал (баскетбол, волейбол, ОФП), тренерская и раздевалки" })}
              >
                <rect x="180" y="42" width="460" height="135" rx="6" fill="url(#gymLines)" stroke="#818cf8" strokeWidth="1.5" />
                <rect x="180" y="42" width="460" height="135" rx="6" fill="#312e81" fillOpacity="0.25" />
                {/* Court markings */}
                <ellipse cx="410" cy="109" rx="36" ry="36" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.5" />
                <line x1="410" y1="42" x2="410" y2="177" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 2" />
                <text x="410" y="105" fill="#e0e7ff" fontSize="13" fontWeight="bold" textAnchor="middle">🏀 БОЛЬШОЙ СПОРТИВНЫЙ ЗАЛ</text>
                <text x="410" y="124" fill="#a5b4fc" fontSize="9" textAnchor="middle">Занятия физической культурой · Корпус Кондратьевский 46</text>
              </g>

              {/* Student Wardrobe (Гардероб - Западное крыло) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Студенческий гардероб", zone: "Западное крыло", desc: "Гардероб студентов всех курсов, выдача и приём номерков" })}
              >
                <rect x="48" y="42" width="120" height="110" rx="6" fill="#0284c7" fillOpacity="0.18" stroke="#38bdf8" strokeWidth="1.2" />
                <text x="108" y="86" fill="#bae6fd" fontSize="20" textAnchor="middle">🧥</text>
                <text x="108" y="110" fill="#bae6fd" fontSize="10" fontWeight="bold" textAnchor="middle">ГАРДЕРОБ</text>
                <text x="108" y="125" fill="#7dd3fc" fontSize="8" textAnchor="middle">Студенческий</text>
              </g>

              {/* Canteen & Buffet (Столовая и буфет - Восточное крыло) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Столовая и буфет колледжа", zone: "Восточное крыло", desc: "Линия раздачи горячего питания, буфет, выпечка, чай и кофе" })}
              >
                <rect x="652" y="42" width="120" height="110" rx="6" fill="#b45309" fillOpacity="0.22" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="712" y="86" fill="#fef3c7" fontSize="20" textAnchor="middle">🍲</text>
                <text x="712" y="110" fill="#fef3c7" fontSize="10" fontWeight="bold" textAnchor="middle">СТОЛОВАЯ</text>
                <text x="712" y="125" fill="#fde68a" fontSize="8" textAnchor="middle">Буфет & Кофе</text>
              </g>

              {/* Central Vestibule / Hallway (Центральный холл 1 этажа) */}
              <g>
                <rect x="180" y="190" width="460" height="100" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="410" y="240" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="1.5">
                  ЦЕНТРАЛЬНЫЙ ВЕСТИБЮЛЬ // ХОЛЛ 1 ЭТАЖА
                </text>
                <text x="410" y="258" fill="#64748b" fontSize="8.5" textAnchor="middle">
                  Проход к гардеробу, столовой, лифтам и лестничным пролетам
                </text>
              </g>

              {/* Main Entrance & Turnstiles from Kondratyevsky Prospekt */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Главный вход с Кондратьевского пр.", zone: "Центральный вход", desc: "Пропускной контроль по картам колледжа и Face ID" })}
              >
                <rect x="250" y="305" width="320" height="92" rx="6" fill="#065f46" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.8" />
                <line x1="280" y1="345" x2="540" y2="345" stroke="#10b981" strokeWidth="2.5" strokeDasharray="8 6" />
                <text x="410" y="333" fill="#a7f3d0" fontSize="11.5" fontWeight="bold" textAnchor="middle">
                  🚪 ГЛАВНЫЙ ВХОД С КОНДРАТЬЕВСКОГО ПР.
                </text>
                <text x="410" y="365" fill="#6ee7b7" fontSize="8.5" textAnchor="middle">
                  Турникеты · Пропускная система колледжа
                </text>
                <text x="410" y="385" fill="#34d399" fontSize="11" textAnchor="middle">▲ ▲ ▲ ВХОД В ЗДАНИЕ ▲ ▲ ▲</text>
              </g>

              {/* Medical Room (Медпункт) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Медицинский пункт", zone: "У входа", desc: "Кабинет фельдшера, оказание первой помощи, справки" })}
              >
                <rect x="120" y="305" width="120" height="92" rx="6" fill="#881337" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1" />
                <text x="180" y="343" fill="#ffe4e6" fontSize="16" textAnchor="middle">🩺</text>
                <text x="180" y="362" fill="#fecdd3" fontSize="9.5" fontWeight="bold" textAnchor="middle">МЕДПУНКТ</text>
                <text x="180" y="378" fill="#fda4af" fontSize="7.5" textAnchor="middle">Дежурный врач</text>
              </g>

              {/* Security Post (Охрана) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Служба безопасности", zone: "У турникетов", desc: "Пост дежурной охраны, видеонаблюдение за периметром" })}
              >
                <rect x="580" y="305" width="120" height="92" rx="6" fill="#18181b" stroke="#52525b" strokeWidth="1" />
                <text x="640" y="343" fill="#f4f4f5" fontSize="16" textAnchor="middle">🛡</text>
                <text x="640" y="362" fill="#e4e4e7" fontSize="9.5" fontWeight="bold" textAnchor="middle">ОХРАНА</text>
                <text x="640" y="378" fill="#a1a1aa" fontSize="7.5" textAnchor="middle">Пост охраны</text>
              </g>
            </g>
          )}

          {/* ======================================================== */}
          {/* FLOOR 2: АКТОГВЫЙ ЗАЛ, ДЕКАНАТ, КАБ. 205, 216, 217      */}
          {/* ======================================================== */}
          {floor === 2 && (
            <g>
              {/* Assembly Hall (Актовый зал - со стороны двора) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Большой актовый зал", zone: "Центральное крыло", desc: "Конференц-зал на 250 мест, проведение собраний, концертов и олимпиад" })}
              >
                <rect x="220" y="42" width="370" height="152" rx="6" fill="#4c1d95" fillOpacity="0.25" stroke="#a855f7" strokeWidth="1.5" />
                <rect x="335" y="52" width="140" height="28" rx="3" fill="#581c87" stroke="#c084fc" strokeWidth="1" />
                <text x="405" y="71" fill="#f3e8ff" fontSize="10" fontWeight="bold" textAnchor="middle">🎭 СЦЕНА</text>
                <text x="405" y="125" fill="#f3e8ff" fontSize="13" fontWeight="bold" textAnchor="middle">БОЛЬШОЙ АКТОГВЫЙ ЗАЛ</text>
                <text x="405" y="145" fill="#d8b4fe" fontSize="9" textAnchor="middle">Кондратьевский 46 · Торжественные мероприятия</text>
              </g>

              {/* Dean's Office (Деканат / Учебная часть - Запад) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Деканат и учебная часть", zone: "Западное крыло", desc: "Учебный отдел, заведующие отделениями, справки и заявления" })}
              >
                <rect x="48" y="42" width="162" height="110" rx="6" fill="#0f766e" fillOpacity="0.25" stroke="#14b8a6" strokeWidth="1.2" />
                <text x="129" y="88" fill="#ccfbf1" fontSize="18" textAnchor="middle">🏛</text>
                <text x="129" y="110" fill="#ccfbf1" fontSize="10" fontWeight="bold" textAnchor="middle">ДЕКАНАТ</text>
                <text x="129" y="125" fill="#5eead4" fontSize="8" textAnchor="middle">Учебная часть</text>
              </g>

              {/* Central Corridor */}
              <rect x="120" y="204" width="580" height="56" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <text x="410" y="235" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                ЦЕНТРАЛЬНЫЙ КОРИДОР · 2-Й ЭТАЖ
              </text>
              <text x="410" y="250" fill="#64748b" fontSize="7.5" textAnchor="middle">
                ← к Лестнице №1 и лифтам · к Лестнице №2 и санузлам →
              </text>

              {/* Room 205 (Окно во двор) */}
              {(() => {
                const st = getRoomStatus('каб. 205');
                const isSel = activeRoom === 'каб. 205';
                return (
                  <g className="cursor-pointer" onClick={() => handleRoomClick('каб. 205')}>
                    <rect 
                      x="600" y="42" width="160" height="152" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="680" y="100" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">каб. 205</text>
                    <text x="680" y="122" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9.5" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                    </text>
                    <text x="680" y="140" fill="#9ca3af" fontSize="8" textAnchor="middle">
                      {st.isFree ? "Самоподготовка" : (st.occInfo?.group || "Пара")}
                    </text>
                  </g>
                );
              })()}

              {/* Room 216 & 217 (Окна на Кондратьевский пр.) */}
              {(() => {
                const st = getRoomStatus('каб. 216');
                const isSel = activeRoom === 'каб. 216';
                return (
                  <g className="cursor-pointer" onClick={() => handleRoomClick('каб. 216')}>
                    <rect 
                      x="220" y="270" width="180" height="120" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="310" y="322" fill="#ffffff" fontSize="13.5" fontWeight="bold" textAnchor="middle">каб. 216</text>
                    <text x="310" y="342" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                    </text>
                    <text x="310" y="360" fill="#9ca3af" fontSize="8" textAnchor="middle">
                      {st.isFree ? "Фасад Кондратьевский" : (st.occInfo?.group || "Занятие")}
                    </text>
                  </g>
                );
              })()}

              {(() => {
                const st = getRoomStatus('каб. 217');
                const isSel = activeRoom === 'каб. 217';
                return (
                  <g className="cursor-pointer" onClick={() => handleRoomClick('каб. 217')}>
                    <rect 
                      x="410" y="270" width="180" height="120" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="500" y="322" fill="#ffffff" fontSize="13.5" fontWeight="bold" textAnchor="middle">каб. 217</text>
                    <text x="500" y="342" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                    </text>
                    <text x="500" y="360" fill="#9ca3af" fontSize="8" textAnchor="middle">
                      {st.isFree ? "Фасад Кондратьевский" : (st.occInfo?.group || "Занятие")}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* ======================================================== */}
          {/* FLOORS 3 TO 9: REAL ARCHITECTURAL DUAL-LINE BLUEPRINT    */}
          {/* ======================================================== */}
          {floor >= 3 && (() => {
            const roomsOnThisFloor = {
              3: ["каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309"],
              4: ["каб. 404", "каб. 409", "каб. 422", "каб. 424", "каб. 431", "каб. 434"],
              5: ["каб. 505", "каб. 506", "каб. 507", "каб. 510", "каб. 512", "каб. 513", "каб. 514", "каб. 515", "каб. 516", "каб. 517", "каб. 520", "каб. 521"],
              6: ["каб. 601", "каб. 605", "каб. 606", "каб. 607", "каб. 608", "каб. 609", "каб. 610", "каб. 611", "каб. 612", "каб. 613", "каб. 614", "каб. 615", "каб. 616", "каб. 618", "каб. 622"],
              7: ["каб. 701", "каб. 706", "каб. 710", "каб. 711", "каб. 712", "каб. 713", "каб. 714", "каб. 715", "каб. 716", "каб. 718", "каб. 722"],
              9: ["каб. 906", "каб. 907", "каб. 908"]
            }[floor] || ["каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309"];

            // North side (окна во двор) and South side (окна на Кондратьевский пр.)
            // В здании Кондратьевский 46: нечетные номера выходят во двор, четные - на проспект
            const northRooms = roomsOnThisFloor.filter(r => {
              const num = parseInt(r.replace(/\D/g, ''), 10);
              return num % 2 !== 0;
            });
            const southRooms = roomsOnThisFloor.filter(r => {
              const num = parseInt(r.replace(/\D/g, ''), 10);
              return num % 2 === 0;
            });

            // If an imbalance occurs, ensure both rows look well balanced
            const finalNorth = northRooms.length > 0 ? northRooms : roomsOnThisFloor.slice(0, Math.ceil(roomsOnThisFloor.length / 2));
            const finalSouth = southRooms.length > 0 ? southRooms : roomsOnThisFloor.slice(Math.ceil(roomsOnThisFloor.length / 2));

            const startX = 125;
            const availableW = 570;
            const topW = (availableW - (finalNorth.length - 1) * 8) / Math.max(finalNorth.length, 1);
            const bottomW = (availableW - (finalSouth.length - 1) * 8) / Math.max(finalSouth.length, 1);

            return (
              <g>
                {/* Central Corridor with navigation guide */}
                <rect x="118" y="194" width="584" height="52" fill="#0f172a" fillOpacity="0.9" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="124" y1="220" x2="696" y2="220" stroke="#38bdf8" strokeWidth="1.2" strokeDasharray="6 4" strokeOpacity="0.5" />
                
                <text x="410" y="215" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                  ЦЕНТРАЛЬНЫЙ КОРИДОР // ЭТАЖ {floor} · КОНДРАТЬЕВСКИЙ 46
                </text>
                <text x="410" y="235" fill="#64748b" fontSize="7.5" textAnchor="middle">
                  ← Лестница №1 (Главная) и Лифты · Лестница №2 и Санузлы →
                </text>

                {/* Top Row: Окна во внутренний двор */}
                {finalNorth.map((rm, idx) => {
                  const x = startX + idx * (topW + 8);
                  const st = getRoomStatus(rm);
                  const isSel = activeRoom === rm;

                  return (
                    <g 
                      key={rm} 
                      className="cursor-pointer transition-all hover:opacity-90"
                      onClick={() => handleRoomClick(rm)}
                    >
                      <rect 
                        x={x} y="42" width={topW} height="142" rx="5"
                        fill={st.isFree ? "#064e3b" : "#451a03"} 
                        fillOpacity={isSel ? 0.65 : 0.3} 
                        stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                        strokeWidth={isSel ? 2.5 : 1.2} 
                      />
                      {/* Door slot into corridor */}
                      <rect x={x + topW / 2 - 8} y="179" width="16" height="5" fill="#38bdf8" fillOpacity="0.9" />

                      <text x={x + topW / 2} y="88" fill="#ffffff" fontSize={topW < 60 ? "9" : "12.5"} fontWeight="bold" textAnchor="middle">
                        {rm.replace('каб. ', '')}
                      </text>
                      <text x={x + topW / 2} y="106" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize={topW < 60 ? "7" : "8.5"} fontWeight="bold" textAnchor="middle">
                        {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                      </text>
                      <text x={x + topW / 2} y="124" fill="#9ca3af" fontSize="7" textAnchor="middle">
                        Окна во двор
                      </text>
                      {topW >= 70 && (
                        <text x={x + topW / 2} y="142" fill="#60a5fa" fontSize="7" textAnchor="middle" className="truncate">
                          {st.isFree ? "Самоподготовка" : (st.occInfo?.group || "Пара")}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Bottom Row: Окна на Кондратьевский проспект */}
                {finalSouth.map((rm, idx) => {
                  const x = startX + idx * (bottomW + 8);
                  const st = getRoomStatus(rm);
                  const isSel = activeRoom === rm;

                  return (
                    <g 
                      key={rm} 
                      className="cursor-pointer transition-all hover:opacity-90"
                      onClick={() => handleRoomClick(rm)}
                    >
                      <rect 
                        x={x} y="256" width={bottomW} height="134" rx="5"
                        fill={st.isFree ? "#064e3b" : "#451a03"} 
                        fillOpacity={isSel ? 0.65 : 0.3} 
                        stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                        strokeWidth={isSel ? 2.5 : 1.2} 
                      />
                      {/* Door slot into corridor */}
                      <rect x={x + bottomW / 2 - 8} y="256" width="16" height="5" fill="#38bdf8" fillOpacity="0.9" />

                      <text x={x + bottomW / 2} y="300" fill="#ffffff" fontSize={bottomW < 60 ? "9" : "12.5"} fontWeight="bold" textAnchor="middle">
                        {rm.replace('каб. ', '')}
                      </text>
                      <text x={x + bottomW / 2} y="318" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize={bottomW < 60 ? "7" : "8.5"} fontWeight="bold" textAnchor="middle">
                        {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                      </text>
                      <text x={x + bottomW / 2} y="336" fill="#9ca3af" fontSize="7" textAnchor="middle">
                        Кондратьевский пр.
                      </text>
                      {bottomW >= 70 && (
                        <text x={x + bottomW / 2} y="354" fill="#60a5fa" fontSize="7" textAnchor="middle" className="truncate">
                          {st.isFree ? "Самоподготовка" : (st.occInfo?.group || "Пара")}
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Blueprint Legend Bar */}
      <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[9px] font-mono text-zinc-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500 shadow-sm" />
            <span className="text-zinc-200">Свободен на пару</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-sm" />
            <span className="text-zinc-200">Идет занятие</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-sky-400 shadow-sm" />
            <span className="text-zinc-200">Лестницы & Лифты</span>
          </span>
        </div>
        <span className="text-cyan-400 font-bold">Нажмите на кабинет или зону для подробностей</span>
      </div>
    </div>
  );
}
