import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import MasterConfigHub from "./MasterConfigHub";
import type { MasterTab } from "./MasterConfigHub";

export default function MasterConfigWrapper({ defaultTab }: { defaultTab: MasterTab }) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get("tab") !== defaultTab) {
      setSearchParams({ tab: defaultTab }, { replace: true });
    }
  }, [defaultTab, searchParams, setSearchParams]);

  return <MasterConfigHub />;
}
