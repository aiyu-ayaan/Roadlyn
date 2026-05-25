import { Metadata } from 'next';
import RoadmapDetailClient from './roadmap-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getRoadmapData(id: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const res = await fetch(`${apiUrl}/api/roadmaps/${id}`, {
      next: { revalidate: 60 }, // Cache roadmap pre-fetches for 60 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (error) {
    console.error('Failed to pre-fetch roadmap SEO metadata:', error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const roadmap = await getRoadmapData(id);

  if (!roadmap) {
    return {
      title: 'AI Course Syllabus - Roadlyn',
      description: 'Access and study custom AI-generated learning paths on Roadlyn.',
    };
  }

  const title = roadmap.generatedCourse?.title || roadmap.title || `${roadmap.topic} Syllabus`;
  const description =
    roadmap.generatedCourse?.overview ||
    roadmap.goal ||
    `Access this custom AI course syllabus on ${roadmap.topic} with current tutorials, exercises, and interview guides.`;
  const slug = roadmap.slug || '';
  const canonicalUrl = `/roadmaps/${id}${slug ? `/${slug}` : ''}`;

  return {
    title: `${title} - Roadlyn AI`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${title} - Roadlyn AI`,
      description,
      type: 'website',
      url: canonicalUrl,
      siteName: 'Roadlyn',
      images: [
        {
          url: 'https://roadlyn.ai/images/og-cover.png',
          width: 1200,
          height: 630,
          alt: `${title} on Roadlyn`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} - Roadlyn AI`,
      description,
      images: ['https://roadlyn.ai/images/og-cover.png'],
    },
  };
}

export default async function RoadmapPage({ params }: PageProps) {
  const { id } = await params;
  return <RoadmapDetailClient id={id} />;
}
