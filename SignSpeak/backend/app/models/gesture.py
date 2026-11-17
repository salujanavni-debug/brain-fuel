from dataclasses import dataclass, field
from typing import List


@dataclass(frozen=True)
class DemonstrationAsset:
    asset_type: str
    identifier: str
    description: str


@dataclass(frozen=True)
class GestureDefinition:
    id: str
    label: str
    meaning: str
    category: str
    difficulty: str
    handshape: str
    movement: str
    tip: str
    aliases: List[str] = field(default_factory=list)
    assets: List[DemonstrationAsset] = field(default_factory=list)


@dataclass(frozen=True)
class CategoryDefinition:
    id: str
    name: str
    description: str


@dataclass(frozen=True)
class QuizQuestionDefinition:
    id: str
    gesture_id: str
    category: str
    prompt: str
    options: List[str]
    correct_answer: str
    explanation: str


@dataclass(frozen=True)
class EmergencyMessageDefinition:
    id: str
    message: str
    gesture_id: str
    urgency: str
    category: str
    speech_rate: float = 0.9


CATEGORY_CATALOG: List[CategoryDefinition] = [
    CategoryDefinition(
        id="greetings",
        name="Greetings",
        description="Warm everyday openers, polite requests, and courteous responses.",
    ),
    CategoryDefinition(
        id="daily-needs",
        name="Daily Needs",
        description="Essential confirmations and routine personal requests.",
    ),
    CategoryDefinition(
        id="feelings-people",
        name="Feelings & People",
        description="Relational words, learning terms, and expressions of care.",
    ),
    CategoryDefinition(
        id="health-safety",
        name="Health & Safety",
        description="Medical, discomfort, and urgent assistance signs.",
    ),
]


GESTURE_CATALOG: List[GestureDefinition] = [
    GestureDefinition(
        id="hello",
        label="Hello",
        meaning="A warm greeting used when meeting or acknowledging someone.",
        category="Greetings",
        difficulty="Beginner",
        handshape="Open flat hand, fingers together",
        movement="Raise your dominant hand near your forehead and sweep it gently outward like a warm wave.",
        tip="Pair with an open smile to convey warmth and greeting.",
        aliases=["hi", "hey", "greetings"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="hello",
                description="Vector demonstration of open-palm outward wave.",
            )
        ],
    ),
    GestureDefinition(
        id="thank-you",
        label="Thank You",
        meaning="Expression of gratitude and appreciation.",
        category="Greetings",
        difficulty="Beginner",
        handshape="Flat hand with fingertips touching chin",
        movement="Touch your chin softly with your fingertips, then move your hand forward and down toward the listener.",
        tip="Keep the motion smooth and unhurried for polite emphasis.",
        aliases=["thanks", "thank"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="thank-you",
                description="Vector demonstration of chin-to-forward gratitude motion.",
            )
        ],
    ),
    GestureDefinition(
        id="please",
        label="Please",
        meaning="Polite request marker used with actions or favors.",
        category="Greetings",
        difficulty="Beginner",
        handshape="Open flat palm against chest",
        movement="Place your open palm flat on the center of your chest and rub in a gentle circular motion.",
        tip="Use a steady clockwise circle.",
        aliases=["kindly"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="please",
                description="Vector demonstration of circular palm motion on chest.",
            )
        ],
    ),
    GestureDefinition(
        id="yes",
        label="Yes",
        meaning="Affirmative response or agreement.",
        category="Daily Needs",
        difficulty="Beginner",
        handshape="Closed fist with thumb across fingers",
        movement="Hold a relaxed fist at shoulder height and nod it forward twice from the wrist.",
        tip="Think of your fist nodding like a head saying yes.",
        aliases=["yeah", "agree", "ok", "okay"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="yes",
                description="Vector demonstration of nodding closed fist.",
            )
        ],
    ),
    GestureDefinition(
        id="no",
        label="No",
        meaning="Negative response or disagreement.",
        category="Daily Needs",
        difficulty="Beginner",
        handshape="Index and middle fingers extended toward thumb",
        movement="Tap the tips of your index and middle fingers briskly together against your thumb.",
        tip="A clean single or double tap signals a clear no.",
        aliases=["nope", "not"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="no",
                description="Vector demonstration of index-middle-thumb pinch.",
            )
        ],
    ),
    GestureDefinition(
        id="water",
        label="Water",
        meaning="Request for drinking water or reference to water.",
        category="Daily Needs",
        difficulty="Beginner",
        handshape="Three raised fingers forming a W shape",
        movement="Form a W with your index, middle, and ring fingers and tap your index finger gently against your chin twice.",
        tip="Thumb and pinky stay tucked comfortably together.",
        aliases=["drink", "thirsty"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="water",
                description="Vector demonstration of W-handshape chin tap.",
            )
        ],
    ),
    GestureDefinition(
        id="help",
        label="Help",
        meaning="Request for aid, support, or immediate assistance.",
        category="Health & Safety",
        difficulty="Beginner",
        handshape="Thumbs-up fist resting on open opposite palm",
        movement="Place a closed fist with thumb up onto your flat opposite palm, then lift both hands upward together.",
        tip="A clear upward lift emphasizes urgency when needed.",
        aliases=["assist", "assistance", "aid"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="help",
                description="Vector demonstration of supported upward lift.",
            )
        ],
    ),
    GestureDefinition(
        id="pain",
        label="Pain",
        meaning="Indicates physical discomfort, ache, or localized hurt.",
        category="Health & Safety",
        difficulty="Intermediate",
        handshape="Both index fingers extended pointing toward each other",
        movement="Point both index fingers toward one another and twist them gently in opposite directions near the area of discomfort.",
        tip="Sign near the body area that hurts for faster medical clarity.",
        aliases=["hurt", "ache", "sore"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="pain",
                description="Vector demonstration of opposing index-finger twists.",
            )
        ],
    ),
    GestureDefinition(
        id="doctor",
        label="Doctor",
        meaning="Refers to a physician, clinician, or medical care provider.",
        category="Health & Safety",
        difficulty="Intermediate",
        handshape="Flat fingertips tapping inner wrist",
        movement="Tap the inner wrist of your non-dominant arm twice with the fingertips of your dominant hand, mimicking checking a pulse.",
        tip="Keeping the non-dominant palm facing up makes the gesture easy to read.",
        aliases=["physician", "medic", "nurse"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="doctor",
                description="Vector demonstration of wrist-pulse tap.",
            )
        ],
    ),
    GestureDefinition(
        id="friend",
        label="Friend",
        meaning="Refers to a companion or close friend.",
        category="Feelings & People",
        difficulty="Beginner",
        handshape="Both index fingers hooked gently",
        movement="Hook one index finger over the other, then reverse their positions and hook them again.",
        tip="Represents two people linked warmly together.",
        aliases=["buddy", "companion"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="friend",
                description="Vector demonstration of interlocking index fingers.",
            )
        ],
    ),
    GestureDefinition(
        id="love",
        label="I Love You",
        meaning="Warm expression of affection and care.",
        category="Feelings & People",
        difficulty="Beginner",
        handshape="Thumb, index, and pinky extended; middle and ring folded",
        movement="Hold your hand upright facing outward with thumb, index, and little finger extended—combining I, L, and Y.",
        tip="One of the most widely recognized friendly gestures.",
        aliases=["love", "care"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="love",
                description="Vector demonstration of combined I-L-Y handshape.",
            )
        ],
    ),
    GestureDefinition(
        id="learn",
        label="Learn",
        meaning="Indicates studying, acquiring knowledge, or learning.",
        category="Feelings & People",
        difficulty="Intermediate",
        handshape="Flat open palm facing up; opposite hand pinching upward",
        movement="Gather imaginary knowledge from your open palm and bring your pinched fingertips smoothly up to your forehead.",
        tip="Visualizes lifting information from a book into your mind.",
        aliases=["study", "school", "education"],
        assets=[
            DemonstrationAsset(
                asset_type="svg_illustration",
                identifier="learn",
                description="Vector demonstration of palm-to-forehead knowledge gesture.",
            )
        ],
    ),
]


QUIZ_CATALOG: List[QuizQuestionDefinition] = [
    QuizQuestionDefinition(
        id="q1",
        gesture_id="hello",
        category="Greetings",
        prompt="Which greeting matches an open flat hand waving gently outward from the forehead?",
        options=["Hello", "Water", "Pain", "No"],
        correct_answer="Hello",
        explanation="Hello uses an open flat palm near the forehead sweeping gently outward.",
    ),
    QuizQuestionDefinition(
        id="q2",
        gesture_id="water",
        category="Daily Needs",
        prompt="Forming a W-shape with three fingers and tapping your chin twice represents:",
        options=["Friend", "Water", "Thank You", "Doctor"],
        correct_answer="Water",
        explanation="Water forms a 'W' with index, middle, and ring fingers tapped against the chin.",
    ),
    QuizQuestionDefinition(
        id="q3",
        gesture_id="help",
        category="Health & Safety",
        prompt="A thumbs-up resting on an open palm and lifting upward together means:",
        options=["Please", "Yes", "Help", "Learn"],
        correct_answer="Help",
        explanation="Help places a closed thumbs-up fist on the opposite palm and lifts both upward.",
    ),
    QuizQuestionDefinition(
        id="q4",
        gesture_id="love",
        category="Feelings & People",
        prompt="Thumb, index, and little finger extended together stands for:",
        options=["I Love You", "No", "Doctor", "Friend"],
        correct_answer="I Love You",
        explanation="The I-L-Y handshape combines letters I, L, and Y into one gesture.",
    ),
    QuizQuestionDefinition(
        id="q5",
        gesture_id="thank-you",
        category="Greetings",
        prompt="Touching your chin softly and moving your flat hand forward toward the listener means:",
        options=["Please", "Thank You", "Pain", "Yes"],
        correct_answer="Thank You",
        explanation="Thank You moves a flat hand gently forward from the chin.",
    ),
    QuizQuestionDefinition(
        id="q6",
        gesture_id="yes",
        category="Daily Needs",
        prompt="Holding a relaxed fist at shoulder height and nodding it forward twice means:",
        options=["No", "Yes", "Please", "Water"],
        correct_answer="Yes",
        explanation="Yes uses a nodding fist motion from the wrist, mirroring a head nod.",
    ),
    QuizQuestionDefinition(
        id="q7",
        gesture_id="doctor",
        category="Health & Safety",
        prompt="Tapping the inner wrist of your opposite arm twice as if checking a pulse signs:",
        options=["Pain", "Help", "Doctor", "Friend"],
        correct_answer="Doctor",
        explanation="Doctor mimics checking a wrist pulse with two gentle taps.",
    ),
    QuizQuestionDefinition(
        id="q8",
        gesture_id="learn",
        category="Feelings & People",
        prompt="Gathering from an open palm upward toward your forehead represents:",
        options=["Learn", "Hello", "Thank You", "No"],
        correct_answer="Learn",
        explanation="Learn visualizes lifting knowledge from a book or open palm into your mind.",
    ),
]


EMERGENCY_CATALOG: List[EmergencyMessageDefinition] = [
    EmergencyMessageDefinition(
        id="help",
        message="I need help.",
        gesture_id="help",
        urgency="high",
        category="Urgent Aid",
    ),
    EmergencyMessageDefinition(
        id="pain",
        message="I am in pain.",
        gesture_id="pain",
        urgency="critical",
        category="Medical",
    ),
    EmergencyMessageDefinition(
        id="doctor",
        message="Call a doctor.",
        gesture_id="doctor",
        urgency="critical",
        category="Medical",
    ),
    EmergencyMessageDefinition(
        id="water",
        message="I need water.",
        gesture_id="water",
        urgency="moderate",
        category="Basic Needs",
    ),
    EmergencyMessageDefinition(
        id="cannot-understand",
        message="I cannot understand.",
        gesture_id="learn",
        urgency="moderate",
        category="Communication",
    ),
    EmergencyMessageDefinition(
        id="contact-family",
        message="Please contact my family.",
        gesture_id="friend",
        urgency="high",
        category="Family & Contact",
    ),
    EmergencyMessageDefinition(
        id="assistance",
        message="I need assistance.",
        gesture_id="help",
        urgency="high",
        category="Support",
    ),
]
