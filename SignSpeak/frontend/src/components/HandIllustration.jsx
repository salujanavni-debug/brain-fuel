const TONE_BG = {
  hello: 'from-[#EDE9FE] to-[#BFDBFE]/60',
  'thank-you': 'from-[#FED7AA]/75 to-[#EDE9FE]',
  please: 'from-[#A7F3D0]/65 to-[#BFDBFE]/50',
  yes: 'from-[#A7F3D0]/75 to-[#EDE9FE]/70',
  no: 'from-[#FED7AA]/70 to-[#BFDBFE]/60',
  water: 'from-[#BFDBFE]/80 to-[#A7F3D0]/60',
  help: 'from-[#FED7AA]/85 to-[#EDE9FE]/80',
  pain: 'from-[#FED7AA]/90 to-[#FCA5A5]/45',
  doctor: 'from-[#BFDBFE]/85 to-[#EDE9FE]/70',
  friend: 'from-[#EDE9FE] to-[#A7F3D0]/60',
  love: 'from-[#EDE9FE] to-[#FED7AA]/75',
  learn: 'from-[#BFDBFE]/70 to-[#EDE9FE]',
};

function renderGestureVector(gesture) {
  switch (gesture) {
    case 'love':
      // ILY hand: thumb, index, pinky extended
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M44 82V50c0-3 2.5-5.5 5.5-5.5S55 47 55 50v17h6v-9c0-2.8 2.2-5 5-5s5 2.2 5 5v9h4v-7c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5V41c0-3 2.5-5.5 5.5-5.5S95 38 95 41v39c0 14-10.5 24-24.5 24H66c-12 0-22-9-22-22Z"
            fill="#FED7AA"
          />
          <path d="M44 69l-10-8c-2.2-1.8-2.6-5-.8-7.2 1.8-2.2 5-2.5 7.2-.7L52 62" fill="#FED7AA" />
          <path d="M61 67v8M71 67v8" />
          <path d="M98 34c2 2 3 5 2.5 8M33 44c-2 2.5-2.5 5.5-1.5 8.5" stroke="#A78BFA" />
        </g>
      );
    case 'water':
      // W-hand: 3 middle fingers extended
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M46 78V42c0-3 2.3-5.2 5.2-5.2s5.2 2.2 5.2 5.2v21l3-24c.4-3 2.9-5 5.8-4.7 2.9.3 5 2.9 4.7 5.8l-2 23 6-22c.8-2.9 3.6-4.5 6.4-3.7 2.8.8 4.4 3.7 3.6 6.5l-7 27c2 1 4.2 3.2 4.2 6.6 0 11-8.5 19.5-20.5 19.5h-4c-11.5 0-20.6-8.5-20.6-19Z"
            fill="#BFDBFE"
          />
          <path d="M35 88c8 5 18 5 26 0" stroke="#3B82F6" />
          <path d="M96 48c4 3 5 9 2 14" stroke="#60A5FA" />
        </g>
      );
    case 'help':
      // Thumbs-up resting on open palm moving upward
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 86h64c3.5 0 6 2.5 6 5.5S101.5 97 98 97H40c-4 0-6-2.5-6-5.5V86Z" fill="#A7F3D0" />
          <path
            d="M52 84V63c0-3.5 2.5-6 6-6h3V42c0-3 2.4-5.5 5.5-5.5S72 39 72 42v15h9c4 0 7 3 7 7v14c0 3.5-2.5 6-6 6H52Z"
            fill="#FED7AA"
          />
          <path d="M66 24v-8m0 0-5 5m5-5 5 5" stroke="#A78BFA" strokeWidth="2.6" />
        </g>
      );
    case 'yes':
      // Nodding fist
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="44" y="42" width="44" height="44" rx="16" fill="#A7F3D0" />
          <path d="M53 56v14M63 54v16M73 54v16M46 66h24" />
          <path d="M95 50c4 5 4 13 0 18M102 54c3 3.5 3 9 0 12" stroke="#10B981" />
        </g>
      );
    case 'no':
      // Finger pinch snap
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M42 82c0-14 8-23 20-23h16l-13-11c-2.5-2-2.8-5.6-.8-8s5.6-2.7 8-.7l20 17c2.4 2 3 5.5 1.3 8.2-1.8 2.8-5.4 3.6-8.2 1.8l-6-3.8c1 3 1.2 6.5 1.2 10.5 0 11.5-8.5 20-20 20h-4c-8.5 0-14.5-4.5-14.5-11Z"
            fill="#FED7AA"
          />
          <path d="M92 43l8-5M94 52h9" stroke="#F97316" />
        </g>
      );
    case 'thank-you':
      // Hand sweeping gracefully forward from chin
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M44 74l16-30c1.4-2.6 4.7-3.6 7.3-2.2 2.6 1.4 3.6 4.6 2.2 7.2l-8 16 14-20c1.7-2.4 5-3 7.4-1.3 2.4 1.7 3 5 1.3 7.4L69 72l13-13c2-2 5.4-2 7.4 0 2 2 2 5.4 0 7.4L70 86c-6.5 6.5-16.5 7-23.5 1.5C41 83 41 79.5 44 74Z"
            fill="#FED7AA"
          />
          <path d="M32 34c8-2 16 2 20 8" stroke="#A78BFA" />
          <path d="M88 86c7 2 14-1 18-6" stroke="#A78BFA" />
        </g>
      );
    case 'please':
      // Circular gentle motion over chest
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M48 80V44c0-2.8 2.2-5 5-5s5 2.2 5 5v20V38c0-2.8 2.2-5 5-5s5 2.2 5 5v26V41c0-2.8 2.2-5 5-5s5 2.2 5 5v23V49c0-2.5 2-4.5 4.5-4.5S88 46.5 88 49v31c0 12-9 21-20 21s-20-9-20-21Z"
            fill="#A7F3D0"
          />
          <circle cx="68" cy="68" r="24" stroke="#A78BFA" strokeDasharray="5 5" fill="none" />
          <path d="M90 60l4 8-8 1" stroke="#A78BFA" />
        </g>
      );
    case 'pain':
      // Two index fingers pointing inward
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M28 66h24c3 0 5.5 2.2 5.5 5s-2.5 5-5.5 5H32c-4 0-6-3-6-6v-4Z"
            fill="#FED7AA"
          />
          <path
            d="M104 66H80c-3 0-5.5 2.2-5.5 5s2.5 5 5.5 5h20c4 0 6-3 6-6v-4Z"
            fill="#FED7AA"
          />
          <path d="M66 44l-3 8m3-8 3 8M66 94l-3-8m3 8 3-8" stroke="#EF4444" />
        </g>
      );
    case 'doctor':
      // Checking pulse on wrist
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="28" y="66" width="76" height="18" rx="9" fill="#BFDBFE" />
          <path
            d="M54 66V42c0-2.8 2.2-5 5-5s5 2.2 5 5v16V39c0-2.8 2.2-5 5-5s5 2.2 5 5v27H54Z"
            fill="#FED7AA"
          />
          <path d="M64 24v5M56 26l3 4M72 26l-3 4" stroke="#3B82F6" />
        </g>
      );
    case 'friend':
      // Linked fingers
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M32 68c0-8 6.5-14 14.5-14H62c4 0 7 3 7 7s-3 7-7 7H46"
            fill="#EDE9FE"
          />
          <path
            d="M100 62c0 8-6.5 14-14.5 14H70c-4 0-7-3-7-7s3-7 7-7h16"
            fill="#A7F3D0"
          />
          <circle cx="66" cy="65" r="4" fill="#A78BFA" stroke="none" />
        </g>
      );
    case 'learn':
      // Gathering from palm up toward forehead
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M36 86h60c3 0 5.5 2.2 5.5 5S99 96 96 96H36c-3 0-5.5-2.2-5.5-5s2.5-5 5.5-5Z" fill="#BFDBFE" />
          <path
            d="M56 68l8-24c1-2.8 4-4.2 6.8-3.2 2.8 1 4.2 4 3.2 6.8l-5 14 7-10c1.8-2.2 5-2.5 7.2-.7 2.2 1.8 2.5 5 .7 7.2l-10 13c-3 3.8-8.5 5-13 2.7-4-2-6.2-6-4.9-5.8Z"
            fill="#FED7AA"
          />
          <path d="M66 30v-8m0 0-5 5m5-5 5 5" stroke="#A78BFA" />
        </g>
      );
    case 'hello':
    default:
      // Open waving palm
      return (
        <g stroke="#292544" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M42 74V46c0-2.8 2.2-5 5-5s5 2.2 5 5v18V36c0-2.8 2.2-5 5-5s5 2.2 5 5v28V33c0-2.8 2.2-5 5-5s5 2.2 5 5v31V40c0-2.8 2.2-5 5-5s5 2.2 5 5v26l5-9c1.4-2.4 4.5-3.2 6.9-1.8 2.4 1.4 3.2 4.5 1.8 6.9l-11 19c-4 6.5-11 10.5-18.8 10.5H61c-10.5 0-19-8.5-19-19Z"
            fill="#FED7AA"
          />
          <path d="M30 44c-3 5-3 12 0 17M99 36c4 5 5 12 2 18" stroke="#A78BFA" />
        </g>
      );
  }
}

export function HandIllustration({ gesture = 'hello', className = 'h-36 w-full' }) {
  const gradient = TONE_BG[gesture] || TONE_BG.hello;

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} p-3 ${className}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 132 120" fill="none" className="h-full w-auto max-w-full">
        <circle cx="24" cy="24" r="10" fill="#FFFFFF" fillOpacity="0.65" />
        <circle cx="108" cy="96" r="14" fill="#FFFFFF" fillOpacity="0.55" />
        {renderGestureVector(gesture)}
      </svg>
    </div>
  );
}
