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
  Sparkles
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
    <div className="w-full bg-[#08090d] border border-cyan-500/20 rounded p-2 select-none relative overflow-hidden shadow-2xl">
      {/* Background blueprint grid watermark */}
      <div 
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Blueprint Header Tag */}
      <div className="flex items-center justify-between pb-2 px-1 border-b border-white/[0.06] text-[10px] font-mono text-cyan-400/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold tracking-wider">AITU ARCHITECTURAL BLUEPRINT // ЭТАЖ {floor}</span>
        </div>
        <span className="text-zinc-500 text-[9px] uppercase">ВЕКТОРНАЯ 2D СХЕМА</span>
      </div>

      {/* SVG Canvas Map */}
      <div className="w-full overflow-x-auto py-1">
        <svg 
          viewBox="0 0 800 420" 
          className="w-full h-auto min-w-[620px] max-h-[380px] font-mono"
          style={{ filter: 'drop-shadow(0 0 1px rgba(0, 240, 255, 0.2))' }}
        >
          <defs>
            {/* Blueprint hatching pattern for stairs */}
            <pattern id="stairsPattern" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="10" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.4" />
            </pattern>

            {/* Pattern for gym court */}
            <pattern id="gymLines" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#1e1b4b" fillOpacity="0.3" />
              <circle cx="20" cy="20" r="12" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.3" />
            </pattern>
          </defs>

          {/* Outer Building Walls */}
          <rect 
            x="40" y="30" width="720" height="360" rx="10" 
            fill="#0b0e14" 
            stroke="#0ea5e9" strokeWidth="2" strokeOpacity="0.5" 
          />
          <rect 
            x="46" y="36" width="708" height="348" rx="8" 
            fill="none" 
            stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.1" 
          />

          {/* Left Wing Stairs & Elevator (Лестница А) */}
          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Лестничный марш А", zone: "Западное крыло", desc: "Основная лестница для подъема на 1–9 этажи" })}>
            <rect x="52" y="160" width="60" height="100" rx="4" fill="url(#stairsPattern)" stroke="#38bdf8" strokeWidth="1" />
            <rect x="52" y="160" width="60" height="100" rx="4" fill="#0369a1" fillOpacity="0.15" />
            <text x="82" y="215" fill="#bae6fd" fontSize="9" fontWeight="bold" textAnchor="middle">ЛЕСТНИЦА</text>
            <text x="82" y="228" fill="#38bdf8" fontSize="8" textAnchor="middle">МАРШ «А»</text>
          </g>

          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Лифтовой холл", zone: "Западное крыло", desc: "Пассажирские лифты на верхние этажи" })}>
            <rect x="52" y="270" width="60" height="55" rx="4" fill="#18181b" stroke="#71717a" strokeWidth="1" />
            <text x="82" y="298" fill="#e4e4e7" fontSize="14" textAnchor="middle">🛗</text>
            <text x="82" y="315" fill="#a1a1aa" fontSize="8" textAnchor="middle">ЛИФТ</text>
          </g>

          {/* Right Wing Stairs & Restroom (Лестница Б) */}
          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Лестничный марш Б", zone: "Восточное крыло", desc: "Пожарная и переходная лестница на 1–9 этажи" })}>
            <rect x="688" y="160" width="60" height="100" rx="4" fill="url(#stairsPattern)" stroke="#38bdf8" strokeWidth="1" />
            <rect x="688" y="160" width="60" height="100" rx="4" fill="#0369a1" fillOpacity="0.15" />
            <text x="718" y="215" fill="#bae6fd" fontSize="9" fontWeight="bold" textAnchor="middle">ЛЕСТНИЦА</text>
            <text x="718" y="228" fill="#38bdf8" fontSize="8" textAnchor="middle">МАРШ «Б»</text>
          </g>

          <g className="cursor-pointer" onClick={() => handleAmenityClick({ name: "Санузлы (WC)", zone: "Восточное крыло", desc: "Мужской и женский санузлы этажа" })}>
            <rect x="688" y="270" width="60" height="55" rx="4" fill="#18181b" stroke="#71717a" strokeWidth="1" />
            <text x="718" y="298" fill="#e4e4e7" fontSize="14" textAnchor="middle">🚻</text>
            <text x="718" y="315" fill="#a1a1aa" fontSize="8" textAnchor="middle">WC</text>
          </g>

          {/* ======================================================== */}
          {/* FLOOR 1 LAYOUT: ENTRANCE, WARDROBE, CANTEEN, GYM, CLINIC */}
          {/* ======================================================== */}
          {floor === 1 && (
            <g>
              {/* Gym (Спортивный зал) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Спортивный зал (С/з)", zone: "Северная часть", desc: "Спортивный игровой зал, раздевалки и инвентарная" })}
              >
                <rect x="180" y="42" width="440" height="130" rx="6" fill="url(#gymLines)" stroke="#818cf8" strokeWidth="1.5" />
                <rect x="180" y="42" width="440" height="130" rx="6" fill="#312e81" fillOpacity="0.25" />
                {/* Court markings */}
                <ellipse cx="400" cy="107" rx="35" ry="35" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.5" />
                <line x1="400" y1="42" x2="400" y2="172" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.5" strokeDasharray="4 2" />
                <text x="400" y="103" fill="#e0e7ff" fontSize="13" fontWeight="bold" textAnchor="middle">🏀 СПОРТИВНЫЙ ЗАЛ</text>
                <text x="400" y="122" fill="#a5b4fc" fontSize="9" textAnchor="middle">Физкультурный комплекс · С/з</text>
              </g>

              {/* Student Wardrobe (Гардероб - Запад) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Студенческий гардероб", zone: "Западное крыло", desc: "Прием и выдача верхней одежды студентов всех курсов" })}
              >
                <rect x="52" y="42" width="118" height="108" rx="6" fill="#0284c7" fillOpacity="0.15" stroke="#38bdf8" strokeWidth="1.2" />
                <text x="111" y="85" fill="#bae6fd" fontSize="20" textAnchor="middle">🧥</text>
                <text x="111" y="110" fill="#bae6fd" fontSize="10" fontWeight="bold" textAnchor="middle">ГАРДЕРОБ</text>
                <text x="111" y="124" fill="#7dd3fc" fontSize="8" textAnchor="middle">Студенческий</text>
              </g>

              {/* Canteen & Buffet (Столовая и буфет AITU - Восток) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Столовая и буфет AITU", zone: "Восточное крыло", desc: "Горячие обеды, свежая выпечка, чай и кофе для студентов" })}
              >
                <rect x="630" y="42" width="118" height="108" rx="6" fill="#b45309" fillOpacity="0.2" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="689" y="85" fill="#fef3c7" fontSize="20" textAnchor="middle">🍲</text>
                <text x="689" y="110" fill="#fef3c7" fontSize="10" fontWeight="bold" textAnchor="middle">СТОЛОВАЯ</text>
                <text x="689" y="124" fill="#fde68a" fontSize="8" textAnchor="middle">Буфет & Кофе</text>
              </g>

              {/* Central Vestibule / Hallway (Центральный холл) */}
              <g>
                <rect x="180" y="185" width="440" height="95" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <text x="400" y="235" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" letterSpacing="2">
                  ЦЕНТРАЛЬНЫЙ ВЕСТИБЮЛЬ // ХОЛЛ
                </text>
                <text x="400" y="250" fill="#64748b" fontSize="8" textAnchor="middle">
                  Проход к гардеробу, столовой и лестничным пролетам
                </text>
              </g>

              {/* Main Entrance & Turnstiles (Главный вход и турникеты) */}
              <g 
                className="cursor-pointer transition-all hover:opacity-90"
                onClick={() => handleAmenityClick({ name: "Главный вход и турникеты", zone: "Южный фасад", desc: "Пропускная система AITU по картам / Face ID" })}
              >
                <rect x="250" y="295" width="300" height="85" rx="6" fill="#065f46" fillOpacity="0.25" stroke="#10b981" strokeWidth="1.5" />
                <line x1="280" y1="330" x2="520" y2="330" stroke="#10b981" strokeWidth="2" strokeDasharray="8 6" />
                <text x="400" y="322" fill="#a7f3d0" fontSize="11" fontWeight="bold" textAnchor="middle">
                  🚪 ГЛАВНЫЙ ВХОД & ТУРНИКЕТЫ
                </text>
                <text x="400" y="352" fill="#6ee7b7" fontSize="8" textAnchor="middle">
                  Пропускной контроль по картам колледжа
                </text>
                <text x="400" y="368" fill="#34d399" fontSize="12" textAnchor="middle">▲ ▲ ▲ ВХОД В ЗДАНИЕ ▲ ▲ ▲</text>
              </g>

              {/* Medical Room (Медпункт) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Медицинский пункт", zone: "У входа", desc: "Кабинет фельдшера, первичная медицинская помощь" })}
              >
                <rect x="122" y="295" width="118" height="85" rx="6" fill="#881337" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1" />
                <text x="181" y="333" fill="#ffe4e6" fontSize="15" textAnchor="middle">🩺</text>
                <text x="181" y="350" fill="#fecdd3" fontSize="9" fontWeight="bold" textAnchor="middle">МЕДПУНКТ</text>
                <text x="181" y="364" fill="#fda4af" fontSize="7.5" textAnchor="middle">Дежурный врач</text>
              </g>

              {/* Security Post (Охрана) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Пост охраны", zone: "У турникетов", desc: "Служба безопасности колледжа, видеонаблюдение" })}
              >
                <rect x="560" y="295" width="118" height="85" rx="6" fill="#18181b" stroke="#52525b" strokeWidth="1" />
                <text x="619" y="333" fill="#f4f4f5" fontSize="15" textAnchor="middle">🛡</text>
                <text x="619" y="350" fill="#e4e4e7" fontSize="9" fontWeight="bold" textAnchor="middle">ОХРАНА</text>
                <text x="619" y="364" fill="#a1a1aa" fontSize="7.5" textAnchor="middle">Пост безопасности</text>
              </g>
            </g>
          )}

          {/* ======================================================== */}
          {/* FLOOR 2 LAYOUT: ACT HALL, DEAN'S OFFICE, ROOMS 205-217   */}
          {/* ======================================================== */}
          {floor === 2 && (
            <g>
              {/* Assembly Hall (Актовый зал) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Актовый зал колледжа", zone: "Центральное крыло", desc: "Большой актовый зал для конференций, награждений и собраний" })}
              >
                <rect x="220" y="42" width="360" height="150" rx="6" fill="#4c1d95" fillOpacity="0.25" stroke="#a855f7" strokeWidth="1.5" />
                <rect x="330" y="52" width="140" height="30" rx="3" fill="#581c87" stroke="#c084fc" strokeWidth="1" />
                <text x="400" y="72" fill="#f3e8ff" fontSize="10" fontWeight="bold" textAnchor="middle">🎭 СЦЕНА</text>
                <text x="400" y="125" fill="#f3e8ff" fontSize="13" fontWeight="bold" textAnchor="middle">БОЛЬШОЙ АКТОГВЫЙ ЗАЛ</text>
                <text x="400" y="145" fill="#d8b4fe" fontSize="9" textAnchor="middle">250 посадочных мест · Мероприятия</text>
              </g>

              {/* Dean's Office (Деканат) */}
              <g 
                className="cursor-pointer"
                onClick={() => handleAmenityClick({ name: "Деканат и учебная часть", zone: "Западное крыло", desc: "Учебная часть, прием заявлений, оформление справок" })}
              >
                <rect x="52" y="42" width="158" height="108" rx="6" fill="#0f766e" fillOpacity="0.25" stroke="#14b8a6" strokeWidth="1.2" />
                <text x="131" y="88" fill="#ccfbf1" fontSize="16" textAnchor="middle">🏛</text>
                <text x="131" y="108" fill="#ccfbf1" fontSize="10" fontWeight="bold" textAnchor="middle">ДЕКАНАТ</text>
                <text x="131" y="123" fill="#5eead4" fontSize="8" textAnchor="middle">Учебная часть</text>
              </g>

              {/* Central Corridor */}
              <rect x="120" y="202" width="560" height="56" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
              <text x="400" y="235" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                ЦЕНТРАЛЬНЫЙ КОРИДОР · 2-Й ЭТАЖ
              </text>

              {/* Room 205 (East) */}
              {(() => {
                const st = getRoomStatus('каб. 205');
                const isSel = activeRoom === 'каб. 205';
                return (
                  <g className="cursor-pointer" onClick={() => handleRoomClick('каб. 205')}>
                    <rect 
                      x="590" y="42" width="158" height="150" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="669" y="100" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">каб. 205</text>
                    <text x="669" y="122" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                    </text>
                    <text x="669" y="140" fill="#9ca3af" fontSize="8" textAnchor="middle" className="truncate">
                      {st.isFree ? "Самоподготовка" : (st.occInfo?.group || "Пара")}
                    </text>
                  </g>
                );
              })()}

              {/* Room 216 & 217 (South side) */}
              {(() => {
                const st = getRoomStatus('каб. 216');
                const isSel = activeRoom === 'каб. 216';
                return (
                  <g className="cursor-pointer" onClick={() => handleRoomClick('каб. 216')}>
                    <rect 
                      x="220" y="268" width="170" height="112" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="305" y="318" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">каб. 216</text>
                    <text x="305" y="336" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
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
                      x="410" y="268" width="170" height="112" rx="6"
                      fill={st.isFree ? "#064e3b" : "#451a03"} 
                      fillOpacity={isSel ? 0.6 : 0.3} 
                      stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                      strokeWidth={isSel ? 2.5 : 1.2} 
                    />
                    <text x="495" y="318" fill="#ffffff" fontSize="13" fontWeight="bold" textAnchor="middle">каб. 217</text>
                    <text x="495" y="336" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize="9" fontWeight="bold" textAnchor="middle">
                      {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* ======================================================== */}
          {/* FLOORS 3 TO 9: DUAL-WING CORRIDOR BLUEPRINT             */}
          {/* ======================================================== */}
          {floor >= 3 && (() => {
            // Get all rooms for this floor from ALL_COLLEGE_ROOMS
            const roomsOnThisFloor = {
              3: ["каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309"],
              4: ["каб. 404", "каб. 409", "каб. 422", "каб. 424", "каб. 431", "каб. 434"],
              5: ["каб. 505", "каб. 506", "каб. 507", "каб. 510", "каб. 512", "каб. 513", "каб. 514", "каб. 515", "каб. 516", "каб. 517", "каб. 520", "каб. 521"],
              6: ["каб. 601", "каб. 605", "каб. 606", "каб. 607", "каб. 608", "каб. 609", "каб. 610", "каб. 611", "каб. 612", "каб. 613", "каб. 614", "каб. 615", "каб. 616", "каб. 618", "каб. 622"],
              7: ["каб. 701", "каб. 706", "каб. 710", "каб. 711", "каб. 712", "каб. 713", "каб. 714", "каб. 715", "каб. 716", "каб. 718", "каб. 722"],
              9: ["каб. 906", "каб. 907", "каб. 908"]
            }[floor] || ["каб. 301", "каб. 304", "каб. 305", "каб. 308", "каб. 309"];

            const half = Math.ceil(roomsOnThisFloor.length / 2);
            const topRow = roomsOnThisFloor.slice(0, half);
            const bottomRow = roomsOnThisFloor.slice(half);

            const startX = 130;
            const availableW = 540;
            const topW = (availableW - (topRow.length - 1) * 8) / Math.max(topRow.length, 1);
            const bottomW = (availableW - (bottomRow.length - 1) * 8) / Math.max(bottomRow.length, 1);

            return (
              <g>
                {/* Central Corridor */}
                <rect x="115" y="195" width="570" height="50" fill="#0f172a" fillOpacity="0.85" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="120" y1="220" x2="680" y2="220" stroke="#38bdf8" strokeWidth="1" strokeDasharray="6 4" strokeOpacity="0.5" />
                <text x="400" y="215" fill="#94a3b8" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="1">
                  ЦЕНТРАЛЬНЫЙ КОРИДОР // ЭТАЖ {floor}
                </text>
                <text x="400" y="235" fill="#64748b" fontSize="7.5" textAnchor="middle">
                  ← к Лестнице «А» и лифтам · к Лестнице «Б» и санузлам →
                </text>

                {/* Top Row Rooms (Северное крыло) */}
                {topRow.map((rm, idx) => {
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
                        fillOpacity={isSel ? 0.6 : 0.3} 
                        stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                        strokeWidth={isSel ? 2.5 : 1.2} 
                      />
                      {/* Door slot into corridor */}
                      <rect x={x + topW / 2 - 8} y="180" width="16" height="4" fill="#38bdf8" fillOpacity="0.8" />

                      <text x={x + topW / 2} y="95" fill="#ffffff" fontSize={topW < 70 ? "9" : "12"} fontWeight="bold" textAnchor="middle">
                        {rm.replace('каб. ', '')}
                      </text>
                      <text x={x + topW / 2} y="112" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize={topW < 70 ? "7" : "8.5"} fontWeight="bold" textAnchor="middle">
                        {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                      </text>
                      {topW >= 70 && (
                        <text x={x + topW / 2} y="130" fill="#9ca3af" fontSize="7" textAnchor="middle">
                          {st.isFree ? "Окно" : (st.occInfo?.group || "Пара")}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Bottom Row Rooms (Южное крыло) */}
                {bottomRow.map((rm, idx) => {
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
                        x={x} y="255" width={bottomW} height="125" rx="5"
                        fill={st.isFree ? "#064e3b" : "#451a03"} 
                        fillOpacity={isSel ? 0.6 : 0.3} 
                        stroke={isSel ? "#ffffff" : st.isFree ? "#10b981" : "#f59e0b"} 
                        strokeWidth={isSel ? 2.5 : 1.2} 
                      />
                      {/* Door slot into corridor */}
                      <rect x={x + bottomW / 2 - 8} y="255" width="16" height="4" fill="#38bdf8" fillOpacity="0.8" />

                      <text x={x + bottomW / 2} y="305" fill="#ffffff" fontSize={bottomW < 70 ? "9" : "12"} fontWeight="bold" textAnchor="middle">
                        {rm.replace('каб. ', '')}
                      </text>
                      <text x={x + bottomW / 2} y="322" fill={st.isFree ? "#6ee7b7" : "#fcd34d"} fontSize={bottomW < 70 ? "7" : "8.5"} fontWeight="bold" textAnchor="middle">
                        {st.isFree ? "СВОБОДЕН" : "ЗАНЯТ"}
                      </text>
                      {bottomW >= 70 && (
                        <text x={x + bottomW / 2} y="340" fill="#9ca3af" fontSize="7" textAnchor="middle">
                          {st.isFree ? "Окно" : (st.occInfo?.group || "Пара")}
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

      {/* Legend below the blueprint */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[9px] font-mono text-zinc-400 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-emerald-500 shadow-sm" />
            <span className="text-zinc-300">Свободен для занятий</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-500 shadow-sm" />
            <span className="text-zinc-300">Занят парой</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-cyan-400 shadow-sm" />
            <span className="text-zinc-300">Лестницы & Лифты</span>
          </span>
        </div>
        <span className="text-cyan-400 font-bold">Тапните по кабинету для информации</span>
      </div>
    </div>
  );
}
