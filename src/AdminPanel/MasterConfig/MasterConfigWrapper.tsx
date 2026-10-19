import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import MasterConfigHub from "./MasterConfigHub";
import type { MasterTab } from "./MasterConfigHub";

export default function MasterConfigWrapper({ defaultTab }: { defaultTab: MasterTab }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get("tab");
  const defaultTabAppliedRef = useRef<string | null>(null);

  useEffect(() => {
    if (currentTab !== defaultTab && defaultTabAppliedRef.current !== defaultTab) {
      defaultTabAppliedRef.current = defaultTab;
      setSearchParams({ tab: defaultTab }, { replace: true });
    }
  }, [defaultTab, currentTab, setSearchParams]);

  return <MasterConfigHub />;
}
