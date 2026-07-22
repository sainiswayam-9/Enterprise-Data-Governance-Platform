import Link from "next/link";
import { ArrowRight, Database, LockKeyhole, ShieldCheck, Users } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const highlights = [
  {
    icon: ShieldCheck,
    title: "Role-aware access",
    description: "Sessions are validated against the backend and the dashboard adapts to the authenticated role.",
  },
  {
    icon: Database,
    title: "Data service ready",
    description: "The frontend is prewired to the existing data service through same-origin proxy routes.",
  },
  {
    icon: Users,
    title: "Enterprise UX",
    description: "Responsive sidebar, dark mode, toasts, and reusable layout primitives are already in place.",
  },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.12),transparent_24%)]" />
      <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-cyan-950/20 sm:px-10 sm:py-12">
          <Badge className="border-white/15 bg-white/10 px-3 py-1 text-white">RBAC Control Center</Badge>
          <div className="mt-8 max-w-2xl space-y-6">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Secure enterprise access, designed for speed and clarity.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              This frontend sits in front of your existing FastAPI, MongoDB, JWT, and RBAC backend without changing a single API contract.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {highlights.map((item) => {
              const Icon = item.icon;

              return (
                <Card key={item.title} className="border-white/10 bg-white/5 text-white backdrop-blur">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h2 className="text-lg font-semibold">{item.title}</h2>
                    <p className="text-sm leading-6 text-slate-300">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Separator className="my-8 bg-white/10" />

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <LockKeyhole className="h-4 w-4 text-cyan-300" />
            <span>JWT stored in an httpOnly cookie</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:inline-flex" />
            <span>Server-side route protection</span>
            <span className="hidden h-1 w-1 rounded-full bg-slate-500 sm:inline-flex" />
            <span>Dark mode by default</span>
          </div>

          <div className="mt-8 flex items-center gap-3 text-sm">
            <Link href="#login" className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-slate-950 transition-transform hover:scale-[1.01]">
              Continue to sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
            <span className="text-slate-400">Use the seeded backend users to test role-based access.</span>
          </div>
        </section>

        <section id="login" className="w-full max-w-xl justify-self-center lg:justify-self-end">
          <LoginForm />
        </section>
      </div>
    </main>
  );
}
