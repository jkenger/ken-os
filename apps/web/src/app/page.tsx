import { redirect } from "next/navigation";

/** Home is the Profile module, which replaced Resume on 12 Oct 2026. Old bookmarks to `/` land there. */
export default function Home() {
  redirect("/profile");
}
