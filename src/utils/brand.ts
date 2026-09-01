export function formatBrandSlug(slug: string | null | undefined): string | null {
  if (!slug) return null;
  const s = slug.trim();
  if (!s) return null;
  
  // For short brands (like hqd, elf), uppercase them completely
  if (s.length <= 3) {
    return s.toUpperCase();
  }
  
  return s
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
