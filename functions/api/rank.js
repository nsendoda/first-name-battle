/**
 * Cloudflare Pages Function
 * GET /api/rank?name=姓
 * 返却: { rank, total, prefs: [{name,count}], famous: ["田中 将大（スポーツ選手）", …] }
 */
export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  /* ------ validate ------ */
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  /* ------ fetch HTML ------ */
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

  /* ------ ① 全国順位 ------ */
  const rank = (() => {
    const m = html.match(/全国順位[^\d]*([\d,]+)位/); // “全国順位 … 位” どんな空白でも拾う
    return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
  })();

  /* ------ ② 総人数（または世帯数） ------ */
  const total = (() => {
    const m = html.match(/[人数世帯数][^\\d]*([\\d,]+)人/);
    return m ? parseInt(m[1].replace(/,/g, ""), 10) : null;
  })();

  /* ------ ③ 都道府県別人数 上位 6 ------ */
  const prefs = (() => {
    const list = [];
    const re = /([\u4E00-\u9FFF]{2,5})[^\\d]{0,15}?([\\d,]+)人/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const pref = m[1];
      const num = parseInt(m[2].replace(/,/g, ""), 10);
      if (num && !list.find((p) => p.name === pref))
        list.push({ name: pref, count: num });
      if (list.length >= 6) break;
    }
    return list;
  })();

  /* ------ ④ 著名人 上位 2 ------ */
  const famous = (() => {
    const list = [];
    const famSec = html.split("著名人")[1] || ""; // セクションをざっくり切り出し
    const famRe = />\s*([^<（(]+?)\s*[（(]([^）)]+)[）)]<\/a>/g;
    let fm;
    while ((fm = famRe.exec(famSec)) !== null) {
      const person = fm[1].trim();
      const genre = fm[2].trim();
      if (person && genre) list.push(`${person}（${genre}）`);
      if (list.length >= 2) break;
    }
    return list;
  })();

  /* ------ ⑤ 返却 ------ */
  return new Response(JSON.stringify({ rank, total, prefs, famous }), {
    headers: { "Content-Type": "application/json" },
  });
};
