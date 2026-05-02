import { createImageUrlBuilder } from '@sanity/image-url';
import { client } from './client';

const builder = createImageUrlBuilder(client);

/**
 * Build a responsive Sanity image URL
 *
 * Usage:
 *   <Image src={urlFor(image).width(800).url()} ... />
 */
export function urlFor(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}
