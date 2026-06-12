import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import { buildMediaUrl, getInitials, pickGradient } from '../utils/media';

export default function PremiumImage({
  src,
  alt,
  name,
  height = 220,
  width = '100%',
  showLabel = false,
  sx = {},
  imgSx = {},
  imgProps = {},
}) {
  const [imageError, setImageError] = useState(false);
  const resolvedSrc = useMemo(() => buildMediaUrl(src), [src]);
  const numericHeight = typeof height === 'number' ? height : 220;

  useEffect(() => {
    setImageError(false);
  }, [resolvedSrc]);

  const showImage = Boolean(resolvedSrc) && !imageError;
  const initials = getInitials(name || alt);
  const gradient = pickGradient(name || alt || resolvedSrc);
  const fontSize = Math.max(22, Math.round(numericHeight / 3.2));

  return (
    <Box
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
    >
      {showImage ? (
        <Box
          component="img"
          src={resolvedSrc}
          alt={alt}
          onError={() => setImageError(true)}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...imgSx,
          }}
          {...imgProps}
        />
      ) : (
        <Box
          sx={{
            width: '100%',
            height: '100%',
            background: gradient,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0.6,
          }}
        >
          {initials ? (
            <Typography
              sx={{
                fontSize,
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#f8fafc',
              }}
            >
              {initials}
            </Typography>
          ) : (
            <ImageNotSupportedIcon sx={{ fontSize: 42, color: '#f8fafc' }} />
          )}
          {showLabel && (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'rgba(248, 250, 252, 0.9)',
              }}
            >
              No Photo
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

