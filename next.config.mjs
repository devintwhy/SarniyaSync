/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseImagePattern;

if (supabaseUrl) {
	const storageUrl = new URL(supabaseUrl);
	supabaseImagePattern = {
		protocol: storageUrl.protocol.slice(0, -1),
		hostname: storageUrl.hostname,
		pathname: "/storage/v1/object/public/**",
		...(storageUrl.port ? { port: storageUrl.port } : {}),
	};
}

const nextConfig = {
	images: {
		remotePatterns: supabaseImagePattern ? [supabaseImagePattern] : [],
	},
};

export default nextConfig;
