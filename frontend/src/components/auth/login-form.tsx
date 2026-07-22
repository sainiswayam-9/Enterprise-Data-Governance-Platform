"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { getDefaultRouteForRole } from "@/lib/navigation";
import type { LoginCredentials } from "@/types/auth";

const loginSchema = z.object({
  username: z.string().min(3, "Username is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, status } = useAuth();

  const from = useMemo(() => searchParams.get("from") ?? "", [searchParams]);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(from || "/dashboard");
    }
  }, [from, router, status]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await login(values);
      toast.success(`Welcome back, ${session.username}.`);
      router.replace(from || getDefaultRouteForRole(session.role));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in.";
      toast.error(message);
    }
  });

  return (
    <Card className="border-border/70 bg-card/90 shadow-glow backdrop-blur">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <ShieldCheck className="h-4 w-4" />
          Secure access
        </div>
        <div>
          <CardTitle className="text-3xl">Sign in to the control center</CardTitle>
          <CardDescription className="mt-2 text-base">
            Authentication is handled through the existing FastAPI backend and the JWT is stored in an httpOnly cookie.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" autoComplete="username" placeholder="manager_admin" {...form.register("username")} />
            {form.formState.errors.username ? <p className="text-sm text-destructive">{form.formState.errors.username.message}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" placeholder="••••••••" {...form.register("password")} />
            {form.formState.errors.password ? <p className="text-sm text-destructive">{form.formState.errors.password.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || status === "loading"}>
            {form.formState.isSubmitting ? <Spinner label="Signing in" /> : <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" /> Sign in</span>}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex-col items-start gap-4">
        <Separator />
        <div className="flex items-start gap-3 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
          <p>
            Use the seeded credentials from the backend seed script. The dashboard will automatically adapt to your role.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
