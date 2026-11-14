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
		// Kompres gambar otomatis dengan format WebP dan AVIF untuk efisiensi transfer data
		formats: ["image/avif", "image/webp"],
	},
	// Aktifkan kompresi HTTP/gzip untuk semua respons server
	compress: true,
	// Nonaktifkan header X-Powered-By untuk keamanan minimal
	poweredByHeader: false,
};

export default nextConfig;