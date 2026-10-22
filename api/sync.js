// Verlânia · sincronização entre aparelhos (função da Vercel + banco Upstash Redis)
// Guarda apenas um texto já criptografado no aparelho; o servidor não consegue ler os dados.
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(cmd) {
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error("redis " + r.status);
  return (await r.json()).result;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    return res.status(500).json({ error: "O banco de dados ainda não está conectado ao projeto na Vercel." });
  }
  const id = String((req.query && req.query.id) || "");
  if (!/^[a-f0-9]{64}$/.test(id)) return res.status(400).json({ error: "Identificador inválido." });
  const key = "verlania:" + id;
  try {
    if (req.method === "GET") {
      const v = await redis(["GET", key]);
      return res.status(200).json(v ? JSON.parse(v) : {});
    }
    if (req.method === "PUT") {
      let b = req.body;
      if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = null; } }
      if (!b || typeof b.data !== "string" || typeof b.u !== "number") {
        return res.status(400).json({ error: "Dados inválidos." });
      }
      if (b.data.length > 1500000) return res.status(413).json({ error: "Dados grandes demais." });
      const cur = await redis(["GET", key]);
      const c = cur ? JSON.parse(cur) : null;
      if (c && c.u !== b.base) return res.status(409).json(c);
      await redis(["SET", key, JSON.stringify({ u: b.u, data: b.data })]);
      return res.status(200).json({ u: b.u });
    }
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Método não permitido." });
  } catch (e) {
    return res.status(500).json({ error: "Falha ao acessar o banco de dados." });
  }
};
