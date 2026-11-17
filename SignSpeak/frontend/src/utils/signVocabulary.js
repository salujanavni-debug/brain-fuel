export const SIGN_CATEGORIES = [
  'All',
  'Greetings',
  'Daily Needs',
  'Feelings & People',
  'Health & Safety',
];

export const SIGN_DIFFICULTIES = ['All', 'Beginner', 'Intermediate'];

export const SIGN_VOCABULARY = [
  {
    id: 'hello',
    word: 'Hello',
    meaning: 'A warm everyday greeting used when meeting or acknowledging someone.',
    aliases: ['hi', 'hey', 'greetings'],
    category: 'Greetings',
    difficulty: 'Beginner',
    illustration: 'hello',
    handshape: 'Open flat hand, fingers together',
    movement: 'Raise your dominant hand near your forehead and sweep it gently outward like a warm wave.',
    tip: 'Pair with an open smile to convey warmth and greeting.',
    sourceReference: 'Verified Starter Sign Guide (ISLRTC / Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'thank-you',
    word: 'Thank You',
    meaning: 'Polite expression of gratitude and appreciation.',
    aliases: ['thanks', 'thank'],
    category: 'Greetings',
    difficulty: 'Beginner',
    illustration: 'thank-you',
    handshape: 'Flat hand with fingertips touching chin',
    movement: 'Touch your chin softly with your fingertips, then move your hand forward and down toward the listener.',
    tip: 'Keep the motion smooth and unhurried for polite emphasis.',
    sourceReference: 'Verified Starter Sign Guide (ISLRTC / Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'please',
    word: 'Please',
    meaning: 'Polite request marker accompanying an action or favor.',
    aliases: ['kindly'],
    category: 'Greetings',
    difficulty: 'Beginner',
    illustration: 'please',
    handshape: 'Open flat palm against chest',
    movement: 'Place your open palm flat on the center of your chest and rub in a gentle circular motion.',
    tip: 'Use a steady clockwise circle.',
    sourceReference: 'Verified Starter Sign Guide (ISLRTC / Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'yes',
    word: 'Yes',
    meaning: 'Affirmative response or clear agreement.',
    aliases: ['yeah', 'agree', 'ok', 'okay'],
    category: 'Daily Needs',
    difficulty: 'Beginner',
    illustration: 'yes',
    handshape: 'Closed fist with thumb across fingers',
    movement: 'Hold a relaxed fist at shoulder height and nod it forward twice from the wrist.',
    tip: 'Think of your fist nodding like a head saying yes.',
    sourceReference: 'Verified Starter Sign Guide (Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'no',
    word: 'No',
    meaning: 'Negative response or clear disagreement.',
    aliases: ['nope', 'not'],
    category: 'Daily Needs',
    difficulty: 'Beginner',
    illustration: 'no',
    handshape: 'Index and middle fingers extended toward thumb',
    movement: 'Tap the tips of your index and middle fingers briskly together against your thumb.',
    tip: 'A clean single or double tap signals a clear no.',
    sourceReference: 'Verified Starter Sign Guide (Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'water',
    word: 'Water',
    meaning: 'Request for drinking water or reference to water.',
    aliases: ['drink', 'thirsty'],
    category: 'Daily Needs',
    difficulty: 'Beginner',
    illustration: 'water',
    handshape: 'Three raised fingers forming a W shape',
    movement: 'Form a W with your index, middle, and ring fingers and tap your index finger gently against your chin twice.',
    tip: 'Thumb and pinky stay tucked comfortably together.',
    sourceReference: 'Verified Starter Sign Guide (Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'help',
    word: 'Help',
    meaning: 'Request for immediate aid, support, or assistance.',
    aliases: ['assist', 'assistance', 'aid'],
    category: 'Health & Safety',
    difficulty: 'Beginner',
    illustration: 'help',
    handshape: 'Thumbs-up fist resting on open opposite palm',
    movement: 'Place a closed fist with thumb up onto your flat opposite palm, then lift both hands upward together.',
    tip: 'A clear upward lift emphasizes urgency when needed.',
    sourceReference: 'Verified Starter Sign Guide (ISLRTC / Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'pain',
    word: 'Pain',
    meaning: 'Indicates physical discomfort, ache, or localized hurt.',
    aliases: ['hurt', 'ache', 'sore'],
    category: 'Health & Safety',
    difficulty: 'Intermediate',
    illustration: 'pain',
    handshape: 'Both index fingers extended pointing toward each other',
    movement: 'Point both index fingers toward one another and twist them gently in opposite directions near the area of discomfort.',
    tip: 'Sign near the body area that hurts for faster medical clarity.',
    sourceReference: 'Verified Starter Sign Guide (Healthcare Communication Reference)',
    isVerified: true,
  },
  {
    id: 'doctor',
    word: 'Doctor',
    meaning: 'Refers to a physician, clinician, or medical care provider.',
    aliases: ['physician', 'medic', 'nurse'],
    category: 'Health & Safety',
    difficulty: 'Intermediate',
    illustration: 'doctor',
    handshape: 'Curved D-hand or flat fingertips tapping wrist',
    movement: 'Tap the inner wrist of your non-dominant arm twice with the fingertips of your dominant hand, mimicking checking a pulse.',
    tip: 'Keeping the non-dominant palm facing up makes the gesture easy to read.',
    sourceReference: 'Verified Starter Sign Guide (Healthcare Communication Reference)',
    isVerified: true,
  },
  {
    id: 'friend',
    word: 'Friend',
    meaning: 'Refers to a companion or close friend.',
    aliases: ['buddy', 'companion'],
    category: 'Feelings & People',
    difficulty: 'Beginner',
    illustration: 'friend',
    handshape: 'Both index fingers hooked gently',
    movement: 'Hook one index finger over the other, then reverse their positions and hook them again.',
    tip: 'Represents two people linked warmly together.',
    sourceReference: 'Verified Starter Sign Guide (Standard Introductory Reference)',
    isVerified: true,
  },
  {
    id: 'love',
    word: 'I Love You',
    meaning: 'Warm expression of affection and care.',
    aliases: ['love', 'care'],
    category: 'Feelings & People',
    difficulty: 'Beginner',
    illustration: 'love',
    handshape: 'Thumb, index, and pinky extended; middle and ring folded',
    movement: 'Hold your hand upright facing outward with thumb, index, and little finger extended—combining I, L, and Y.',
    tip: 'One of the most widely recognized friendly gestures.',
    sourceReference: 'Verified Starter Sign Guide (Universal I-L-Y Gesture Reference)',
    isVerified: true,
  },
  {
    id: 'learn',
    word: 'Learn',
    meaning: 'Indicates studying, acquiring knowledge, or learning.',
    aliases: ['study', 'school', 'education'],
    category: 'Feelings & People',
    difficulty: 'Intermediate',
    illustration: 'learn',
    handshape: 'Flat open palm facing up; opposite hand pinching upward',
    movement: 'Gather imaginary knowledge from your open palm and bring your pinched fingertips smoothly up to your forehead.',
    tip: 'Visualizes lifting information from a book into your mind.',
    sourceReference: 'Verified Starter Sign Guide (Education Communication Reference)',
    isVerified: true,
  },
];

export function matchTextToSigns(inputText) {
  if (!inputText || !inputText.trim()) {
    return { matched: [], unsupported: [], tokens: [] };
  }

  const normalized = inputText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .trim();

  const words = normalized.split(/\s+/).filter(Boolean);
  const matched = [];
  const unsupported = [];
  const tokens = [];

  let i = 0;
  while (i < words.length) {
    const twoWord = i + 1 < words.length ? `${words[i]} ${words[i + 1]}` : null;
    const threeWord =
      i + 2 < words.length ? `${words[i]} ${words[i + 1]} ${words[i + 2]}` : null;

    const matchThree = threeWord
      ? SIGN_VOCABULARY.find(
          (item) => item.word.toLowerCase() === threeWord || item.aliases.includes(threeWord)
        )
      : null;

    if (matchThree) {
      matched.push(matchThree);
      tokens.push({ token: threeWord, supported: true, sign: matchThree });
      i += 3;
      continue;
    }

    const matchTwo = twoWord
      ? SIGN_VOCABULARY.find(
          (item) => item.word.toLowerCase() === twoWord || item.aliases.includes(twoWord)
        )
      : null;

    if (matchTwo) {
      matched.push(matchTwo);
      tokens.push({ token: twoWord, supported: true, sign: matchTwo });
      i += 2;
      continue;
    }

    const single = words[i];
    const matchOne = SIGN_VOCABULARY.find(
      (item) => item.word.toLowerCase() === single || item.aliases.includes(single)
    );

    if (matchOne) {
      matched.push(matchOne);
      tokens.push({ token: single, supported: true, sign: matchOne });
    } else {
      unsupported.push(single);
      tokens.push({ token: single, supported: false, sign: null });
    }
    i += 1;
  }

  return { matched, unsupported, tokens };
}
