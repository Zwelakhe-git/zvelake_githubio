const API = import.meta.env.VITE_API_URL; // например http://192.168.1.10:3000

export async function uploadToCloud(file: File) {
  const contentType = file.type || "application/octet-stream";

  const res = await fetch(`${API}/api/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, contentType }),
  });
  if (!res.ok) throw new Error("Не удалось получить ссылку для загрузки");
  const { key, uploadUrl, url } = await res.json();

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType }, // должен совпадать с тем, что подписал сервер
    body: file,
  });
  if (!put.ok) throw new Error(`Загрузка не удалась: ${put.status}`);

  return { key, url };
}
