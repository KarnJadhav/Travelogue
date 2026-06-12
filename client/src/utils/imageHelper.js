import { toAbsoluteAssetUrl } from '../config/runtime';

/**
 * Build proper image URL for travelogue images
 * @param {string} imagePath - The image path from database
 * @returns {string} - Complete image URL
 */
export const buildImageUrl = (imagePath) => {
  if (!imagePath) {
    return '/no-image.png';
  }

  if (typeof imagePath !== 'string') {
    return '/no-image.png';
  }

  // If already a full URL, return as-is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  return toAbsoluteAssetUrl(imagePath);
};

/**
 * Check if a media path is a video file based on extension
 * @param {string} mediaPath - The media path from database
 * @returns {boolean}
 */
export const isVideoFile = (mediaPath = '') => {
  if (typeof mediaPath !== 'string') return false;
  const cleanPath = mediaPath.split('?')[0].toLowerCase();
  return [
    '.mp4',
    '.webm',
    '.ogg',
    '.mov',
    '.m4v',
    '.avi',
    '.mkv'
  ].some((ext) => cleanPath.endsWith(ext));
};
