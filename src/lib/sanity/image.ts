import { createImageUrlBuilder } from "@sanity/image-url";
import { client } from "./client";

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

/**
 * Generate srcSet for responsive images
 */
export function srcSetFor(
  source: Parameters<typeof builder.image>[0],
  widths: number[] = [320, 640, 960, 1280, 1920],
) {
  const urls = widths.map((w) => `${urlFor(source).width(w).auto("format").url()} ${w}w`);
  return urls.join(", ");
}
