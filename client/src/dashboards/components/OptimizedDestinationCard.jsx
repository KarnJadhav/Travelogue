import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import Rating from '@mui/material/Rating';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';

// Better fallback image (simple background color)
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

// Optimized destination card component
const DestinationCard = React.memo(function DestinationCard({
  dest,
  viewMode,
  isFavorite,
  onCardClick,
  onFavoriteClick,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageSrc] = useState(dest.image || null);

  useEffect(() => {
    // If no image provided, mark as error immediately
    if (!imageSrc) {
      setImageError(true);
    }
  }, [imageSrc]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    console.warn(`⚠️ Image failed to load for ${dest.name}:`, imageSrc);
    setImageError(true);
  };

  const isGrid = viewMode === 'grid';

  return (
    <Card
      onClick={onCardClick}
      sx={{
        cursor: 'pointer',
        height: isGrid ? 380 : 120,
        display: 'flex',
        flexDirection: isGrid ? 'column' : 'row',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #f0f0f0',
        overflow: 'hidden',
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': {
          boxShadow: '0 6px 16px rgba(79, 138, 139, 0.15)',
          borderColor: 'rgba(79, 138, 139, 0.2)',
        },
        background: '#fff',
      }}
    >
      {/* Image Section */}
      <Box
        sx={{
          width: isGrid ? '100%' : 120,
          height: isGrid ? 160 : '100%',
          overflow: 'hidden',
          bgcolor: '#f5f5f5',
          position: 'relative',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Skeleton loader while image loads */}
        {!imageLoaded && !imageError && (
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              bgcolor: '#e8e8e8',
              animation: 'pulse 1.5s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.6 },
                '50%': { opacity: 1 },
              },
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#999', fontSize: '12px' }}>Loading...</Typography>
          </Box>
        )}

        {/* Fallback gradient when image fails */}
        {imageError && (
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: FALLBACK_GRADIENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <ImageNotSupportedIcon
              sx={{
                fontSize: 40,
                color: 'rgba(255, 255, 255, 0.6)',
              }}
            />
          </Box>
        )}

        {/* Actual Image */}
        {imageSrc && (
          <img
            src={imageSrc}
            alt={dest.name}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: imageLoaded && !imageError ? 1 : 0,
              transition: 'opacity 0.3s ease',
              position: 'absolute',
            }}
          />
        )}

        {/* Favorite Button */}
        <IconButton
          size="small"
          onClick={e => {
            e.stopPropagation();
            onFavoriteClick(dest);
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(4px)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 1)',
            },
            zIndex: 10,
          }}
        >
          {isFavorite(dest) ? (
            <FavoriteIcon sx={{ color: '#FF6F61', fontSize: 20 }} />
          ) : (
            <FavoriteBorderIcon sx={{ color: '#999', fontSize: 20 }} />
          )}
        </IconButton>
      </Box>

      {/* Content Section */}
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: isGrid ? '12px' : '10px',
        }}
      >
        {isGrid ? (
          <>
            {/* Grid View Content */}
            <Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  fontSize: '14px',
                  mb: 0.5,
                  color: '#1a1a1a',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {dest.name}
              </Typography>

              {(dest.city || dest.country) && (
                <Stack direction="row" spacing={0.5} alignItems="center" mb={0.8}>
                  <LocationOnIcon sx={{ fontSize: 12, color: '#4F8A8B', flexShrink: 0 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#6B7280',
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {[dest.city, dest.country].filter(Boolean).join(', ')}
                  </Typography>
                </Stack>
              )}

              {(dest.category || dest.details?.kinds) && (
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    color: '#6B7280',
                    fontSize: '10px',
                    maxHeight: 28,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {(dest.category || dest.details?.kinds).substring(0, 50)}
                </Typography>
              )}
            </Box>

            {/* Rating */}
            {dest.rating && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Rating
                  value={Math.min(Math.max(dest.rating || 0, 0), 5)}
                  readOnly
                  size="small"
                />
                <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '10px' }}>
                  ({dest.rating?.toFixed(1)})
                </Typography>
              </Stack>
            )}
          </>
        ) : (
          <>
            {/* List View Content */}
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '13px', color: '#1a1a1a' }}>
                {dest.name}
              </Typography>
              {(dest.city || dest.country) && (
                <Typography sx={{ fontSize: '11px', color: '#6B7280', mt: 0.3 }}>
                  {[dest.city, dest.country].filter(Boolean).join(', ')}
                </Typography>
              )}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default DestinationCard;
