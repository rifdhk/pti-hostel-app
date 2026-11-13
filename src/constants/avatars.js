export const MALE_AVATAR_OPTIONS = [
  { id: 'male_suit', label: 'Suit', title: 'Formal Corporate Suit & Tie' },
  { id: 'male_shirt', label: 'Shirt', title: 'Formal Button-Down Shirt' },
  { id: 'male_panjabi', label: 'Panjabi', title: 'Traditional Formal Panjabi' },
  { id: 'male_panjabi_tupi', label: 'Panjabi+Tupi', title: 'Traditional Panjabi with Islamic Tupi & Beard' },
  { id: 'male_polo', label: 'Polo', title: 'Smart-Casual Polo Shirt' },
];

export const FEMALE_AVATAR_OPTIONS = [
  { id: 'female_hijab', label: 'Hijab', title: 'Formal Hijab' },
  { id: 'female_niqab', label: 'Niqab', title: 'Formal Niqab' },
  { id: 'female_saree', label: 'Saree', title: 'Traditional Formal Saree' },
  { id: 'female_salwar', label: 'Salwar', title: 'Formal Salwar Kameez with Dupatta' },
  { id: 'female_western', label: 'Western', title: 'Formal Western Corporate Attire' },
];

export const MALE_AVATAR_IDS = MALE_AVATAR_OPTIONS.map((a) => a.id);
export const FEMALE_AVATAR_IDS = FEMALE_AVATAR_OPTIONS.map((a) => a.id);
export const ALL_AVATAR_IDS = [...MALE_AVATAR_IDS, ...FEMALE_AVATAR_IDS];

export const GENDER_OPTIONS = ['Male', 'Female'];

/**
 * Normalizes user gender strictly to 'Male' | 'Female'.
 */
export function normalizeGender(gender) {
  const normalized = String(gender || '').trim().toLowerCase();
  return normalized === 'female' || normalized === 'f' ? 'Female' : 'Male';
}

/**
 * Returns structured avatar metadata options for a given gender.
 */
export function getAvatarOptionsByGender(gender) {
  return normalizeGender(gender) === 'Female' ? FEMALE_AVATAR_OPTIONS : MALE_AVATAR_OPTIONS;
}

/**
 * Returns the array of formal local avatar_id strings for a given gender.
 */
export function getAvatarsByGender(gender) {
  return normalizeGender(gender) === 'Female' ? FEMALE_AVATAR_IDS : MALE_AVATAR_IDS;
}

/**
 * Checks whether an avatar_id matches one of the 10 formal institutional SVG components.
 */
export function isValidAvatarId(avatarId) {
  return Boolean(avatarId && ALL_AVATAR_IDS.includes(avatarId));
}

/**
 * Checks whether an avatar_id belongs to the given gender's formal avatar set.
 */
export function isAvatarValidForGender(avatarId, gender) {
  return Boolean(avatarId && getAvatarsByGender(gender).includes(avatarId));
}

/**
 * Returns a deterministic default formal avatar_id based on user gender.
 */
export function getDefaultAvatarId(gender = 'Male', seedOffset = 0) {
  const list = getAvatarsByGender(gender);
  const idx = Math.abs(Number(seedOffset) || 0) % list.length;
  return list[idx];
}

/**
 * Resolves a user's avatar_id cleanly with a gender-appropriate default fallback.
 */
export function resolveUserAvatarId(user, seedOffset = 0) {
  if (typeof user === 'string') {
    return isValidAvatarId(user) ? user : getDefaultAvatarId('Male', seedOffset);
  }
  if (user?.avatar_id && isValidAvatarId(user.avatar_id)) {
    return user.avatar_id;
  }
  return getDefaultAvatarId(normalizeGender(user?.gender), seedOffset);
}
