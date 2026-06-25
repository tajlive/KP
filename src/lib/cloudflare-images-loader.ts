/**
 * Custom Next.js image loader for Cloudflare Images.
 *
 * Cloudflare Images serves images from:
 *   https://imagedelivery.net/<accountHash>/<imageId>/<variant>
 *
 * This loader assumes the src is either:
 * - a relative path to an image stored in Cloudflare Images, or
 * - an already absolute URL to an externally hosted image.
 *
 * For external/remote images Cloudflare Image Transformations can be used via
 * the `/cdn-cgi/image/` proxy path if enabled for the zone. Otherwise the
 * original URL is returned unchanged.
 *
 * @see https://developers.cloudflare.com/images/image-transformations/
 */

const DEFAULT_QUALITY = 75;
const DEFAULT_VARIANT = "public";

export default function cloudflareImagesLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const accountHash = process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH;

  if (!accountHash) {
    throw new Error(
      "NEXT_PUBLIC_CLOUDFLARE_IMAGES_ACCOUNT_HASH is required when using the Cloudflare Images loader."
    );
  }

  const params = new URLSearchParams();
  params.set("width", String(width));
  params.set("quality", String(quality ?? DEFAULT_QUALITY));
  params.set("format", "auto");

  // External/remote image: use Cloudflare Image Transformations proxy if the
  // src is already an absolute URL.
  if (src.startsWith("http://") || src.startsWith("https://")) {
    // Transformations proxy works for zones with the feature enabled.
    return `/cdn-cgi/image/${params.toString()}/${src}`;
  }

  // Local/relative image id stored in Cloudflare Images.
  const imageId = src.replace(/^\//, "");
  return `https://imagedelivery.net/${accountHash}/${imageId}/${DEFAULT_VARIANT}?${params.toString()}`;
}
