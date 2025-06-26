export const onRequestGet = async ({ request }) => {
  const url = new URL(request.url);
  const name = url.searchParams.get("name");
  if (!name) {
    return new Response(JSON.stringify({ error: "name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  /* --------------- 1. 取得 --------------- */
  const target = `https://myoji-yurai.net/searchResult.htm?myojiKanji=${encodeURIComponent(
    name
  )}`;
  const resp = await fetch(target, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  const html = await resp.text();

  /* --------------- 2. パース --------------- */
  // 全国順位
  const rankMatch = html.match(/全国順位[^0-9]*([\d,]+)位/);
  const rank = rankMatch ? parseInt(rankMatch[1].replace(/,/g, ""), 10) : null;

  // 人数（または世帯数）
  const totalMatch =
    html.match(/人数[^0-9]*([\d,]+)人/) ||
    html.match(/世帯数[^0-9]*([\d,]+)世帯/);
  const total = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ""), 10)
    : null;

  // 都道府県別人数（上位 6 県）
  const prefs = [];
  const prefSec = html.split("都道府県別人数")[1] || "";
  const prefRe = /([\u4E00-\u9FFF]{2,5})[^\d]*([\d,]+)人/g;
  let pm;
  while ((pm = prefRe.exec(prefSec)) !== null) {
    prefs.push({ name: pm[1], count: parseInt(pm[2].replace(/,/g, ""), 10) });
    if (prefs.length >= 6) break;
  }

  // 著名人（上位 2 人）
  const famous = [];
  const famRe = />\\s*([^<（(]+?)\\s*[（(]([^）)]+)[）)]/g; // 新：名前＋ジャンル
  let fm;
  while ((fm = famRe.exec(famSec)) !== null) {
    const person = fm[1].trim(); //   例「田中 将大」
    const genre = fm[2].trim(); //   例「スポーツ選手」
    if (person) famous.push(`${person}（${genre}）`); //   →「田中 将大（スポーツ選手）」形式で配列に
    if (famous.length >= 2) break;
  }

  /* --------------- 3. 返却 --------------- */
  return new Response(JSON.stringify({ rank, total, prefs, famous }), {
    headers: { "Content-Type": "application/json" },
  });
};
