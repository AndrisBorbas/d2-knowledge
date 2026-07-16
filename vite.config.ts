import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin as nitro } from "@solidjs/vite-plugin-nitro-2";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import mkcert from "vite-plugin-mkcert";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");

	return {
		define: {
			"process.env": env,
		},
		plugins: [mkcert(), solidStart(), tailwindcss(), nitro()],
	};
});
