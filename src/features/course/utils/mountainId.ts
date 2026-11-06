const MAX_MOUNTAIN_ID = 9223372036854775807n; //임의

/** Backend Long ID를 정밀도 손실 없이 문자열로 검증한다. */
export function isValidMountainId(value: string | null): value is string {
  const digits = value?.replace(/^0+/, '') ?? '';
  return /^[1-9]\d{0,18}$/.test(digits) && BigInt(digits) <= MAX_MOUNTAIN_ID;
}
