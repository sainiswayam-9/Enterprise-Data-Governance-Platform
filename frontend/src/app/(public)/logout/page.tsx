"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function LogoutPage() {
  const router = useRouter();
  const { logout } = useAuth();

  useEffect(() => {
    let mounted = true;

    const performLogout = async () => {
      try {
        await logout();
      } finally {
        if (mounted) {
          router.replace("/login");
        }
      }
    };

    void performLogout();

    return () => {
      mounted = false;
    };
  }, [logout, router]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md border-border/70 bg-card/90 shadow-glow backdrop-blur">
        <CardHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <LogOut className="h-5 w-5" />
          </div>
          <CardTitle className="mt-4">Signing you out</CardTitle>
          <CardDescription>
            The session cookie is being cleared and you will be returned to the login screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Spinner label="Ending secure session" />
        </CardContent>
      </Card>
    </main>
  );
}
