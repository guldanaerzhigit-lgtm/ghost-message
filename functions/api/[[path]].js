const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff"
  }
});

const uuid = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const hashToken = async (token) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
};
const getToken = (request) => {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};
const safeMessage = (row) => ({
  id: row.id,
  from: row.sender_name || "Незнакомец",
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  mode: row.mode,
  text: row.body,
  status: row.status,
  scheduledAt: row.scheduled_at,
  parentId: row.parent_id,
  time: row.created_at,
  replies: Number(row.reply_count || 0),
  likes: Number(row.likes || 0)
});

async function requireUser(request, env) {
  const token = getToken(request);
  if (!token || token.length < 32) return null;
  const tokenHash = await hashToken(token);
  const user = await env.DB.prepare(
    "SELECT id, display_name FROM users WHERE token_hash = ?"
  ).bind(tokenHash).first();
  if (user) {
    await env.DB.prepare("UPDATE users SET last_seen = ? WHERE id = ?")
      .bind(nowIso(), user.id).run();
  }
  return user || null;
}

async function bodyJson(request) {
  try { return await request.json(); } catch { return null; }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.DB) return json({ error: "D1 binding DB is missing. Check the Pages D1 binding." }, 500);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "access-control-allow-methods": "GET,POST,DELETE,OPTIONS", "access-control-allow-headers": "Content-Type, Authorization" } });
  }

  try {
    // Create an anonymous account and issue a random bearer token. The raw token is never stored in D1.
    if (path === "session" && method === "POST") {
      const token = [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");
      const id = uuid();
      const tokenHash = await hashToken(token);
      const displayName = "Призрак № " + String(Math.floor(100 + Math.random() * 900));
      await env.DB.prepare("INSERT INTO users (id, token_hash, display_name, last_seen) VALUES (?, ?, ?, ?)")
        .bind(id, tokenHash, displayName, nowIso()).run();
      return json({ user: { id, displayName }, token }, 201);
    }

    const user = await requireUser(request, env);
    if (!user) return json({ error: "Сессия не найдена. Создай новую анонимную сессию." }, 401);

    if (path === "me" && method === "GET") {
      const row = await env.DB.prepare(
        "SELECT COUNT(*) AS sent FROM messages WHERE sender_id = ?"
      ).bind(user.id).first();
      return json({ user: { id: user.id, displayName: user.display_name }, sent: Number(row?.sent || 0) });
    }

    if (path === "messages" && method === "GET") {
      const kind = url.searchParams.get("kind") || "inbox";
      let result;
      if (kind === "sent") {
        result = await env.DB.prepare(`
          SELECT m.*, u.display_name AS sender_name,
            (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) AS reply_count,
            (SELECT COUNT(*) FROM reactions x WHERE x.message_id = m.id AND x.reaction = 'heart') AS likes
          FROM messages m JOIN users u ON u.id = m.sender_id
          WHERE m.sender_id = ? AND m.mode = 'random'
          ORDER BY m.created_at DESC LIMIT 100
        `).bind(user.id).all();
      } else {
        result = await env.DB.prepare(`
          SELECT m.*, u.display_name AS sender_name,
            (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) AS reply_count,
            (SELECT COUNT(*) FROM reactions x WHERE x.message_id = m.id AND x.reaction = 'heart') AS likes
          FROM messages m JOIN users u ON u.id = m.sender_id
          WHERE m.recipient_id = ? AND m.status = 'delivered' AND m.scheduled_at IS NULL
          ORDER BY m.created_at DESC LIMIT 100
        `).bind(user.id).all();
      }
      return json({ messages: (result.results || []).map(safeMessage) });
    }

    if (path === "feed" && method === "GET") {
      const result = await env.DB.prepare(`
        SELECT m.*, u.display_name AS sender_name,
          (SELECT COUNT(*) FROM messages r WHERE r.parent_id = m.id) AS reply_count,
          (SELECT COUNT(*) FROM reactions x WHERE x.message_id = m.id AND x.reaction = 'heart') AS likes
        FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.mode = 'public' AND m.status = 'delivered'
        ORDER BY m.created_at DESC LIMIT 100
      `).all();
      return json({ messages: (result.results || []).map(safeMessage) });
    }

    if (path === "messages" && method === "POST") {
      const data = await bodyJson(request);
      if (!data || typeof data.text !== "string") return json({ error: "Ожидается текст сообщения." }, 400);
      const text = data.text.trim();
      if (!text || text.length > 500) return json({ error: "Сообщение должно содержать от 1 до 500 символов." }, 400);
      const mode = data.mode === "public" ? "public" : "random";
      const parentId = typeof data.parentId === "string" ? data.parentId : null;
      let recipientId = null;
      let status = "delivered";
      let scheduledAt = null;

      if (parentId) {
        const parent = await env.DB.prepare(
          "SELECT id, sender_id, recipient_id, mode FROM messages WHERE id = ?"
        ).bind(parentId).first();
        if (!parent) return json({ error: "Исходное послание не найдено." }, 404);
        if (parent.sender_id !== user.id && parent.recipient_id !== user.id) {
          return json({ error: "Ты не участник этой цепочки." }, 403);
        }
        recipientId = parent.sender_id === user.id ? parent.recipient_id : parent.sender_id;
        if (!recipientId || recipientId === user.id) return json({ error: "Нельзя ответить на это послание." }, 400);
      } else if (mode === "random") {
        const target = await env.DB.prepare(`
          SELECT u.id FROM users u
          WHERE u.id <> ?
            AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.blocker_id = u.id AND b.blocked_id = ?)
            AND NOT EXISTS (SELECT 1 FROM blocks b WHERE b.blocker_id = ? AND b.blocked_id = u.id)
          ORDER BY RANDOM() LIMIT 1
        `).bind(user.id, user.id, user.id).first();
        if (!target) return json({ error: "Пока нет других пользователей. Поделись приложением и попробуй снова." }, 409);
        recipientId = target.id;
      }

      if (mode === "random" && !parentId) {
        const delay = data.delay;
        if (delay === "hour") scheduledAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        else if (delay === "midnight") {
          const d = new Date();
          d.setHours(24, 0, 0, 0);
          scheduledAt = d.toISOString();
        } else if (typeof data.scheduledAt === "string") {
          const parsed = Date.parse(data.scheduledAt);
          if (!Number.isFinite(parsed) || parsed < Date.now() + 60_000 || parsed > Date.now() + 90 * 24 * 60 * 60 * 1000) {
            return json({ error: "Выбери время от 1 минуты до 90 дней вперёд." }, 400);
          }
          scheduledAt = new Date(parsed).toISOString();
        }
        if (scheduledAt) status = "scheduled";
      }

      // Basic rate limit: no more than 20 messages per user per hour.
      const recent = await env.DB.prepare(
        "SELECT COUNT(*) AS n FROM messages WHERE sender_id = ? AND created_at >= ?"
      ).bind(user.id, new Date(Date.now() - 60 * 60 * 1000).toISOString()).first();
      if (Number(recent?.n || 0) >= 20) return json({ error: "Слишком много сообщений за час. Попробуй позже." }, 429);

      const id = uuid();
      await env.DB.prepare(`
        INSERT INTO messages (id, sender_id, recipient_id, mode, body, status, scheduled_at, parent_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, user.id, recipientId, mode, text, status, scheduledAt, parentId, nowIso()).run();
      return json({ message: { id, mode, text, recipientId, status, scheduledAt, parentId } }, 201);
    }

    if (path.startsWith("messages/") && path.endsWith("/reactions") && method === "POST") {
      const messageId = path.split("/")[1];
      const data = await bodyJson(request);
      const reaction = ["heart", "ghost", "sparkle"].includes(data?.reaction) ? data.reaction : "heart";
      const exists = await env.DB.prepare("SELECT id FROM messages WHERE id = ? AND mode = 'public'").bind(messageId).first();
      if (!exists) return json({ error: "Публичное послание не найдено." }, 404);
      await env.DB.prepare("INSERT OR IGNORE INTO reactions (user_id, message_id, reaction) VALUES (?, ?, ?)")
        .bind(user.id, messageId, reaction).run();
      return json({ ok: true });
    }

    if (path.startsWith("messages/") && path.endsWith("/report") && method === "POST") {
      const messageId = path.split("/")[1];
      const data = await bodyJson(request);
      const reason = typeof data?.reason === "string" ? data.reason.trim().slice(0, 500) : "";
      if (reason.length < 3) return json({ error: "Укажи причину жалобы (минимум 3 символа)." }, 400);
      const exists = await env.DB.prepare("SELECT id FROM messages WHERE id = ?").bind(messageId).first();
      if (!exists) return json({ error: "Послание не найдено." }, 404);
      await env.DB.prepare("INSERT OR IGNORE INTO reports (id, reporter_id, message_id, reason) VALUES (?, ?, ?, ?)")
        .bind(uuid(), user.id, messageId, reason).run();
      return json({ ok: true });
    }

    if (path === "blocks" && method === "POST") {
      const data = await bodyJson(request);
      if (!data || typeof data.userId !== "string" || data.userId === user.id) return json({ error: "Неверный пользователь." }, 400);
      await env.DB.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)")
        .bind(user.id, data.userId).run();
      return json({ ok: true });
    }

    return json({ error: "Маршрут API не найден." }, 404);
  } catch (error) {
    console.error("Ghost Message API error:", error);
    return json({ error: "Внутренняя ошибка сервера." }, 500);
  }
}