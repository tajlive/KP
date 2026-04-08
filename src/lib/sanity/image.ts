import createImageUrlBuilder from '@sanity/image-url';
import { client } from './client';

const imageBuilder = createImageUrlBuilder(client);

// =============================================================================
// IMAGE URL BUILDER
// =============================================================================

export function urlFor(source: unknown) {
  return imageBuilder.image(source);
}

// =============================================================================
// OPTIMIZED IMAGE URLS
// =============================================================================

export function getOptimizedImageUrl(
  source: unknown,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpg' | 'png' | 'avif';
    fit?: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min';
  } = {}
) {
  const { width = 800, height, quality = 80, format = 'webp', fit = 'clip' } = options;
  
  let builder = urlFor(source)
    .width(width)
    .quality(quality)
    .format(format as unknown)
    .fit(fit);
  
  if (height) {
    builder = builder.height(height);
  }
  
  return builder.url();
}

// =============================================================================
// RESPONSIVE IMAGE SRCSET
// =============================================================================

export function getResponsiveImageSrc(
  source: unknown,
  sizes: number[] = [320, 640, 960, 1280, 1920]
) {
  return sizes.map(size => ({
    src: getOptimizedImageUrl(source, { width: size }),
    width: size,
  }));
}

// =============================================================================
// PLACEHOLDER / LQIP
// =============================================================================

export function getPlaceholderUrl(source: unknown) {
  return urlFor(source)
    .width(20)
    .quality(20)
    .blur(10)
    .format('webp')
    .url();
}
