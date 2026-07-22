import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LockKeyhole } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-lg border-border/70 bg-card/90 shadow-glow backdrop-blur">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <CardTitle className="mt-4">401 - Session required</CardTitle>
          <CardDescription>
            Your session is missing or expired. Sign in again to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild>
            <Link href="/login">Go to login</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">Home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
