import { PortableText as SanityPortableText, PortableTextComponents } from '@portabletext/react';
import Image from 'next/image';
import { urlFor } from '@/lib/sanity/image';

interface PortableTextProps {
  value: unknown;
  className?: string;
}

const components: PortableTextComponents = {
  block: {
    h1: ({ children }) => <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{children}</h1>,
    h2: ({ children }) => <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{children}</h2>,
    h3: ({ children }) => <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{children}</h3>,
    normal: ({ children }) => <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 my-4">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-5 mb-4 text-gray-700 dark:text-gray-300">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-5 mb-4 text-gray-700 dark:text-gray-300">{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li className="mb-1">{children}</li>,
    number: ({ children }) => <li className="mb-1">{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    link: ({ value, children }) => (
      <a href={value?.href} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 underline">
        {children}
      </a>
    ),
  },
  types: {
    image: ({ value }) => {
      const imageUrl = value?.asset ? urlFor(value).width(800).url() : null;
      const alt = value?.alt ?? '';
      const caption = value?.caption;
      if (!imageUrl) return null;
      return (
        <figure className="my-6">
          <Image
            src={imageUrl}
            alt={alt}
            width={800}
            height={450}
            className="rounded-xl w-full object-cover"
          />
          {caption && (
            <figcaption className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    },
    cta: ({ value }) => {
      const style = value?.style ?? 'primary';
      const baseClasses = 'inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all';
      const styleClasses =
        style === 'primary'
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : style === 'secondary'
            ? 'bg-slate-800 text-white hover:bg-slate-700'
            : 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20';
      return (
        <div className="my-6">
          <a href={value?.link} className={`${baseClasses} ${styleClasses}`}>
            {value?.text}
          </a>
        </div>
      );
    },
  },
};

export function PortableText({ value, className }: PortableTextProps) {
  if (!value || !Array.isArray(value)) return null;
  return (
    <div className={className}>
      <SanityPortableText value={value} components={components} />
    </div>
  );
}
