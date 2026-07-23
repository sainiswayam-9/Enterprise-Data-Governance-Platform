"use client";

import { MoonStar, Settings2, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <Card className="border-border/60 bg-card/90 backdrop-blur">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">Preferences</Badge>
          <CardTitle className="mt-2 text-3xl">Settings</CardTitle>
          <CardDescription className="text-base">Small workspace preferences that stay in the frontend layer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Settings2 className="h-4 w-4" />
              Theme
            </div>
            <p className="mt-2 text-sm text-foreground">Current mode: {theme ?? "system"}</p>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => setTheme("light")}>
                <SunMedium className="mr-2 h-4 w-4" /> Light
              </Button>
              <Button variant="outline" onClick={() => setTheme("dark")}>
                <MoonStar className="mr-2 h-4 w-4" /> Dark
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">Session</p>
            <p className="mt-2 text-sm text-foreground">Signed in as {user?.username ?? "loading..."}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
