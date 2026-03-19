import { createRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { rootRoute } from "@/routes/__root";

export const indexRoute = createRoute({
  component: IndexRouteComponent,
  getParentRoute: () => rootRoute,
  path: "/",
});

function IndexRouteComponent() {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader>
        <CardTitle>Choose a workspace</CardTitle>
        <CardDescription>
          The shell mirrors Tau’s information density, but now the experience is React-driven and
          backed by typed APIs.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        Pick a project on the left, then create or open a workspace to start chatting.
      </CardContent>
    </Card>
  );
}
