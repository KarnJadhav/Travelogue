import React, { useEffect, useMemo, useState } from 'react';
import Avatar from '@mui/material/Avatar';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import { buildMediaUrl, getInitials, pickGradient } from '../utils/media';

export default function PremiumAvatar({
  src,
  name,
  size = 44,
  variant = 'circular',
  sx = {},
  fallbackIcon: FallbackIcon,
}) {
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = useMemo(() => buildMediaUrl(src), [src]);

  useEffect(() => {
    setImageError(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !imageError;
  const initials = getInitials(name);
  const gradient = pickGradient(name || resolvedSrc);
  const fontSize = Math.max(12, Math.round(size / 2.6));

  return (
    <Avatar
      src={showImage ? resolvedSrc : undefined}
      variant={variant}
      imgProps={{ onError: () => setImageError(true) }}
      sx={{
        width: size,
        height: size,
        fontWeight: 700,
        fontSize,
        color: '#f8fafc',
        background: showImage ? 'transparent' : gradient,
        border: '1px solid rgba(15, 23, 42, 0.08)',
        ...sx,
      }}
    >
      {!showImage && (FallbackIcon ? (
        <FallbackIcon sx={{ fontSize: Math.max(16, Math.round(size / 2.4)), color: '#f8fafc' }} />
      ) : (
        initials || <PersonRoundedIcon sx={{ fontSize: Math.max(16, Math.round(size / 2.4)) }} />
      ))}
    </Avatar>
  );
}

