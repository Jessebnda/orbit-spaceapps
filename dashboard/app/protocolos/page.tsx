import { Suspense } from "react";
import { ProtocolsScreen } from "@/components/protocols/ProtocolsScreen";

// useSearchParams (?para=<crewId>) needs a Suspense boundary.
export default function Page() {
  return (
    <Suspense>
      <ProtocolsScreen />
    </Suspense>
  );
}
