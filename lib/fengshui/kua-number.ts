import type { KuaGroup } from './types'

// Reduces a number to a single digit by summing its digits repeatedly.
function digitSum(n: number): number {
  while (n > 9) {
    n = String(n).split('').reduce((acc, d) => acc + Number(d), 0)
  }
  return n
}

// Eight Mansions (八宅派) kua number calculation.
//
// Male: 11 - digitSum(year). If result is 5, use 2 (traditional substitution).
// Female: digitSum(year) + 4. If result is 5, use 8.
// Result of 0 → treated as 9 per classical convention.
export function calcKuaNumber(birthYear: number, gender: 'male' | 'female'): number {
  const s = digitSum(birthYear)
  let kua: number

  if (gender === 'male') {
    kua = 11 - s
    if (kua > 9) kua = digitSum(kua)
    if (kua === 0) kua = 9
    if (kua === 5) kua = 2
  } else {
    kua = s + 4
    if (kua > 9) kua = digitSum(kua)
    if (kua === 0) kua = 9
    if (kua === 5) kua = 8
  }

  return kua
}

// Alias for AI 1 compatibility
export const calculateKuaNumber = calcKuaNumber

// East group: 1, 3, 4, 9  |  West group: 2, 6, 7, 8
export function calcKuaGroup(kuaNumber: number): KuaGroup {
  return [1, 3, 4, 9].includes(kuaNumber) ? 'east' : 'west'
}

// People born in January or February may straddle the Chinese New Year boundary,
// meaning the lunar year used in classical feng shui differs from the solar year.
// We surface a warning rather than auto-correcting, since we don't know their
// exact birth date.
export function getJanFebWarning(birthMonth?: number): string | null {
  if (birthMonth !== undefined && (birthMonth === 1 || birthMonth === 2)) {
    return 'If you were born before Chinese New Year (usually Feb 4–20), your feng shui birth year may be the prior year. Try entering year − 1 to compare results.'
  }
  return null
}
