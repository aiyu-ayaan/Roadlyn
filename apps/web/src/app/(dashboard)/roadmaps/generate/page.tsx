import { PageHeader } from '@/components/layout/page-header';
import { RoadmapGenerator } from '@/features/roadmaps/roadmap-generator';

export default function GenerateRoadmapPage() {
  return (
    <div>
      <PageHeader
        title="Generate roadmap"
        description="Create a learning plan using dynamic providers and models from the AI gateway."
      />
      <RoadmapGenerator />
    </div>
  );
}
