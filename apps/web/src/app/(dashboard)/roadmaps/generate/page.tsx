import { PageHeader } from '@/components/layout/page-header';
import { RoadmapGenerator } from '@/features/roadmaps/roadmap-generator';

export default function GenerateRoadmapPage() {
  return (
    <div>
      <PageHeader
        title="Create AI course"
        description="Generate a Udemy-style course and roadmap from live web research, docs, videos, repos, and current best practices."
      />
      <RoadmapGenerator />
    </div>
  );
}
