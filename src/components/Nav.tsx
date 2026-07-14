import { useLocation } from "@solidjs/router";
import { cn } from "~/lib/utils";

export default function Nav() {
  const location = useLocation();
  const active = (path: string) =>
    path == location.pathname ? "border-sky-600" : "border-transparent hover:border-sky-600";
  return (
		<nav class="bg-sky-800">
			<ul class="container flex items-center p-3 text-gray-200">
				<li class={cn("mx-1.5 border-b-2 sm:mx-6", active("/"))}>
					<a href="/">Home</a>
				</li>
				<li class={cn("mx-1.5 border-b-2 sm:mx-6", active("/about"))}>
					<a href="/about">About</a>
				</li>
			</ul>
		</nav>
	);
}
