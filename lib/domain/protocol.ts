export const STUDY_GROUP = "Latinos";

export const INTRODUCTION_TEXT = [
  "This is a study on identity conducted by graduate students at the University of Pennsylvania as part of a research assignment.",
  "No one's name will be used in the research, but email addresses are collected in case we have follow-up questions based on the results.",
  "Whether the results will be published depends on the findings.",
  "Participants will not be personally identified, and there are approximately 3,000 people in the study initially.",
];

export const APPROVED_IDENTITY_QUESTION =
  "Where do you get your identity from? Please list five sources, from most important to least important.";

export const APPROVED_CLARIFICATION =
  "If you were to describe to a neutral third party who you are, what would you say?";

export const RANKING_PROMPT =
  "Here are the five sources mentioned. Please confirm or edit the wording and ranking from most important to least important.";

export const DEMOGRAPHIC_PROMPT = "Please provide your age and gender.";

export const PARTICIPANT_METADATA_PROMPT =
  "Please provide the remaining interview information: name, age, gender, occupation, email address, interview date, your current location, how you learned about this interview, and the language used for this interview.";

export const COMPLETION_MESSAGE =
  "Your interview is complete. Thank you for participating in this study.";

export const INELIGIBLE_MESSAGE =
  "Thank you for your time. This study is limited to participants who self-identify as Latino, so this interview will not continue.";

export const ENGLISH_PROMPTS = {
  intro: INTRODUCTION_TEXT.join("\n\n"),
  eligibility: "Do you identify yourself as a Latino?",
  identityQuestion: APPROVED_IDENTITY_QUESTION,
  clarification: APPROVED_CLARIFICATION,
  ranking: RANKING_PROMPT,
  demographics: DEMOGRAPHIC_PROMPT,
  metadata: PARTICIPANT_METADATA_PROMPT,
  completed: COMPLETION_MESSAGE,
  ineligible: INELIGIBLE_MESSAGE,
  introAck: "I understand and want to continue.",
  eligibilityYes: "Yes",
  eligibilityNo: "No",
  clarificationRequest: "I need clarification.",
  rankingParsed:
    "Please review the five ranked identity sources below, edit them if needed, and confirm.",
  rankingNeedsFix:
    "I could not confidently detect five distinct ranked sources. Please edit the five fields and confirm.",
};

export const SPANISH_PROMPTS = {
  intro:
    "Este es un estudio sobre la identidad realizado por estudiantes de posgrado de la Universidad de Pennsylvania como parte de una tarea de investigación.\n\nNingún nombre se usará en la investigación, pero se recopilan direcciones de correo electrónico en caso de que tengamos preguntas de seguimiento basadas en los resultados.\n\nQue los resultados se publiquen dependerá de los hallazgos.\n\nLos participantes no serán identificados personalmente y hay aproximadamente 3,000 personas en el estudio inicialmente.",
  eligibility: "¿Se identifica usted como latino/a?",
  identityQuestion:
    "¿De dónde obtiene su identidad? Por favor enumere cinco fuentes, de la más importante a la menos importante.",
  clarification:
    "Si tuviera que describirse ante un tercero neutral, ¿qué diría?",
  ranking:
    "Estas son las cinco fuentes mencionadas. Por favor confirme o edite la redacción y el orden de la más importante a la menos importante.",
  demographics: "Por favor proporcione su edad y género.",
  metadata:
    "Por favor proporcione la información restante de la entrevista: nombre, edad, género, ocupación, correo electrónico, fecha de la entrevista, su ubicación actual, cómo se enteró de esta entrevista y el idioma utilizado en esta entrevista.",
  completed: "La entrevista está completa. Gracias por participar en este estudio.",
  ineligible:
    "Gracias por su tiempo. Este estudio está limitado a participantes que se identifican como latinos, por lo que esta entrevista no continuará.",
  introAck: "Entiendo y quiero continuar.",
  eligibilityYes: "Sí",
  eligibilityNo: "No",
  clarificationRequest: "Necesito una aclaración.",
  rankingParsed:
    "Por favor revise las cinco fuentes de identidad clasificadas a continuación, edítelas si es necesario y confírmelas.",
  rankingNeedsFix:
    "No pude detectar con seguridad cinco fuentes distintas. Por favor edite los cinco campos y confírmelos.",
};

export const RECRUITMENT_METHODS = [
  "Friend or classmate",
  "Course or instructor",
  "Online posting or link",
  "Community outreach",
  "Other",
] as const;

export const INTERVIEW_METHODS = ["Web app"] as const;

export const INTERVIEW_LANGUAGES = ["English", "Spanish"] as const;

export const GENDER_OPTIONS = [
  "Woman",
  "Man",
  "Non-binary",
  "Another identity",
  "Prefer not to say",
] as const;

export const CODING_CATEGORIES = [
  "Family",
  "Friends",
  "Occupation",
  "Personality",
  "Hobbies",
  "Stereotype",
] as const;

export const RANK_WEIGHTS = [5, 4, 3, 2, 1] as const;

export const STEP_TITLES = {
  intro: "Study introduction",
  eligibility: "Eligibility confirmation",
  identity_question: "Standard source question",
  clarification_if_needed: "Approved guidance",
  rank_confirmation: "Ranking confirmation",
  demographics: "Demographics",
  metadata: "Information collection",
  completed: "Completed",
  terminated_ineligible: "Ineligible",
} as const;
