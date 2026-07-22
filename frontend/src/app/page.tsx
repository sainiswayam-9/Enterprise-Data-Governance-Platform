import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AUTH_COOKIE_NAME } from "@/lib/backend";

export default function HomePage() {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value;
  redirect(token ? "/dashboard" : "/login");
}
