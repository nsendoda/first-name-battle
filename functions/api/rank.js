/**
 * GET /api/rank?name=苗字
 * 返却: { rank, total, prefs:[{name,count}], famous:[ "田中 将大（プロ野球選手）", … ] }
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

  /* ---------- HTML 取得 ---------- */
  const target = `https://myoji-yurai.net/searchResult.htm?myojiKanji=${encodeURIComponent(
    name
  )}`;
  const resp = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: `upstream ${resp.status}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
  const html = await resp.text();

  /* ---------- 全国順位 ---------- */
  const rankMatch = html.match(/全国順位[^0-9]*([0-9,]+)位/);
  const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ""), 10) : null;

  /* ---------- 人数 or 世帯数 ---------- */
  const totalMatch = html.match(/(?:人数|世帯数)[^0-9]*([0-9,]+)人/);
  const total = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : null;

  /* ---------- 都道府県別人数（上位 6） ---------- */
  const prefs = [];
  const prefRe = />([\u4E00-\u9FFF]{2,8})<\/a>[^0-9]*([0-9,]+)人/g; // <a>東京都</a> 300,000人
  const suffix = /[都道府県]$/;
  let pm;
  while ((pm = prefRe.exec(html)) !== null) {
    const prefName = pm[1];
    const num = parseInt(pm[2].replace(/,/g, ""), 10);
    if (suffix.test(prefName) && num) {
      prefs.push({ name: prefName, count: num });
      if (prefs.length >= 6) break;
    }
  }

  /* ---------- 著名人（上位 2） ---------- */
  const famous = [];
  const famSec = html.split("著名人")[1] || "";
  const famRe = /<li>\s*<a[^>]*>([^<(（]+)<\/a>\s*[（(]([^）)]+)[）)]/g;
  let fm;
  while ((fm = famRe.exec(famSec)) !== null) {
    const person = fm[1].trim(); // 田中 将大
    const genre = fm[2].trim(); // プロ野球選手
    if (person && genre) famous.push(`${person}（${genre}）`);
    if (famous.length >= 2) break;
  }

  /* ---------- JSON 返却 ---------- */
  return new Response(JSON.stringify({ rank, total, prefs, famous }), {
    headers: { "Content-Type": "application/json" },
  });
};
