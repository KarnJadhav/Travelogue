import { toAbsoluteAssetUrl } from '../config/runtime';

const normalizeValue = (value) => {
  if (!value || typeof value !== 'string') return '';
  return value.trim();
};

export const buildMediaUrl = (value) => {
  const normalized = normalizeValue(value);
  if (!normalized) return '';
  return toAbsoluteAssetUrl(normalized);
};

export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const gradients = [
  'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)',
  'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #064e3b 0%, #10b981 100%)',
  'linear-gradient(135deg, #111827 0%, #6b7280 100%)'
];

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

export const pickGradient = (seed) => {
  const base = String(seed || 'default');
  const hash = Math.abs(hashString(base));
  return gradients[hash % gradients.length];
};
