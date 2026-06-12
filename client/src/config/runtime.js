const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");

const resolveDefaultOrigin = () => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
};

const normalizeApiBaseUrl = (value) => {
  const fallback = `${trimTrailingSlash(resolveDefaultOrigin())}/api`;
  const source = String(value || fallback).trim();
  if (!source) return "/api";

  const withoutTrailingSlash = trimTrailingSlash(source);
  if (/\/api$/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }
  return `${withoutTrailingSlash}/api`;
};

const normalizeBaseUrl = (value, fallback = "") => {
  const source = String(value || fallback).trim();
  if (!source) return "";
  return trimTrailingSlash(source);
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
export const APP_BASE_URL = API_BASE_URL.replace(/\/api\/?$/i, "");
export const SOCKET_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_SOCKET_BASE_URL || import.meta.env.VITE_SOCKET_URL,
  APP_BASE_URL
);
export const ASSET_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_ASSET_BASE_URL,
  APP_BASE_URL
);

export const toAbsoluteAssetUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.trim();
  if (!normalized) return "";
  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:")
  ) {
    return normalized;
  }

  const safePath = normalized.replace(/\\/g, "/");
  if (safePath.startsWith("/")) {
    return `${ASSET_BASE_URL}${safePath}`;
  }
  return `${ASSET_BASE_URL}/${safePath}`;
};
