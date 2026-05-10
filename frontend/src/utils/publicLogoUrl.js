/** Logo served from `public/logo.png` (stable URL vs hashed bundle paths). */
export function publicLogoUrl() {
  const rawBase = import.meta.env.BASE_URL || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  return `${base}logo.png`;
}
