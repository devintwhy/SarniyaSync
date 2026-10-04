import { createSupabaseBrowserClient } from "@/utils/supabase/client";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadProductImage(file: File) {
  const extension = imageExtensions[file.type];
  if (!extension) {
    throw new Error("Gunakan gambar berformat JPG, PNG, atau WebP.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Ukuran gambar maksimal 5 MB.");
  }

  const supabase = createSupabaseBrowserClient();
  const path = `product-images/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage.from("products").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Upload gambar gagal: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from("products")
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}