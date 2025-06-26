/**
 * GET /api/rank?name=苗字
 * 返却: { rank, total, prefs:[{name,count}], famous:[ "山田 太郎（俳優）", … ] }
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

  /* ------ ③ 都道府県別人数 (上位 6) ------ */
  const prefectureSuffix = /[都道府県]$/; // 47 都道府県は必ず末尾がこれ
  const prefs = [];
  const prefRe = />([\u4E00-\u9FFF]{2,8})<\/a>[^0-9]*([0-9,]+)人/g; // <a>東京</a> 300人
  let pm;
  while ((pm = prefRe.exec(html)) !== null) {
    const name = pm[1];
    const num = parseInt(pm[2].replace(/,/g, ""), 10);
    if (prefectureSuffix.test(name) && num) {
      prefs.push({ name, count: num });
      if (prefs.length >= 6) break;
    }
  }

  /* ------ ④ 著名人 (上位 2) ------ */
  const famous = [];
  const famSec = html.split("著名人")[1] || "";
  // 著名人 <li><a>田中 将大</a>（プロ野球選手） のような行を拾う
  const famRe = /<li>\s*<a[^>]*>([^<(（]+)<\/a>\s*[（(]([^）)]+)[）)]/g;
  let fm;
  while ((fm = famRe.exec(famSec)) !== null) {
    famous.push(`${fm[1].trim()}（${fm[2].trim()}）`);
    if (famous.length >= 2) break;
  }
};
