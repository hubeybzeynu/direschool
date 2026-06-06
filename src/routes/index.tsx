import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dire Dawa Schools" },
      { name: "description", content: "School management portal for Dire Dawa schools." },
      { property: "og:title", content: "Dire Dawa Schools" },
      { property: "og:description", content: "School management portal for Dire Dawa schools." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <div className="max-w-xl text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground mb-6">
          <GraduationCap className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Dire Dawa Schools Portal
        </h1>
        <p className="mt-4 text-muted-foreground">
          Sign in to choose your school and manage students, results, and more.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/schools">Browse schools</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
