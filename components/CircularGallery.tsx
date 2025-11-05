/**
 * Gallery Component
 *
 * An engaging, dynamic image gallery component that displays images in a scattered layout
 * with interactive drag-and-drop functionality. Features:
 * - Animated image entrance with staggered delays
 * - Drag-and-drop repositioning of images
 * - Central content area for headings and descriptions
 * - Responsive design with motion effects
 * - Uses framer-motion for smooth animations
 *
 * Props:
 * - items: Array of {image: string, text: string} objects to display
 * - heading: Main heading text (default: "EXCLUSIVE SHADCNBLOCKS")
 * - description: Description text below heading
 */

'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

interface GalleryItem {
  image: string;
  text: string;
}

interface CircularGalleryProps {
  items?: GalleryItem[];
  heading?: string;
  description?: string;
}

interface ImagePosition {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
}

export default function CircularGallery({
  items,
  heading = 'EXCLUSIVE SHADCNBLOCKS',
  description = 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing'
}: CircularGalleryProps) {
  const [shuffledItems, setShuffledItems] = useState<GalleryItem[]>([]);
  const [positions, setPositions] = useState<ImagePosition[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const defaultItems: GalleryItem[] = [
    {
      image: `https://picsum.photos/seed/1/600/800?grayscale`,
      text: 'Bridge'
    },
    {
      image: `https://picsum.photos/seed/2/600/800?grayscale`,
      text: 'Desk Setup'
    },
    {
      image: `https://picsum.photos/seed/3/600/800?grayscale`,
      text: 'Waterfall'
    },
    {
      image: `https://picsum.photos/seed/4/600/800?grayscale`,
      text: 'Strawberries'
    },
    {
      image: `https://picsum.photos/seed/5/600/800?grayscale`,
      text: 'Deep Diving'
    },
    {
      image: `https://picsum.photos/seed/16/600/800?grayscale`,
      text: 'Train Track'
    },
    {
      image: `https://picsum.photos/seed/17/600/800?grayscale`,
      text: 'Santorini'
    },
    {
      image: `https://picsum.photos/seed/8/600/800?grayscale`,
      text: 'Blurry Lights'
    }
  ];

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Generate positions for images in a scattered layout
  const generatePositions = (count: number, mobile: boolean = false): ImagePosition[] => {
    const positions: ImagePosition[] = [];

    if (mobile) {
      // Mobile: stacked/piled layout starting from left, top card at center-left
      for (let i = 0; i < count; i++) {
        // Start from left, each card spreads to the right
        // Push entire stack 8% to the left from center
        const baseOffset = -8;
        const offsetX = baseOffset + (i - (count - 1)) * 3.5; // Wider spread
        const offsetY = (i - (count - 1)) * 1.2 + (Math.random() - 0.5) * 1;
        const x = 50 + offsetX;
        const y = 48 + offsetY; // Position centered vertically
        const rotation = (i - (count - 1)) * 4 + (Math.random() - 0.5) * 5; // Progressive rotation
        const scale = 0.97 + Math.random() * 0.03; // Slightly varied size
        const zIndex = i; // Higher index = on top

        positions.push({ x, y, rotation, scale, zIndex });
      }
    } else {
      // Desktop: scattered layout avoiding center
      const areas = [
        // Top left
        { x: { min: 5, max: 25 }, y: { min: 5, max: 30 } },
        // Top center-left
        { x: { min: 15, max: 35 }, y: { min: 10, max: 25 } },
        // Top right
        { x: { min: 70, max: 90 }, y: { min: 5, max: 25 } },
        // Middle left
        { x: { min: 5, max: 20 }, y: { min: 35, max: 55 } },
        // Middle right
        { x: { min: 75, max: 95 }, y: { min: 35, max: 55 } },
        // Bottom left
        { x: { min: 10, max: 30 }, y: { min: 65, max: 90 } },
        // Bottom center-left
        { x: { min: 25, max: 40 }, y: { min: 70, max: 85 } },
        // Bottom right
        { x: { min: 65, max: 85 }, y: { min: 70, max: 90 } }
      ];

      for (let i = 0; i < count; i++) {
        const area = areas[i % areas.length];
        const x = Math.random() * (area.x.max - area.x.min) + area.x.min;
        const y = Math.random() * (area.y.max - area.y.min) + area.y.min;
        const rotation = (Math.random() - 0.5) * 15; // -7.5 to 7.5 degrees
        const scale = 0.9 + Math.random() * 0.2; // 0.9 to 1.1
        const zIndex = i;

        positions.push({ x, y, rotation, scale, zIndex });
      }
    }

    return positions;
  };

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize gallery items and positions (only on mount and items change)
  useEffect(() => {
    const galleryItems = items && items.length ? items : defaultItems;
    setShuffledItems(shuffleArray(galleryItems));
  }, [items]);

  // Set positions based on mobile state
  useEffect(() => {
    if (shuffledItems.length > 0) {
      setPositions(generatePositions(shuffledItems.length, isMobile));
    }
  }, [shuffledItems.length, isMobile]);

  // Get animation props for each image
  const getImageAnimation = (index: number) => ({
    initial: { opacity: 0, scale: 0.8, rotate: -20 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    transition: {
      delay: index * 0.1,
      duration: 0.6,
      ease: [0.43, 0.13, 0.23, 0.96] as const
    }
  });

  return (
    <div className="relative w-screen h-screen bg-white overflow-hidden touch-none">
      {/* Decorative SVG background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="20" cy="20" r="1" fill="currentColor" opacity="0.1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Central Content - Mobile positioned at top (160px), Desktop centered */}
      <div className={`absolute inset-0 flex ${isMobile ? 'items-start' : 'items-center'} justify-center pointer-events-none px-4`} style={isMobile ? { paddingTop: '160px' } : {}}>
        <div className="max-w-2xl text-center z-10">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className={
              isMobile
                ? 'text-3xl sm:text-4xl font-bold tracking-tight mb-4'
                : 'text-5xl md:text-7xl font-bold tracking-tight mb-6'
            }
          >
            {heading}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className={
              isMobile
                ? 'text-gray-600 text-sm sm:text-base leading-relaxed px-4'
                : 'text-gray-600 text-lg md:text-xl leading-relaxed'
            }
          >
            {description}
          </motion.p>
        </div>
      </div>

      {/* Scattered Images */}
      {shuffledItems.map((item, index) => {
        const position = positions[index];
        if (!position) return null;

        return (
          <motion.div
            key={`${item.image}-${index}`}
            {...getImageAnimation(index)}
            drag
            dragElastic={0.05}
            dragConstraints={{
              left: -window.innerWidth,
              right: window.innerWidth,
              top: -window.innerHeight,
              bottom: window.innerHeight
            }}
            dragMomentum={false}
            whileHover={{ scale: 1.05, zIndex: 50 }}
            whileTap={{ scale: 1.1, zIndex: 50 }}
            whileDrag={{ scale: 1.1, zIndex: 50 }}
            className="absolute cursor-grab active:cursor-grabbing touch-none"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              zIndex: position.zIndex,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.div
              className="relative rounded-lg overflow-hidden shadow-2xl"
              style={{
                rotate: position.rotation,
                scale: position.scale
              }}
            >
              <img
                src={item.image}
                alt={item.text}
                style={{
                  width: isMobile ? '220px' : '288px',
                  height: isMobile ? '293px' : '384px',
                  objectFit: 'cover'
                }}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
            </motion.div>
          </motion.div>
        );
      })}

      {/* Decorative diagonal line */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.1"
        />
      </svg>
    </div>
  );
}
