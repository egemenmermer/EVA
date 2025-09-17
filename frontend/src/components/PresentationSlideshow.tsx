import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Presentation, Maximize, Minimize } from 'lucide-react';

// Import slide images
import slide1 from '@/assets/presentation-slides/1.jpg';
import slide2 from '@/assets/presentation-slides/2.jpg';
import slide3 from '@/assets/presentation-slides/3.jpg';
import slide4 from '@/assets/presentation-slides/4.jpg';
import slide5 from '@/assets/presentation-slides/5.jpg';

interface PresentationSlideshowProps {
  isDarkMode?: boolean;
}

export const PresentationSlideshow: React.FC<PresentationSlideshowProps> = ({ isDarkMode = false }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const presentationRef = useRef<HTMLDivElement>(null);
  
  // Actual slides from converted PPTX
  const slides = [
    {
      image: slide1,
      alt: "Experiment Introduction - Slide 1"
    },
    {
      image: slide2,
      alt: "Experiment Introduction - Slide 2"
    },
    {
      image: slide3,
      alt: "Experiment Introduction - Slide 3"
    },
    {
      image: slide4,
      alt: "Experiment Introduction - Slide 4"
    },
    {
      image: slide5,
      alt: "Experiment Introduction - Slide 5"
    }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const toggleFullscreen = async () => {
    if (!presentationRef.current) return;

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (presentationRef.current.requestFullscreen) {
          await presentationRef.current.requestFullscreen();
        } else if ((presentationRef.current as any).webkitRequestFullscreen) {
          await (presentationRef.current as any).webkitRequestFullscreen();
        } else if ((presentationRef.current as any).msRequestFullscreen) {
          await (presentationRef.current as any).msRequestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFullscreen) {
        switch (event.key) {
          case 'ArrowLeft':
            event.preventDefault();
            prevSlide();
            break;
          case 'ArrowRight':
            event.preventDefault();
            nextSlide();
            break;
          case 'Escape':
            event.preventDefault();
            if (isFullscreen) {
              toggleFullscreen();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  return (
    <div className="w-full max-w-sm">
      {/* Presentation Container */}
      <div 
        ref={presentationRef}
        className={`relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : ''
        }`}
      >
        
        {/* Presentation Header */}
        <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Presentation className="h-5 w-5" />
              <h3 className="text-base font-semibold">Experiment Introduction</h3>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-blue-200 text-xs font-medium">
                {currentSlide + 1} / {slides.length}
              </span>
              <button
                onClick={toggleFullscreen}
                className="p-1.5 hover:bg-blue-700 dark:hover:bg-blue-600 rounded-lg transition-colors"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Slide Content */}
        <div className="relative bg-gray-100 dark:bg-gray-700">
          <div className={`aspect-video relative overflow-hidden ${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].alt}
              className="w-full h-full object-contain bg-white"
            />
            
            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              className={`absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-sm ${
                isFullscreen ? 'p-4 left-4' : ''
              }`}
              aria-label="Previous slide"
            >
              <ChevronLeft className={isFullscreen ? "h-8 w-8" : "h-4 w-4"} />
            </button>
            
            <button
              onClick={nextSlide}
              className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-all backdrop-blur-sm ${
                isFullscreen ? 'p-4 right-4' : ''
              }`}
              aria-label="Next slide"
            >
              <ChevronRight className={isFullscreen ? "h-8 w-8" : "h-4 w-4"} />
            </button>

            {/* Fullscreen Instructions */}
            {isFullscreen && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg backdrop-blur-sm">
                <p className="text-sm">Use ← → arrow keys to navigate • Press ESC to exit fullscreen</p>
              </div>
            )}
          </div>
        </div>

        {/* Slide Indicators and Controls */}
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3">
          <div className="flex justify-between items-center">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>Prev</span>
            </button>

            <div className="flex justify-center space-x-1.5">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide
                      ? 'bg-blue-600 transform scale-125'
                      : 'bg-gray-300 dark:bg-gray-500 hover:bg-gray-400 dark:hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="flex items-center space-x-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {!isFullscreen && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Click ⛶ for fullscreen presentation
          </p>
        </div>
      )}
    </div>
  );
}; 