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
  const html = await resp.text();

  /* ---------- 全国順位 ---------- */
  const rankMatch = html.match(/全国順位[^0-9]*([\d,]+)位/);
  const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ""), 10) : null;

  /* ---------- 総人数（または世帯数） ---------- */
  const totalMatch =
    html.match(/人数[^0-9]*([\d,]+)人/) ||
    html.match(/世帯数[^0-9]*([\d,]+)世帯/);
  const total = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : null;

  /* ---------- 都道府県別人数（上位 6 県） ---------- */
  const prefs = [];
  const section = html.split("都道府県別人数")[1] || "";
  const re = /([\u4E00-\u9FFF]{2,5})[^\d]*([\d,]+)人/g;
  let m;
  while ((m = re.exec(section)) !== null) {
    prefs.push({ name: m[1], count: parseInt(m[2].replace(/,/g, ""), 10) });
    if (prefs.length >= 6) break;
  }

  return new Response(JSON.stringify({ rank, total, prefs }), {
    headers: { "Content-Type": "application/json" },
  });
};
