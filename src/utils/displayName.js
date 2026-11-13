/**
 * Sanitizes any lingering legacy government/directorate strings in cached or rendered
 * user records so Tier 0 strictly displays "Master Admin" everywhere in the UI.
 */
export function sanitizeDisplayName(name, fallback = 'User') {
  if (!name || typeof name !== 'string') return fallback;
  const cleaned = name
    .replace(/Director General\s*\(Master Admin\)/gi, 'Master Admin')
    .replace(/Director General/gi, 'Master Admin')
    .replace(/National(\s+PTI)?\s+Directorate|Master\s+Directorate|SaaS\s+Directorate|Directorate/gi, 'Central Admin')
    .trim();
  return cleaned || fallback;
}

export function sanitizeUserRecord(user) {
  if (!user || typeof user !== 'object') return user;
  const isMaster = user.role === 'master_admin';
  const nextName = isMaster
    ? 'Master Admin'
    : sanitizeDisplayName(user.name, user.name || 'User');
  const nextDesignation = isMaster
    ? 'Master Admin'
    : sanitizeDisplayName(user.designation, user.designation || '');
  const nextHostelName =
    typeof user.hostelName === 'string' && /director\s*general|directorate/i.test(user.hostelName)
      ? 'Central Admin (67 PTIs)'
      : user.hostelName;

  return {
    ...user,
    name: nextName,
    ...(nextDesignation !== '' || user.designation ? { designation: nextDesignation } : {}),
    ...(nextHostelName !== undefined ? { hostelName: nextHostelName } : {}),
  };
}
