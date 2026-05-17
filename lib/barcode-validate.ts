/**
 * EAN/UPC checksum validation. Catches typos and bad scans before we burn
 * an API call. Supports EAN-13, EAN-8, UPC-A (12); shorter codes are
 * accepted without checksum (some specialty SKUs are non-GS1).
 */

export function isValidBarcodeChecksum(code: string): boolean {
  if (!/^[0-9]+$/.test(code)) return false
  if (code.length !== 8 && code.length !== 12 && code.length !== 13) {
    return true // length we don't validate — accept (will be caught by AI/OFF or 404)
  }
  const digits = code.split('').map(Number)
  const checkDigit = digits.pop() as number
  // GS1 algorithm: alternate ×3/×1 weights from the right.
  let sum = 0
  for (let i = digits.length - 1, mul = 3; i >= 0; i--, mul = mul === 3 ? 1 : 3) {
    sum += digits[i] * mul
  }
  const expected = (10 - (sum % 10)) % 10
  return expected === checkDigit
}

/**
 * Sanity check on lookup result. Flags numerically suspicious combinations
 * (e.g. zero-calorie sugary drink) so the UI can warn the user.
 */
export function isNutritionSuspicious(args: {
  name?: string
  ingredients?: string
  calories?: number | null
  carbs?: number | null
}): { suspicious: boolean; reason?: string } {
  const { name = '', ingredients = '', calories, carbs } = args
  const hay = `${name} ${ingredients}`.toLowerCase()

  // Zero-cal sugary drink trap: Sonar confuses regular tonic/cola with Zero variants
  const looksDiet = /\b(zero|light|лайт|диет|без сахара|no sugar|sugar free|сахаро[^.]*нет)\b/i.test(hay)
  const containsSugar = /(сахар|сироп|глюкоз|фруктоз|sugar|syrup)/i.test(ingredients)
  if (!looksDiet && containsSugar && typeof calories === 'number' && calories < 20) {
    return { suspicious: true, reason: 'zero-calories-with-sugar' }
  }

  // Carbs reported but calories near zero — physically impossible (4 kcal/g)
  if (typeof calories === 'number' && typeof carbs === 'number' && carbs > 5 && calories < carbs * 2) {
    return { suspicious: true, reason: 'calories-vs-carbs-mismatch' }
  }

  return { suspicious: false }
}
