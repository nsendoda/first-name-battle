export const onRequestGet = async ({ request }) => {
  const url   = new URL(request.url);
  const name  = url.searchParams.get("name");
  if(!name){
    return new Response(JSON.stringify({error:"name required"}), {
      status:400, headers:{ "Content-Type":"application/json" }
    });
  }

  const target = `https://myoji-yurai.net/searchResult.htm?myojiKanji=${encodeURIComponent(name)}`;
  const resp   = await fetch(target, {headers:{ "User-Agent":"Mozilla/5.0" }});
  const html   = await resp.text();

  /* --- 全国順位 --- */
  const rank = (() => {
    const m = html.match(/全国順位[^0-9]*([\d,]+)位/);
    return m ? parseInt(m[1].replace(/,/g,""),10) : null;
  })();

  /* --- 総人数 or 世帯数 --- */
  const total = (() => {
    const m = html.match(/人数[^0-9]*([\d,]+)人/) ||
              html.match(/世帯数[^0-9]*([\d,]+)世帯/);
    return m ? parseInt(m[1].replace(/,/g,""),10) : null;
  })();

  /* --- 都道府県別人数 (上位6) --- */
  const prefs = [];
  const prefSec = html.split("都道府県別人数")[1] || "";
  const prefRe  = /([\u4E00-\u9FFF]{2,5})[^\d]*([\d,]+)人/g;
  let pm;
  while((pm = prefRe.exec(prefSec)) !== null){
    prefs.push({name:pm[1], count:parseInt(pm[2].replace(/,/g,""),10)});
    if(prefs.length >= 6) break;
  }

  /* --- 著名人 (上位2) --- */
  const famous = [];
  const famSec = html.split("著名人")[1] || "";
  const famRe  = /<a [^>]*?>([^<]{1,20})<\\/a>/g;
  let fm;
  while((fm = famRe.exec(famSec)) !== null){
    famous.push(fm[1].trim());
    if(famous.length >= 2) break;
  }

  return new Response(
    JSON.stringify({rank,total,prefs,famous}),
    {headers:{ "Content-Type":"application/json" }}
  );
};
