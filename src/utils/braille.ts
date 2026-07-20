const BRAILLE_SPACE = '\u2800';
const BRAILLE_NUMBER = '\u283C';
const BRAILLE_CAPITAL = '\u2820';

const LATIN_BRAILLE: Record<string, string> = {
  a: '\u2801',
  b: '\u2803',
  c: '\u2809',
  d: '\u2819',
  e: '\u2811',
  f: '\u280B',
  g: '\u281B',
  h: '\u2813',
  i: '\u280A',
  j: '\u281A',
  k: '\u2805',
  l: '\u2807',
  m: '\u280D',
  n: '\u281D',
  o: '\u2815',
  p: '\u280F',
  q: '\u281F',
  r: '\u2817',
  s: '\u280E',
  t: '\u281E',
  u: '\u2825',
  v: '\u2827',
  w: '\u283A',
  x: '\u282D',
  y: '\u283D',
  z: '\u2835',
};

const RUSSIAN_BRAILLE: Record<string, string> = {
  '\u0430': '\u2801',
  '\u0431': '\u2803',
  '\u0432': '\u283A',
  '\u0433': '\u281B',
  '\u0434': '\u2819',
  '\u0435': '\u2811',
  '\u0451': '\u2821',
  '\u0436': '\u281A',
  '\u0437': '\u2835',
  '\u0438': '\u280A',
  '\u0439': '\u283B',
  '\u043A': '\u2805',
  '\u043B': '\u2807',
  '\u043C': '\u280D',
  '\u043D': '\u281D',
  '\u043E': '\u2815',
  '\u043F': '\u280F',
  '\u0440': '\u2817',
  '\u0441': '\u280E',
  '\u0442': '\u281E',
  '\u0443': '\u2825',
  '\u0444': '\u280B',
  '\u0445': '\u2813',
  '\u0446': '\u2809',
  '\u0447': '\u281F',
  '\u0448': '\u2831',
  '\u0449': '\u282D',
  '\u044A': '\u2837',
  '\u044B': '\u283D',
  '\u044C': '\u283E',
  '\u044D': '\u282A',
  '\u044E': '\u2833',
  '\u044F': '\u282B',
};

const ARABIC_BRAILLE: Record<string, string> = {
  '\u0627': '\u2801',
  '\u0628': '\u2803',
  '\u062A': '\u281E',
  '\u062B': '\u2830',
  '\u062C': '\u281A',
  '\u062D': '\u282D',
  '\u062E': '\u282F',
  '\u062F': '\u2819',
  '\u0630': '\u2839',
  '\u0631': '\u2817',
  '\u0632': '\u2835',
  '\u0633': '\u280E',
  '\u0634': '\u2829',
  '\u0635': '\u280F',
  '\u0636': '\u283F',
  '\u0637': '\u281C',
  '\u0638': '\u283C',
  '\u0639': '\u2823',
  '\u063A': '\u282B',
  '\u0641': '\u280B',
  '\u0642': '\u281F',
  '\u0643': '\u2805',
  '\u0644': '\u2807',
  '\u0645': '\u280D',
  '\u0646': '\u281D',
  '\u0647': '\u2813',
  '\u0648': '\u283A',
  '\u064A': '\u280A',
};

const PUNCTUATION_BRAILLE: Record<string, string> = {
  ' ': BRAILLE_SPACE,
  '.': '\u2832',
  ',': '\u2802',
  ';': '\u2806',
  ':': '\u2812',
  '!': '\u2816',
  '?': '\u2826',
  '-': '\u2824',
  '(': '\u2836',
  ')': '\u2836',
  '"': '\u2810',
  "'": '\u2804',
  '/': '\u280C',
  '\\': '\u2833',
  '@': '\u2800\u2801\u281E',
};

const DIGIT_TO_LATIN: Record<string, string> = {
  '1': 'a',
  '2': 'b',
  '3': 'c',
  '4': 'd',
  '5': 'e',
  '6': 'f',
  '7': 'g',
  '8': 'h',
  '9': 'i',
  '0': 'j',
};

const TECHNICAL_TOKEN_RE =
  /^(https?:\/\/|www\.|mailto:|[\w.-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\d{1,3}\.){3}\d{1,3}|[A-Za-z0-9-]+\.[A-Za-z]{2,})(?:[/:?#].*)?$/i;

const MOSTLY_TECHNICAL_RE = /^[A-Za-z0-9._:/\\%-]+$/;

function isUppercaseLetter(char: string): boolean {
  return /[A-Z\u0410-\u042F\u0401]/.test(char);
}

function isDigit(char: string): boolean {
  return char >= '0' && char <= '9';
}

function isTechnicalToken(token: string): boolean {
  return TECHNICAL_TOKEN_RE.test(token) || MOSTLY_TECHNICAL_RE.test(token);
}

function toSingleBraille(char: string): string {
  const lower = char.toLowerCase();
  return (
    LATIN_BRAILLE[lower] ??
    RUSSIAN_BRAILLE[lower] ??
    ARABIC_BRAILLE[lower] ??
    PUNCTUATION_BRAILLE[char] ??
    PUNCTUATION_BRAILLE[lower] ??
    char
  );
}

export function toBraille(text: string): string {
  let result = '';
  let isInNumberMode = false;

  for (const char of text) {
    if (char === ' ') {
      isInNumberMode = false;
      result += BRAILLE_SPACE;
      continue;
    }

    if (isDigit(char)) {
      if (!isInNumberMode) {
        result += BRAILLE_NUMBER;
        isInNumberMode = true;
      }
      result += LATIN_BRAILLE[DIGIT_TO_LATIN[char]];
      continue;
    }

    isInNumberMode = false;

    if (isUppercaseLetter(char)) {
      result += BRAILLE_CAPITAL;
    }

    result += toSingleBraille(char);
  }

  return result;
}

export function toBrailleTextContent(text: string): string {
  const parts = text.split(/(\s+)/);
  return parts
    .map((part) => {
      if (!part || /^\s+$/.test(part)) {
        return part;
      }
      if (isTechnicalToken(part)) {
        return part;
      }
      return toBraille(part);
    })
    .join('');
}
