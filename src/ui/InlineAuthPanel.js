import { authLogin, authRegister, authBackendName } from "../services/AuthFacade.js";

// Panel inline para login / registro usando DOM (mantiene estilo minimalista, reutilizable)
export class InlineAuthPanel {
  constructor(scene, { mode="login", onSuccess, onClose, y=0 } = {}){
    this.scene = scene; this.mode = mode; this.onSuccess = onSuccess; this.onClose = onClose; this.y = y;
    this.build();
  }

  build(){
    const wrap = document.createElement("div");
    wrap.style.cssText = `display:grid;gap:10px;padding:18px 18px 16px;min-width:280px;max-width:340px;background:rgba(12,18,26,.82);border:2px solid #284253;border-radius:14px;font-family:system-ui,monospace;color:#e6f2ff;backdrop-filter:blur(4px);`;
  const title = document.createElement("div"); title.textContent = this.mode === "login"? "Login" : "Registro"; title.style.cssText = "font-size:18px;font-weight:700;letter-spacing:1px";
  const badge = document.createElement("div"); badge.style.cssText = "font-size:11px;opacity:.65;margin-top:-6px;margin-bottom:4px;letter-spacing:0.5px"; badge.textContent = `backend: ${authBackendName()}`;
    const name = document.createElement("input"); name.placeholder="Nombre"; name.maxLength=24;
    const pass = document.createElement("input"); pass.type="password"; pass.placeholder="Contraseña"; pass.maxLength=40;
    const contact = document.createElement("input"); contact.placeholder="Contacto (opcional)"; contact.style.display = this.mode==="register"? "block":"none";
    [name,pass,contact].forEach(inp=> inp.style.cssText = "padding:9px 11px;border:1px solid #31566b;background:#0d1721;color:#fff;border-radius:9px;font-size:14px;outline:none;" );
    const row = document.createElement("div"); row.style.cssText="display:flex;gap:8px";
    const submit = document.createElement("button"); submit.textContent = this.mode === "login"? "Entrar":"Crear";
    const swap = document.createElement("button"); swap.textContent = this.mode === "login"? "Registro":"Login";
    const cancel = document.createElement("button"); cancel.textContent = "X"; cancel.style.cssText="position:absolute;top:6px;right:8px;background:#183240;border:1px solid #305261;color:#9fb6c6;font-size:12px;padding:2px 6px;border-radius:6px;cursor:pointer;";
    [submit,swap].forEach(b=> b.style.cssText = "flex:1;padding:10px 12px;border:1px solid #3a6173;background:#2a9d8f;color:#062128;font-weight:700;border-radius:9px;letter-spacing:.5px;cursor:pointer;font-size:14px" );
    const msg = document.createElement("div"); msg.style.cssText="min-height:18px;font-size:12px;color:#9fb6c6";
  row.append(submit, swap); wrap.append(title,badge,name,pass,contact,row,msg,cancel);
    this.dom = this.scene.add.dom(this.scene.scale.width/2, this.y || Math.min(this.scene.scale.height-240, this.scene.scale.height*0.62), wrap).setOrigin(0.5).setDepth(50);
    const say = (t,c="#9fb6c6")=>{ msg.textContent=t; msg.style.color=c; };
    submit.onclick = async ()=>{
      say(this.mode==="login"?"Ingresando...":"Registrando...");
      const nombre=name.value.trim(); const password=pass.value; const contacto=contact.value;
      let res;
      try {
  res = this.mode==="login"? await authLogin({ nombre, password }) : await authRegister({ nombre, password, contacto });
      } catch(e){ res={ ok:false, error:"Error red"}; }
  if(res.ok){ console.log("[AuthPanel] success", res.user); say("Listo","#9bf6a3"); setTimeout(()=>{ this.close(); this.onSuccess?.(res.user); }, 200); }
  else { console.warn("[AuthPanel] fail", res); say(res.error||"Error","#ffadad"); }
    };
    swap.onclick = ()=> { this.mode = this.mode==="login"? "register":"login"; contact.style.display = this.mode==="register"? "block":"none"; title.textContent = this.mode==="login"? "Login":"Registro"; submit.textContent = this.mode==="login"? "Entrar":"Crear"; swap.textContent = this.mode==="login"? "Registro":"Login"; msg.textContent=""; };
    cancel.onclick = ()=>{ this.close(); this.onClose?.(); };
    this.scene.scale.on("resize", this.onResize, this);
  }

  onResize(){ if(!this.dom) return; this.dom.setPosition(this.scene.scale.width/2, this.scene.scale.height*0.62); }
  close(){ this.scene.scale.off("resize", this.onResize, this); this.dom?.destroy(); this.dom=null; }
}

export default InlineAuthPanel;