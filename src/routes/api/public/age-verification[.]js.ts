import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
  "Content-Type": "application/javascript; charset=utf-8",
};

const DEFAULTS = {
  minAge: 18,
  title: "Welkom",
  description: "Bevestig je geboortedatum om door te gaan.",
  buttonText: "Bevestigen",
  declineText: "Ik ben jonger",
  declineRedirect: "https://www.google.com",
  rememberDays: 30,
  primaryColor: "#2c7be5",
  textColor: "#1f2937",
  backgroundColor: "#ffffff",
  overlayColor: "rgba(15, 23, 42, 0.75)",
  fontFamily: "Inter",
  backgroundImageUrl: "",
  borderRadius: 12,
};

function emptyScript(reason: string) {
  return new Response(`/* shoplabel age-verification: ${reason} */`, {
    status: 200,
    headers: CORS,
  });
}

export const Route = createFileRoute("/api/public/age-verification[.]js")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const shopId = url.searchParams.get("shop_id");
        if (!shopId || !/^[0-9a-f-]{36}$/i.test(shopId)) {
          return emptyScript("missing or invalid shop_id");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("shop_apps")
          .select("enabled, settings")
          .eq("shop_id", shopId)
          .eq("app_slug", "age-verification")
          .maybeSingle();

        if (error || !data || !data.enabled) {
          return emptyScript("app not installed or disabled");
        }

        const s = { ...DEFAULTS, ...((data.settings as Record<string, unknown>) ?? {}) };
        const payload = JSON.stringify(s);

        const js = `(function(){
  if (window.__shoplabelAV) return; window.__shoplabelAV = true;
  var s = ${payload};
  var COOKIE = "shoplabel_av_ok";
  function getCookie(n){var m=document.cookie.match(new RegExp("(^| )"+n+"=([^;]+)"));return m?m[2]:null;}
  function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+"="+v+";expires="+e.toUTCString()+";path=/;SameSite=Lax";}
  if (getCookie(COOKIE)==="1") return;

  var css = ".slbl-av-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;font-family:"+JSON.stringify(s.fontFamily)+",system-ui,sans-serif;background:"+JSON.stringify(s.overlayColor)+(s.backgroundImageUrl?(" url("+JSON.stringify(s.backgroundImageUrl)+") center/cover no-repeat"):"")+"}"
    +".slbl-av-md{width:100%;max-width:380px;background:"+s.backgroundColor+";color:"+s.textColor+";border-radius:"+s.borderRadius+"px;padding:24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}"
    +".slbl-av-badge{width:48px;height:48px;border-radius:9999px;background:"+s.primaryColor+";color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 12px}"
    +".slbl-av-h{font-size:18px;font-weight:600;margin:0 0 6px}"
    +".slbl-av-p{font-size:13px;opacity:.8;margin:0 0 16px}"
    +".slbl-av-row{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:8px;margin-bottom:14px}"
    +".slbl-av-row input{font:inherit;color:inherit;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:8px;text-align:center;width:100%;box-sizing:border-box}"
    +".slbl-av-btn{display:block;width:100%;border:0;cursor:pointer;background:"+s.primaryColor+";color:#fff;padding:10px 14px;border-radius:"+Math.max(4,s.borderRadius-4)+"px;font:inherit;font-weight:600}"
    +".slbl-av-no{margin-top:10px;background:none;border:0;color:inherit;opacity:.6;cursor:pointer;font:inherit;font-size:12px}"
    +".slbl-av-err{color:#b91c1c;font-size:12px;margin:-6px 0 10px;min-height:14px}"
    +"html.slbl-av-locked,body.slbl-av-locked{overflow:hidden!important}";
  var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  var ov=document.createElement("div");ov.className="slbl-av-ov";
  ov.innerHTML='<div class="slbl-av-md" role="dialog" aria-modal="true">'
    +'<div class="slbl-av-badge">'+s.minAge+'+</div>'
    +'<h2 class="slbl-av-h"></h2><p class="slbl-av-p"></p>'
    +'<div class="slbl-av-row"><input inputmode="numeric" maxlength="2" placeholder="DD" data-k="d"><input inputmode="numeric" maxlength="2" placeholder="MM" data-k="m"><input inputmode="numeric" maxlength="4" placeholder="JJJJ" data-k="y"></div>'
    +'<div class="slbl-av-err"></div>'
    +'<button class="slbl-av-btn"></button>'
    +'<button class="slbl-av-no"></button></div>';
  ov.querySelector(".slbl-av-h").textContent=s.title;
  ov.querySelector(".slbl-av-p").textContent=s.description;
  ov.querySelector(".slbl-av-btn").textContent=s.buttonText;
  ov.querySelector(".slbl-av-no").textContent=s.declineText;

  function lock(){document.documentElement.classList.add("slbl-av-locked");document.body&&document.body.classList.add("slbl-av-locked");}
  function unlock(){document.documentElement.classList.remove("slbl-av-locked");document.body&&document.body.classList.remove("slbl-av-locked");}
  function attach(){(document.body||document.documentElement).appendChild(ov);lock();}
  if(document.body)attach();else document.addEventListener("DOMContentLoaded",attach);

  var err=ov.querySelector(".slbl-av-err");
  var inputs=ov.querySelectorAll(".slbl-av-row input");
  inputs.forEach(function(i,idx){i.addEventListener("input",function(){i.value=i.value.replace(/[^0-9]/g,"");if(i.value.length>=i.maxLength&&inputs[idx+1])inputs[idx+1].focus();});});

  ov.querySelector(".slbl-av-btn").addEventListener("click",function(){
    var d=+ov.querySelector('[data-k="d"]').value,m=+ov.querySelector('[data-k="m"]').value,y=+ov.querySelector('[data-k="y"]').value;
    if(!d||!m||!y||y<1900){err.textContent="Vul een geldige geboortedatum in.";return;}
    var bd=new Date(y,m-1,d);if(bd.getDate()!==d||bd.getMonth()!==m-1){err.textContent="Vul een geldige geboortedatum in.";return;}
    var today=new Date();var age=today.getFullYear()-y;var mm=today.getMonth()-(m-1);if(mm<0||(mm===0&&today.getDate()<d))age--;
    if(age>=s.minAge){setCookie(COOKIE,"1",s.rememberDays||30);unlock();ov.remove();}
    else{window.location.replace(s.declineRedirect||"about:blank");}
  });
  ov.querySelector(".slbl-av-no").addEventListener("click",function(){window.location.replace(s.declineRedirect||"about:blank");});
})();`;

        return new Response(js, { status: 200, headers: CORS });
      },
    },
  },
});