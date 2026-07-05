// Server-only: bouwt JS-bodies voor shoplabel widgets.
// Niet importeren in client code.

const AV_DEFAULTS = {
  minAge: 18,
  title: "Welkom",
  description: "Bevestig je geboortedatum om door te gaan.",
  buttonText: "Bevestigen",
  declineText: "Ik ben jonger",
  declineRedirect: "https://www.google.com",
  rememberDays: 30,
  primaryColor: "#5187e0",
  textColor: "#1f2937",
  backgroundColor: "#ffffff",
  overlayColor: "#0f172a",
  overlayOpacity: 0.75,
  fontFamily: "Inter",
  backgroundImageUrl: "",
  borderRadius: 12,
  blockUnderage: true,
  blockDays: 365,
};

function hexToRgba(hex: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, Number.isFinite(alpha) ? alpha : 1));
  if (!hex) return `rgba(0,0,0,${a})`;
  if (hex.startsWith("rgb")) return hex;
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return `rgba(0,0,0,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function buildAgeVerificationScript(rawSettings: Record<string, unknown>): string {
  const s = { ...AV_DEFAULTS, ...rawSettings } as typeof AV_DEFAULTS;
  const overlayRgba = hexToRgba(String(s.overlayColor), Number(s.overlayOpacity));
  const payload = JSON.stringify({ ...s, _overlayRgba: overlayRgba });

  return `(function(){
  if (window.__shoplabelAV) return; window.__shoplabelAV = true;
  var s = ${payload};
  var COOKIE = "shoplabel_av_ok";
  var BLOCK = "shoplabel_av_blocked";
  function getCookie(n){var m=document.cookie.match(new RegExp("(^| )"+n+"=([^;]+)"));return m?m[2]:null;}
  function setCookie(n,v,d){var e=new Date();e.setTime(e.getTime()+d*864e5);document.cookie=n+"="+v+";expires="+e.toUTCString()+";path=/;SameSite=Lax";}
  if (getCookie(COOKIE)==="1") return;
  if (s.blockUnderage && getCookie(BLOCK)==="1"){window.location.replace(s.declineRedirect||"about:blank");return;}

  var ovBg = s.backgroundImageUrl
    ? ("linear-gradient("+s._overlayRgba+","+s._overlayRgba+"), url("+JSON.stringify(s.backgroundImageUrl)+") center/cover no-repeat")
    : s._overlayRgba;
  var css = ".slbl-av-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;font-family:"+JSON.stringify(s.fontFamily)+",system-ui,sans-serif;background:"+ovBg+"}"
    +".slbl-av-md{width:100%;max-width:380px;background:"+s.backgroundColor+";color:"+s.textColor+";border-radius:"+s.borderRadius+"px;padding:24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.35)}"
    +".slbl-av-badge{width:48px;height:48px;border-radius:9999px;background:"+s.primaryColor+";color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;margin:0 auto 12px}"
    +".slbl-av-h{font-size:18px;font-weight:600;margin:0 0 6px}"
    +".slbl-av-p{font-size:13px;opacity:.8;margin:0 0 16px}"
    +".slbl-av-inp{font:inherit;color:inherit;background:rgba(0,0,0,.03);border:1px solid rgba(0,0,0,.15);border-radius:6px;padding:8px;text-align:center;width:100%;max-width:220px;box-sizing:border-box;margin-bottom:14px}"
    +".slbl-av-btn{display:block;width:100%;border:0;cursor:pointer;background:"+s.primaryColor+";color:#fff;padding:10px 14px;border-radius:"+Math.max(4,s.borderRadius-4)+"px;font:inherit;font-weight:600}"
    +".slbl-av-no{margin-top:10px;background:none;border:0;color:inherit;opacity:.6;cursor:pointer;font:inherit;font-size:12px}"
    +".slbl-av-err{color:#b91c1c;font-size:12px;margin:-6px 0 10px;min-height:14px}"
    +"html.slbl-av-locked,body.slbl-av-locked{overflow:hidden!important}";
  var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

  var ov=document.createElement("div");ov.className="slbl-av-ov";
  ov.innerHTML='<div class="slbl-av-md" role="dialog" aria-modal="true">'
    +'<div class="slbl-av-badge">'+s.minAge+'+</div>'
    +'<h2 class="slbl-av-h"></h2><p class="slbl-av-p"></p>'
    +'<input type="date" autocomplete="bday" class="slbl-av-inp">'
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
  var dateInp=ov.querySelector(".slbl-av-inp");

  ov.querySelector(".slbl-av-btn").addEventListener("click",function(){
    var val=dateInp.value;
    if(!val){err.textContent="Vul een geldige geboortedatum in.";return;}
    var parts=val.split("-");
    var y=+parts[0],m=+parts[1],d=+parts[2];
    if(!d||!m||!y||y<1900){err.textContent="Vul een geldige geboortedatum in.";return;}
    var bd=new Date(y,m-1,d);if(bd.getDate()!==d||bd.getMonth()!==m-1){err.textContent="Vul een geldige geboortedatum in.";return;}
    var today=new Date();var age=today.getFullYear()-y;var mm=today.getMonth()-(m-1);if(mm<0||(mm===0&&today.getDate()<d))age--;
    if(age>=s.minAge){setCookie(COOKIE,"1",s.rememberDays||30);unlock();ov.remove();}
    else{if(s.blockUnderage){setCookie(BLOCK,"1",s.blockDays||365);}window.location.replace(s.declineRedirect||"about:blank");}
  });
  ov.querySelector(".slbl-av-no").addEventListener("click",function(){if(s.blockUnderage){setCookie(BLOCK,"1",s.blockDays||365);}window.location.replace(s.declineRedirect||"about:blank");});
})();`;
}

const BIS_DEFAULTS = {
  buttonText: "Meld me wanneer beschikbaar",
  buttonColor: "#111827",
  newsletterOptIn: true,
};

export function buildBackInStockScript(rawSettings: Record<string, unknown>, shopId: string, origin: string): string {
  const s = { ...BIS_DEFAULTS, ...rawSettings } as typeof BIS_DEFAULTS;
  const payload = JSON.stringify({
    ...s,
    shopId,
    endpoint: `${origin}/api/public/back-in-stock/signup`,
    stockEndpoint: `${origin}/api/public/back-in-stock/stock`,
  });
  return `(function(){
  if (window.__shoplabelBIS) return; window.__shoplabelBIS = true;
  var s = ${payload};
  function ready(fn){if(document.readyState!=="loading")fn();else document.addEventListener("DOMContentLoaded",fn);}
  function getProductId(){
    var f=document.getElementById("product_configure_form");
    if(f){
      var inp=f.querySelector('input[name="product"]');
      if(inp && /^[0-9]+$/.test(inp.value))return inp.value;
      var sel=f.querySelector('select[name="variant"], select[name^="variant["]');
      var n=sel && sel.getAttribute("name") ? sel.getAttribute("name").match(new RegExp("variant\\\\[([0-9]+)\\\\]")) : null;
      if(n)return n[1];
      var wish=f.querySelector('a[href*="/wishlistAdd/"]');
      var wm=wish && wish.getAttribute("href") ? wish.getAttribute("href").match(new RegExp("/wishlistAdd/([0-9]+)/")) : null;
      if(wm)return wm[1];
    }
    var el=document.querySelector("[data-product-id],[data-pid]");
    var val=el && (el.getAttribute("data-product-id")||el.getAttribute("data-pid"));
    if(val && /^[0-9]+$/.test(val))return val;
    var json=document.querySelector('[data-json*="format=json"]');
    if(json){
      try{return fetch(json.getAttribute("data-json"),{credentials:"omit"}).then(function(r){return r.json();}).then(function(d){return d&&d.product&&d.product.id?String(d.product.id):null;}).catch(function(){return null;});}
      catch(e){}
    }
    try{return fetch(location.origin+location.pathname+"?format=json",{credentials:"omit"}).then(function(r){return r.json();}).then(function(d){return d&&d.product&&d.product.id?String(d.product.id):null;}).catch(function(){return null;});}
    catch(e){}
    return null;
  }
  function getVariantId(){
    var f=document.getElementById("product_configure_form");
    if(!f)return null;
    var action=f.getAttribute("action")||"";
    var m=action.match(new RegExp("/cart/add/([0-9]+)/?"));
    if(m)return m[1];
    var sel=f.querySelector('select[name="variant"], select[name^="variant["]');
    if(sel && /^[0-9]+$/.test(sel.value||""))return sel.value;
    return null;
  }
  function getLang(){
    var l=(document.documentElement.lang||"nl").toLowerCase();
    return l.slice(0,2);
  }
  function findAnchor(){
    // 1) Expliciete hook
    var hook=document.querySelector("[data-shoplabel-bis]");
    if(hook)return {el:hook,after:false};
    // 2) Lightspeed standaard productformulier
    var form=document.getElementById("product_configure_form");
    if(form)return {el:form,after:true};
    return null;
  }
  function productInfo(){
    var h1=document.querySelector("h1");
    var img=document.querySelector('meta[property="og:image"]');
    var path=location.pathname.replace(/\\/+$/,"").split("/").pop()||location.pathname;
    return {
      product_handle: path,
      product_title: h1?h1.textContent.trim():path,
      product_image_url: img?img.getAttribute("content"):undefined
    };
  }
  function inject(anchor){
    if(document.querySelector(".slbl-bis-wrap"))return;
    var css=".slbl-bis-btn{display:block;width:100%;border:0;cursor:pointer;background:"+s.buttonColor+";color:#fff;padding:10px 14px;border-radius:6px;font:inherit;font-weight:600;margin-top:10px}"
      +".slbl-bis-form{display:flex;gap:14px;flex-direction:column;font-family:system-ui,sans-serif}"
      +".slbl-bis-inp{font:inherit;font-size:15px;padding:14px 16px;border:2px solid "+s.buttonColor+";border-radius:12px;outline:none;color:#1e2a4a;background:#fff;width:100%;box-sizing:border-box}"
      +".slbl-bis-inp::placeholder{color:#9ca3af}"
      +".slbl-bis-msg{font-size:13px;margin-top:8px;text-align:center}"
      +".slbl-bis-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);font-family:system-ui,sans-serif}"
      +".slbl-bis-md{width:100%;max-width:460px;background:#fff;color:#1e2a4a;border-radius:14px;padding:40px 40px 28px;box-shadow:0 25px 70px rgba(0,0,0,.35);position:relative;text-align:center}"
      +".slbl-bis-md h3{margin:0 0 14px;font-size:30px;font-weight:700;color:#1e2a4a;line-height:1.15}"
      +".slbl-bis-md p{margin:0 0 26px;font-size:15px;color:#6b7280;line-height:1.5}"
      +".slbl-bis-x{position:absolute;top:14px;right:18px;background:none;border:0;font-size:28px;line-height:1;cursor:pointer;color:#9ca3af;padding:4px}"
      +".slbl-bis-x:hover{color:#4b5563}"
      +".slbl-bis-submit{background:"+s.buttonColor+"!important;border-radius:12px!important;padding:14px 16px!important;font-size:15px!important;margin-top:0!important}"
      +".slbl-bis-news{font-size:12px;color:#6b7280;display:flex;gap:6px;align-items:center;justify-content:center;margin-top:-4px}"
      +".slbl-bis-foot{margin-top:22px;font-size:11px;letter-spacing:.12em;color:#9ca3af;text-transform:uppercase;text-align:center}"
      +".slbl-bis-foot strong{color:#1e2a4a;font-weight:700;letter-spacing:0;text-transform:none;font-size:14px;margin-left:6px}"
      +"html.slbl-bis-locked,body.slbl-bis-locked{overflow:hidden!important}";
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var wrap=document.createElement("div");wrap.className="slbl-bis-wrap";
    var btn=document.createElement("button");btn.type="button";btn.className="slbl-bis-btn";btn.textContent=s.buttonText;
    wrap.appendChild(btn);
    if(anchor.after){anchor.el.parentNode.insertBefore(wrap,anchor.el.nextSibling);}
    else{anchor.el.appendChild(wrap);}
    btn.addEventListener("click",function(){
      var ov=document.createElement("div");ov.className="slbl-bis-ov";
      var md=document.createElement("div");md.className="slbl-bis-md";md.setAttribute("role","dialog");md.setAttribute("aria-modal","true");
      md.innerHTML='<button type="button" class="slbl-bis-x" aria-label="Sluiten">&times;</button>'
        +'<h3>Tijdelijk uitverkocht!</h3>'
        +'<p>We sturen je een mail als we dit artikel weer op voorraad hebben</p>'
        +'<div class="slbl-bis-form">'
        +'<input type="email" class="slbl-bis-inp" placeholder="bijv: mail@voorbeeld.nl" required>'
        +'<button type="button" class="slbl-bis-btn slbl-bis-submit">Geef me een seintje</button>'
        + (s.newsletterOptIn?'<label class="slbl-bis-news"><input type="checkbox" class="slbl-bis-news-cb" checked> Stuur me ook updates en aanbiedingen.</label>':'')
        +'<div class="slbl-bis-msg"></div>'
        +'</div>'
        +'<div class="slbl-bis-foot">Built with <strong>shoplabel</strong></div>';
      ov.appendChild(md);
      (document.body||document.documentElement).appendChild(ov);
      document.documentElement.classList.add("slbl-bis-locked");document.body&&document.body.classList.add("slbl-bis-locked");
      function close(){document.documentElement.classList.remove("slbl-bis-locked");document.body&&document.body.classList.remove("slbl-bis-locked");ov.remove();}
      md.querySelector(".slbl-bis-x").addEventListener("click",close);
      ov.addEventListener("click",function(e){if(e.target===ov)close();});
      var form=md.querySelector(".slbl-bis-form");
      var inp=form.querySelector(".slbl-bis-inp");
      var news=form.querySelector(".slbl-bis-news-cb");
      var msg=form.querySelector(".slbl-bis-msg");
      form.querySelector(".slbl-bis-submit").addEventListener("click",function(){
        var email=(inp.value||"").trim();
        if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email)){msg.style.color="#b91c1c";msg.textContent="Vul een geldig e-mailadres in.";return;}
        var info=productInfo();
        msg.style.color="#6b7280";msg.textContent="Bezig met aanmelden…";
        fetch(s.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          shop_id:s.shopId,product_handle:info.product_handle,product_title:info.product_title,product_image_url:info.product_image_url,
          email:email,newsletter_opt_in:news?news.checked:false
        })}).then(function(r){
          if(r.ok){msg.style.color="#047857";msg.textContent="Top! Je ontvangt een mail zodra dit product weer op voorraad is.";form.querySelector(".slbl-bis-submit").style.display="none";inp.disabled=true;}
          else{msg.style.color="#b91c1c";msg.textContent="Aanmelden mislukt. Probeer het later opnieuw.";}
        }).catch(function(){msg.style.color="#b91c1c";msg.textContent="Aanmelden mislukt. Probeer het later opnieuw.";});
      });
    });
  }
  function domFallbackSoldOut(){
    var form=document.getElementById("product_configure_form");
    if(form){
      var submit=form.querySelector('button[type="submit"], input[type="submit"]');
      if(submit && (submit.disabled || /uitverkocht|sold\\s*out|niet\\s*leverbaar|out\\s*of\\s*stock/i.test(submit.textContent||submit.value||"")))return true;
      if(/uitverkocht|sold\\s*out|niet\\s*leverbaar|out\\s*of\\s*stock/i.test(form.textContent||""))return true;
    }
    return false;
  }
  ready(function(){
    var anchor=findAnchor();if(!anchor)return;
    // Expliciete hook: altijd tonen (gebruiker bepaalt zelf)
    if(anchor.el.hasAttribute && anchor.el.hasAttribute("data-shoplabel-bis")){inject(anchor);return;}
    // Lightspeed API check (snel & betrouwbaar)
    Promise.resolve(getProductId()).then(function(pid){
      if(pid){
      var vid=getVariantId();
      var u=s.stockEndpoint+"?shop_id="+encodeURIComponent(s.shopId)+"&product_id="+encodeURIComponent(pid)+"&lang="+encodeURIComponent(getLang())+(vid?"&variant_id="+encodeURIComponent(vid):"");
      fetch(u).then(function(r){return r.json();}).then(function(d){
        if(d && d.inStock===false){inject(anchor);}
        else if(d && d.inStock===null && domFallbackSoldOut()){inject(anchor);}
      }).catch(function(){if(domFallbackSoldOut())inject(anchor);});
      return;
      }
      // Geen product-id: vertrouw op DOM
      if(domFallbackSoldOut())inject(anchor);
    });
  });
})();`;
}
const PA_DEFAULTS = {
  buttonText: "Stel een prijswaarschuwing in",
  buttonColor: "#111827",
  newsletterOptIn: true,
  currencySymbol: "\u20ac",
};

export function buildPriceAlertScript(rawSettings: Record<string, unknown>, shopId: string, origin: string): string {
  const s = { ...PA_DEFAULTS, ...rawSettings } as typeof PA_DEFAULTS;
  const payload = JSON.stringify({
    ...s,
    shopId,
    endpoint: `${origin}/api/public/price-alert/signup`,
  });
  return `(function(){
  if (window.__shoplabelPA) return; window.__shoplabelPA = true;
  var s = ${payload};
  function ready(fn){if(document.readyState!=="loading")fn();else document.addEventListener("DOMContentLoaded",fn);}
  function findAnchor(){
    var hook=document.querySelector("[data-shoplabel-pricealert]");
    if(hook)return {el:hook,after:false};
    var form=document.getElementById("product_configure_form");
    if(form)return {el:form,after:true};
    return null;
  }
  function parsePrice(t){
    if(!t)return null;
    var m=String(t).replace(/[^0-9,\\.]/g,"").replace(/\\.(?=\\d{3}(?:[,\\.]|$))/g,"").replace(",",".");
    var n=parseFloat(m);
    return isFinite(n)?n:null;
  }
  function getCurrentPrice(){
    var meta=document.querySelector('meta[property="product:price:amount"], meta[itemprop="price"]');
    if(meta){var v=parsePrice(meta.getAttribute("content"));if(v)return v;}
    var el=document.querySelector('[itemprop="price"], .product-price, .price, [data-price]');
    if(el){var v=parsePrice(el.getAttribute("content")||el.getAttribute("data-price")||el.textContent);if(v)return v;}
    return null;
  }
  function productInfo(){
    var h1=document.querySelector("h1");
    var img=document.querySelector('meta[property="og:image"]');
    var path=location.pathname.replace(/\\/+$/,"").split("/").pop()||location.pathname;
    return {
      product_handle: path,
      product_title: h1?h1.textContent.trim():path,
      product_image_url: img?img.getAttribute("content"):undefined
    };
  }
  function inject(anchor){
    if(document.querySelector(".slbl-pa-wrap"))return;
    var css=".slbl-pa-btn{display:block;width:100%;border:0;cursor:pointer;background:"+s.buttonColor+";color:#fff;padding:10px 14px;border-radius:6px;font:inherit;font-weight:600;margin-top:10px}"
      +".slbl-pa-row{display:flex;gap:10px;align-items:stretch;font-family:system-ui,sans-serif;margin-bottom:14px}"
      +".slbl-pa-inp{font:inherit;font-size:15px;padding:14px 16px;border:2px solid "+s.buttonColor+";border-radius:12px;outline:none;color:#1e2a4a;background:#fff;flex:1;min-width:0;box-sizing:border-box}"
      +".slbl-pa-inp::placeholder{color:#9ca3af}"
      +".slbl-pa-sym{display:flex;align-items:center;padding:0 16px;border:2px solid "+s.buttonColor+";border-radius:12px;background:#f8fafc;font-weight:700;color:#1e2a4a;font-size:16px}"
      +".slbl-pa-msg{font-size:13px;margin-top:8px;text-align:center}"
      +".slbl-pa-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.55);font-family:system-ui,sans-serif}"
      +".slbl-pa-md{width:100%;max-width:460px;background:#fff;color:#1e2a4a;border-radius:14px;padding:40px 40px 28px;box-shadow:0 25px 70px rgba(0,0,0,.35);position:relative;text-align:center}"
      +".slbl-pa-md h3{margin:0 0 14px;font-size:28px;font-weight:700;color:#1e2a4a;line-height:1.15}"
      +".slbl-pa-md p{margin:0 0 26px;font-size:15px;color:#6b7280;line-height:1.5}"
      +".slbl-pa-x{position:absolute;top:14px;right:18px;background:none;border:0;font-size:28px;line-height:1;cursor:pointer;color:#9ca3af;padding:4px}"
      +".slbl-pa-x:hover{color:#4b5563}"
      +".slbl-pa-submit{background:"+s.buttonColor+"!important;border-radius:12px!important;padding:14px 16px!important;font-size:15px!important;margin-top:0!important}"
      +".slbl-pa-news{font-size:12px;color:#6b7280;display:flex;gap:6px;align-items:center;justify-content:center;margin:10px 0 0}"
      +".slbl-pa-foot{margin-top:22px;font-size:11px;letter-spacing:.12em;color:#9ca3af;text-transform:uppercase;text-align:center}"
      +".slbl-pa-foot strong{color:#1e2a4a;font-weight:700;letter-spacing:0;text-transform:none;font-size:14px;margin-left:6px}"
      +"html.slbl-pa-locked,body.slbl-pa-locked{overflow:hidden!important}";
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var wrap=document.createElement("div");wrap.className="slbl-pa-wrap";
    var btn=document.createElement("button");btn.type="button";btn.className="slbl-pa-btn";btn.textContent=s.buttonText;
    wrap.appendChild(btn);
    if(anchor.after){anchor.el.parentNode.insertBefore(wrap,anchor.el.nextSibling);}
    else{anchor.el.appendChild(wrap);}
    btn.addEventListener("click",function(){
      var current=getCurrentPrice();
      var ov=document.createElement("div");ov.className="slbl-pa-ov";
      var md=document.createElement("div");md.className="slbl-pa-md";md.setAttribute("role","dialog");md.setAttribute("aria-modal","true");
      md.innerHTML='<button type="button" class="slbl-pa-x" aria-label="Sluiten">&times;</button>'
        +'<h3>Wacht op de juiste prijs!</h3>'
        +'<p>We sturen je een mail zodra dit product jouw streefprijs bereikt.</p>'
        +'<div class="slbl-pa-row">'
        +'<input type="email" class="slbl-pa-inp slbl-pa-email" placeholder="bijv: mail@voorbeeld.nl" required>'
        +'</div>'
        +'<div class="slbl-pa-row">'
        +'<span class="slbl-pa-sym">'+s.currencySymbol+'</span>'
        +'<input type="text" inputmode="decimal" class="slbl-pa-inp slbl-pa-target" placeholder="Jouw streefprijs"'+(current?(' value="'+current.toFixed(2).replace(".",",")+'"'):"")+'>'
        +'</div>'
        +'<button type="button" class="slbl-pa-btn slbl-pa-submit">Stel prijswaarschuwing in</button>'
        + (s.newsletterOptIn?'<label class="slbl-pa-news"><input type="checkbox" class="slbl-pa-news-cb" checked> Stuur me ook updates en aanbiedingen.</label>':'')
        +'<div class="slbl-pa-msg"></div>'
        +'<div class="slbl-pa-foot">Built with <strong>shoplabel</strong></div>';
      ov.appendChild(md);
      (document.body||document.documentElement).appendChild(ov);
      document.documentElement.classList.add("slbl-pa-locked");document.body&&document.body.classList.add("slbl-pa-locked");
      function close(){document.documentElement.classList.remove("slbl-pa-locked");document.body&&document.body.classList.remove("slbl-pa-locked");ov.remove();}
      md.querySelector(".slbl-pa-x").addEventListener("click",close);
      ov.addEventListener("click",function(e){if(e.target===ov)close();});
      var email=md.querySelector(".slbl-pa-email");
      var target=md.querySelector(".slbl-pa-target");
      var news=md.querySelector(".slbl-pa-news-cb");
      var msg=md.querySelector(".slbl-pa-msg");
      md.querySelector(".slbl-pa-submit").addEventListener("click",function(){
        var em=(email.value||"").trim();
        if(!/^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(em)){msg.style.color="#b91c1c";msg.textContent="Vul een geldig e-mailadres in.";return;}
        var tp=parsePrice(target.value);
        if(!tp||tp<=0){msg.style.color="#b91c1c";msg.textContent="Vul een geldige streefprijs in.";return;}
        var info=productInfo();
        msg.style.color="#6b7280";msg.textContent="Bezig met aanmelden\u2026";
        fetch(s.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
          shop_id:s.shopId,product_handle:info.product_handle,product_title:info.product_title,product_image_url:info.product_image_url,
          email:em,target_price:tp,current_price:current||undefined,newsletter_opt_in:news?news.checked:false
        })}).then(function(r){
          if(r.ok){msg.style.color="#047857";msg.textContent="Top! Je ontvangt een mail zodra de prijs jouw streefprijs bereikt.";md.querySelector(".slbl-pa-submit").style.display="none";email.disabled=true;target.disabled=true;}
          else{msg.style.color="#b91c1c";msg.textContent="Aanmelden mislukt. Probeer het later opnieuw.";}
        }).catch(function(){msg.style.color="#b91c1c";msg.textContent="Aanmelden mislukt. Probeer het later opnieuw.";});
      });
    });
  }
  ready(function(){
    var anchor=findAnchor();if(!anchor)return;
    inject(anchor);
  });
})();`;
}

const TC_DEFAULTS = {
  buttonText: "Bereken hoeveel je nodig hebt",
  buttonColor: "#111827",
  calcMode: "package",
  productName: "Tegels",
  packageName: "dozen",
  unitName: "stuks",
  coveragePerPackage: 1.44,
  unitWidthCm: 60,
  unitHeightCm: 60,
  rollWidthCm: 400,
  rollLengthM: 0,
  coverageM2PerLiter: 10,
  packageSizeLiters: 2.5,
  coats: 1,
  marginPct: 10,
  pricePerM2: 0,
  currencySymbol: "\u20ac",
  heading: "Hoeveel heb je nodig?",
  intro: "Vul de afmetingen van je ruimte in. We berekenen direct hoeveel je nodig hebt, inclusief marge voor snijverlies.",
};

export function buildTileCalculatorScript(rawSettings: Record<string, unknown>): string {
  const s = { ...TC_DEFAULTS, ...rawSettings } as typeof TC_DEFAULTS;
  const payload = JSON.stringify(s);
  return `(function(){
  if (window.__shoplabelTC) return; window.__shoplabelTC = true;
  var s = ${payload};
  function ready(fn){if(document.readyState!=="loading")fn();else document.addEventListener("DOMContentLoaded",fn);}
  function findAnchor(){
    var hook=document.querySelector("[data-shoplabel-tilecalc]");
    if(hook)return {el:hook,after:false};
    var form=document.getElementById("product_configure_form");
    if(form)return {el:form,after:true};
    return null;
  }
  function fmt(n){return (Math.round(n*100)/100).toFixed(2).replace(".",",");}
  function fmtInt(n){return String(Math.ceil(n));}
  function parseNum(v){if(!v)return NaN;var n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:NaN;}

  function calc(lengthM, widthM, marginPct){
    var area = lengthM * widthM;
    var withMargin = area * (1 + (marginPct/100));
    var result = {area:area, withMargin:withMargin};

    if (s.calcMode === 'package') {
      var coverage = s.coveragePerPackage || 1;
      result.packages = coverage > 0 ? Math.ceil(withMargin / coverage) : 0;
      if (s.unitWidthCm && s.unitHeightCm) {
        var unitArea = (s.unitWidthCm/100) * (s.unitHeightCm/100);
        result.pieces = unitArea > 0 ? Math.ceil(withMargin / unitArea) : 0;
      }
    } else if (s.calcMode === 'roll') {
      var rollW = (s.rollWidthCm || 400) / 100;
      var rollL = s.rollLengthM || 0;
      if (rollL > 0) {
        var rollArea = rollW * rollL;
        result.rolls = rollArea > 0 ? Math.ceil(withMargin / rollArea) : 0;
      } else {
        result.rolls = Math.ceil(withMargin / rollW);
      }
      result.rollWidth = rollW;
    } else if (s.calcMode === 'paint') {
      var coverage = s.coverageM2PerLiter || 10;
      var coats = s.coats || 1;
      var liters = coverage > 0 ? Math.ceil((withMargin * coats) / coverage) : 0;
      var pkgSize = s.packageSizeLiters || 1;
      result.liters = liters;
      result.packages = pkgSize > 0 ? Math.ceil(liters / pkgSize) : 0;
    }

    if (s.pricePerM2 > 0) {
      result.price = withMargin * s.pricePerM2;
    }
    return result;
  }

  function infoLabel(){
    if (s.calcMode === 'package') {
      return s.coveragePerPackage + ' m\u00b2 per ' + s.packageName;
    } else if (s.calcMode === 'roll') {
      return s.rollWidthCm + ' cm breed' + (s.rollLengthM > 0 ? ', ' + s.rollLengthM + ' m per rol' : '');
    } else if (s.calcMode === 'paint') {
      return s.coverageM2PerLiter + ' m\u00b2/L, ' + s.coats + ' laag' + (s.coats > 1 ? 'en' : '');
    }
    return '';
  }

  function inject(anchor){
    if(document.querySelector(".slbl-tc-wrap"))return;
    var css=".slbl-tc-btn{display:block;width:100%;border:0;cursor:pointer;background:"+s.buttonColor+";color:#fff;padding:10px 14px;border-radius:6px;font:inherit;font-weight:600;margin-top:10px}"
      +".slbl-tc-ov{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,.7);font-family:system-ui,sans-serif}"
      +".slbl-tc-md{width:100%;max-width:440px;background:#fff;color:#1f2937;border-radius:12px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35);position:relative}"
      +".slbl-tc-md h3{margin:0 0 6px;font-size:18px;font-weight:600}"
      +".slbl-tc-md p{margin:0 0 14px;font-size:13px;opacity:.8}"
      +".slbl-tc-x{position:absolute;top:8px;right:10px;background:none;border:0;font-size:22px;line-height:1;cursor:pointer;color:#6b7280}"
      +".slbl-tc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}"
      +".slbl-tc-field{display:flex;flex-direction:column;gap:4px}"
      +".slbl-tc-field label{font-size:12px;color:#6b7280;font-weight:500}"
      +".slbl-tc-inp{font:inherit;padding:8px;border:1px solid #d1d5db;border-radius:6px;width:100%;box-sizing:border-box}"
      +".slbl-tc-res{margin-top:14px;padding:14px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb}"
      +".slbl-tc-res-row{display:flex;justify-content:space-between;font-size:14px;padding:4px 0}"
      +".slbl-tc-res-row strong{font-weight:600}"
      +".slbl-tc-total{border-top:1px solid #e5e7eb;margin-top:6px;padding-top:8px;font-size:15px}"
      +"html.slbl-tc-locked,body.slbl-tc-locked{overflow:hidden!important}";
    var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
    var wrap=document.createElement("div");wrap.className="slbl-tc-wrap";
    var btn=document.createElement("button");btn.type="button";btn.className="slbl-tc-btn";btn.textContent=s.buttonText;
    wrap.appendChild(btn);
    if(anchor.after){anchor.el.parentNode.insertBefore(wrap,anchor.el.nextSibling);}
    else{anchor.el.appendChild(wrap);}
    btn.addEventListener("click",function(){
      var ov=document.createElement("div");ov.className="slbl-tc-ov";
      var md=document.createElement("div");md.className="slbl-tc-md";md.setAttribute("role","dialog");md.setAttribute("aria-modal","true");
      md.innerHTML='<button type="button" class="slbl-tc-x" aria-label="Sluiten">&times;</button>'
        +'<h3>'+s.heading+'</h3>'
        +'<p>'+s.intro+'</p>'
        +'<div class="slbl-tc-grid">'
        +'<div class="slbl-tc-field"><label>Lengte (m)</label><input type="text" inputmode="decimal" class="slbl-tc-inp slbl-tc-len" placeholder="bv. 4,5"></div>'
        +'<div class="slbl-tc-field"><label>Breedte (m)</label><input type="text" inputmode="decimal" class="slbl-tc-inp slbl-tc-wid" placeholder="bv. 3,2"></div>'
        +'<div class="slbl-tc-field"><label>Snijverlies (%)</label><input type="number" min="0" max="50" class="slbl-tc-inp slbl-tc-mar" value="'+s.marginPct+'"></div>'
        +'<div class="slbl-tc-field"><label>Product</label><input type="text" class="slbl-tc-inp slbl-tc-info" value="'+infoLabel()+'" disabled></div>'
        +'</div>'
        +'<button type="button" class="slbl-tc-btn slbl-tc-calc">Bereken</button>'
        +'<div class="slbl-tc-res" style="display:none"></div>';
      ov.appendChild(md);
      (document.body||document.documentElement).appendChild(ov);
      document.documentElement.classList.add("slbl-tc-locked");document.body&&document.body.classList.add("slbl-tc-locked");
      function close(){document.documentElement.classList.remove("slbl-tc-locked");document.body&&document.body.classList.remove("slbl-tc-locked");ov.remove();}
      md.querySelector(".slbl-tc-x").addEventListener("click",close);
      ov.addEventListener("click",function(e){if(e.target===ov)close();});

      md.querySelector(".slbl-tc-calc").addEventListener("click",function(){
        var L=parseNum(md.querySelector(".slbl-tc-len").value);
        var W=parseNum(md.querySelector(".slbl-tc-wid").value);
        var M=parseNum(md.querySelector(".slbl-tc-mar").value);
        var res=md.querySelector(".slbl-tc-res");
        if(!L||!W||L<=0||W<=0){res.style.display="block";res.innerHTML='<div style="color:#b91c1c;font-size:13px">Vul een geldige lengte en breedte in.</div>';return;}
        if(!isFinite(M)||M<0)M=s.marginPct;
        var r=calc(L,W,M);
        var rows=''
          +'<div class="slbl-tc-res-row"><span>Oppervlakte</span><strong>'+fmt(r.area)+' m\u00b2</strong></div>'
          +'<div class="slbl-tc-res-row"><span>Incl. '+fmt(M)+'% snijverlies</span><strong>'+fmt(r.withMargin)+' m\u00b2</strong></div>';

        if (s.calcMode === 'package') {
          if (r.pieces !== undefined) {
            rows += '<div class="slbl-tc-res-row"><span>Aantal '+s.unitName+'</span><strong>'+fmtInt(r.pieces)+'</strong></div>';
          }
          rows += '<div class="slbl-tc-res-row"><span>Aantal '+s.packageName+'</span><strong>'+fmtInt(r.packages)+'</strong></div>';
        } else if (s.calcMode === 'roll') {
          var rollLabel = s.rollLengthM > 0 ? 'Aantal ' + s.packageName : s.packageName + ' nodig';
          rows += '<div class="slbl-tc-res-row"><span>'+rollLabel+'</span><strong>'+fmtInt(r.rolls)+'</strong></div>';
          if (s.rollLengthM > 0) {
            rows += '<div style="font-size:12px;color:#6b7280;margin-top:4px">Rolbreedte: '+fmt(r.rollWidth)+' m</div>';
          }
        } else if (s.calcMode === 'paint') {
          rows += '<div class="slbl-tc-res-row"><span>Benodigde liters</span><strong>'+fmtInt(r.liters)+'</strong></div>';
          rows += '<div class="slbl-tc-res-row"><span>Aantal '+s.packageName+'</span><strong>'+fmtInt(r.packages)+'</strong></div>';
        }

        if (s.pricePerM2>0){
          rows += '<div class="slbl-tc-res-row slbl-tc-total"><span>Totaalprijs</span><strong>'+s.currencySymbol+fmt(r.price)+'</strong></div>';
        }
        res.style.display="block";res.innerHTML=rows;
      });
    });
  }
  ready(function(){
    var anchor=findAnchor();if(!anchor)return;
    inject(anchor);
  });
})();`;
}
