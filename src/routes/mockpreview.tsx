import { createFileRoute } from "@tanstack/react-router";
import { TabMockContent } from "@/components/TabMockContent";

export const Route = createFileRoute("/mockpreview")({ component: () => (
  <div className="flex flex-col gap-8 p-6">
    <TabMockContent kind="explain" />
    <TabMockContent kind="flowchart" />
    <TabMockContent kind="comments" />
    <TabMockContent kind="bugs" />
    <TabMockContent kind="improve" />
    <TabMockContent kind="bigo" />
  </div>
) });
