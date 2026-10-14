import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  draft: z.boolean().default(false),
  externalUrl: z.string().url().optional(),
});

export const collections = {
  projects: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/projects' }), schema }),
  texts: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/texts' }), schema }),
  blog: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/blog' }), schema }),
};
