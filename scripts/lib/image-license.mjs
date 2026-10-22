// Licence whitelist shared by fetch-image.mjs and validate-exams.mjs.
// Accepted: CC0, Public domain, CC BY (any version), CC BY-SA (any version).
// Rejected: NC, ND, GFDL-only, fair use, "all rights reserved" and anything unknown.

/** Returns { code, label } for an accepted licence name, or null. */
export function classifyLicense(name) {
  const raw = String(name ?? '').trim();
  const s = raw.toLowerCase().replace(/[_\s]+/g, ' ');
  if (!s) return null;
  if (/(^|[ -])(nc|nd)([ -]|$)|noncommercial|non-commercial|noderiv/.test(s)) return null;
  if (/^cc0|cc zero|^cc-zero|public domain dedication/.test(s))
    return { code: 'cc0', label: 'CC0' };
  if (/^pd\b|^pd-|public domain/.test(s)) return { code: 'pd', label: 'Public domain' };
  const m = s.match(/^cc[ -]by([ -]sa)?([ -]\d\.\d)?([ -][a-z]{2,3})?$/);
  if (m) return { code: m[1] ? 'cc-by-sa' : 'cc-by', label: raw };
  return null;
}

export const LICENSE_HELP =
  'Allowed licences: CC0, Public domain, CC BY (any version), CC BY-SA (any version).';
