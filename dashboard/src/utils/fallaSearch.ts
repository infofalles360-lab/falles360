import { type Falla } from '../data';

function normalizeSearchValue(value: string | undefined | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSearchFields(falla: Falla) {
  return {
    name: normalizeSearchValue(falla.name),
    commissionName: normalizeSearchValue(falla.commissionName),
    neighborhood: normalizeSearchValue(falla.neighborhood),
    section: normalizeSearchValue(falla.section),
    artist: normalizeSearchValue(falla.artist),
    address: normalizeSearchValue(falla.address),
    category: normalizeSearchValue(falla.category),
    description: normalizeSearchValue(falla.description),
    year: normalizeSearchValue(falla.year),
  };
}

export function normalizeFallaSearchQuery(value: string): string {
  return normalizeSearchValue(value);
}

export function fallaMatchesSearch(falla: Falla, query: string): boolean {
  return getFallaSearchScore(falla, query) > 0;
}

export function getFallaSearchScore(falla: Falla, query: string): number {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return 0;
  }

  const fields = getSearchFields(falla);
  const haystack = [
    fields.name,
    fields.commissionName,
    fields.neighborhood,
    fields.section,
    fields.artist,
    fields.address,
    fields.category,
    fields.description,
    fields.year,
  ].filter(Boolean).join(' ');
  const terms = normalizedQuery.split(' ').filter(Boolean);

  if (terms.length === 0 || terms.some((term) => !haystack.includes(term))) {
    return 0;
  }

  let score = terms.length * 40;

  if (fields.name === normalizedQuery) {
    score += 1400;
  } else if (fields.name.startsWith(normalizedQuery)) {
    score += 950;
  } else if (fields.name.includes(normalizedQuery)) {
    score += 720;
  }

  if (fields.commissionName === normalizedQuery) {
    score += 1100;
  } else if (fields.commissionName.startsWith(normalizedQuery)) {
    score += 760;
  } else if (fields.commissionName.includes(normalizedQuery)) {
    score += 540;
  }

  if (fields.neighborhood.includes(normalizedQuery)) {
    score += 280;
  }

  if (fields.address.includes(normalizedQuery)) {
    score += 320;
  }

  if (fields.artist.includes(normalizedQuery)) {
    score += 260;
  }

  if (fields.section.includes(normalizedQuery) || fields.category.includes(normalizedQuery)) {
    score += 180;
  }

  if (fields.description.includes(normalizedQuery)) {
    score += 120;
  }

  if (typeof falla.prize === 'number') {
    score += Math.max(0, 70 - (falla.prize * 8));
  }

  score += Math.min(falla.visitors / 40, 120);
  score += Math.min(falla.likes / 60, 80);

  return Math.round(score);
}
