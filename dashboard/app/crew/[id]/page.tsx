import { CrewScreen } from "@/components/crew/CrewScreen";

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CrewScreen id={id} />;
}
