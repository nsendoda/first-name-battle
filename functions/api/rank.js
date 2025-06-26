/**
 * GET /api/rank?name=姓 → {rank: number|null}
 */
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const target = `https://myoji-yurai.net/searchResult.htm?myojiKanji=${encodeURIComponent(
    name
  )}`;
  const resp = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  console.log(target);
  const html = await resp.text();
  console.log(html);
  const m = html.match(/全国順位[^<]*<\/th>\s*<td[^>]*>([\d,]+)位/);
  if (!m) {
    return new Response(JSON.stringify({ rank: null }), {
      headers: { "Content-Type": "application/json" },
    });
  }
  const rank = parseInt(m[1].replace(/,/g, ""), 10);
  return new Response(JSON.stringify({ rank }), {
    headers: { "Content-Type": "application/json" },
  });
};
