import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { motion, AnimatePresence } from 'framer-motion';

const FALLBACK_DEST_IMAGE = '/no-image-fallback.png';

const DestinationGallery = ({ images = [], title = '' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Ensure we have at least one image
  const displayImages = images && images.length > 0 ? images : [FALLBACK_DEST_IMAGE];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: '16px',
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        marginBottom: 3,
      }}
    >
      {/* Image Container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          paddingBottom: '66.67%', // 3:2 aspect ratio
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={displayImages[currentIndex]}
            alt={`${title} - ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
            onError={(e) => {
              e.target.src = FALLBACK_DEST_IMAGE;
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </AnimatePresence>

        {/* Gallery Counter Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(10px)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          {currentIndex + 1} / {displayImages.length}
        </motion.div>

        {/* Navigation Buttons */}
        {displayImages.length > 1 && (
          <>
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
              }}
            >
              <IconButton
                onClick={prevImage}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#2d5a5b',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  },
                  width: 44,
                  height: 44,
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                zIndex: 10,
              }}
            >
              <IconButton
                onClick={nextImage}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  color: '#2d5a5b',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  },
                  width: 44,
                  height: 44,
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </motion.div>
          </>
        )}

        {/* Gradient overlay for text readability */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '100px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
            zIndex: 5,
          }}
        />
      </Box>

      {/* Thumbnail Dots */}
      {displayImages.length > 1 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            p: 2,
            justifyContent: 'center',
            backgroundColor: '#fff',
            flexWrap: 'wrap',
          }}
        >
          {displayImages.map((_, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleDotClick(index)}
              style={{
                width: currentIndex === index ? 32 : 12,
                height: 12,
                borderRadius: '6px',
                background: currentIndex === index 
                  ? 'linear-gradient(135deg, #4F8A8B 0%, #2d5a5b 100%)' 
                  : '#ddd',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default DestinationGallery;
