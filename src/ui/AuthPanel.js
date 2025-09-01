// AuthPanel: modal de Registro/Login con DOM inputs + botones pixel
import { register, login, fetchUsers, normName } from "../services/gsheetsAuth.js";
import { makePixelPanel } from "../utils/pixelPanel.js";

export default class AuthPanel {
  constructor(scene, { title="REGISTRAR / ENTRAR" } = {}){
    this.scene = scene;
    this.g = scene.add.container(0,0).setDepth(1000);
    const W = scene.scale.width, H = scene.scale.height;

    // overlay oscuro
    this.dim = scene.add.rectangle(0,0,W,H,0x000000,0.55).setOrigin(0).setInteractive();
    this.g.add(this.dim);

    // tarjeta pixel
    const cardW = Phaser.Math.Clamp(Math.floor(W*0.42), 320, 380);
    const cardH = 310;
    this.panel = makePixelPanel(scene, cardW, cardH, "slate").setAlpha(0.96);
    this.card = scene.add.container(W/2 - cardW/2, H/2 - cardH/2, [this.panel]).setDepth(1001);
    this.g.add(this.card);

    // título
    this.h1 = scene.add.bitmapText(12, 10, "casual", title, 28).setTint(0xffffff).setOrigin(0,0);
    this.card.add(this.h1);

    // Inyectar estilos globales (solo una vez)
    if(!document.getElementById('authpanel-styles')){
      const style = document.createElement('style');
      style.id='authpanel-styles';
      style.textContent = `
        input, button { image-rendering: pixelated; }
        button:hover:not(:disabled){ filter: brightness(1.08); }
        button:disabled { opacity:.6; cursor:not-allowed; }
        .btn-loading { position:relative; }
        .btn-loading:after { content:""; position:absolute; inset:6px auto 6px 8px; width:14px; height:14px; border:3px solid #0b1220; border-top-color:rgba(255,255,255,.85); border-radius:50%; animation:spin .8s linear infinite; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .input-error { border-color:#e76f51 !important; }
      `;
      document.head.appendChild(style);
    }

    // —— DOM form estilizado retro ——
    const wrap = document.createElement("form");
    wrap.style.cssText = `display:grid; gap:10px; width:${cardW-24}px; padding:6px 6px 0; font-family: monospace; color:#e8eef9;`;
    const mkLabel = (t)=>{ const l=document.createElement("label"); l.textContent=t; l.style.cssText="font-weight:700; letter-spacing:1px;"; return l; };
    const mkInput = (type="text")=>{
      const i=document.createElement("input");
      i.type=type; i.maxLength= type==="password"? 32 : 24;
      i.style.cssText = `padding:10px 12px; border:2px solid #2b3a4a; border-radius:10px; background:#0f1622; color:#fff; outline:none; font-weight:700; letter-spacing:.5px; box-shadow: inset 0 2px 0 rgba(255,255,255,.06);`;
      return i;
    };
    const inName = mkInput("text"); inName.placeholder = "Nombre (3–24)";
    const inPass = mkInput("password"); inPass.placeholder = "Contraseña (≥3)";
    const inContact = mkInput("text"); inContact.placeholder = "Contacto (opcional)";
    const errName = document.createElement("div"); errName.style.cssText="min-height:14px;color:#ffadad;font-size:12px";
    const errPass = document.createElement("div"); errPass.style.cssText="min-height:14px;color:#ffadad;font-size:12px";
    const banner  = document.createElement("div"); banner.style.cssText="min-height:18px;color:#e8eef9;font-weight:700";
    const rowBtns = document.createElement("div"); rowBtns.style.cssText="display:flex; gap:8px; justify-content:space-between; margin-top:6px";
    const bReg = document.createElement("button"); bReg.type="button"; bReg.textContent="REGISTRAR";
    const bIn  = document.createElement("button"); bIn.type="submit";  bIn.textContent="ENTRAR";
    const bCancel = document.createElement("button"); bCancel.type="button"; bCancel.textContent="CANCELAR";
    [bReg,bIn,bCancel].forEach(b=> b.style.cssText="flex:1;padding:10px 12px;border-radius:10px;border:2px solid #2b3a4a;background:#2a9d8f;color:#0b1220;font-weight:900;cursor:pointer");
    bIn.style.background="#5aa7ff"; bCancel.style.background="#748195"; bCancel.style.color="#0d0d0d";

    // ojo mostrar/ocultar password
    const eye = document.createElement("button"); eye.type="button"; eye.textContent="👁"; eye.title="Ver";
    eye.style.cssText="position:absolute; right:10px; top:34px; background:transparent; border:none; cursor:pointer; color:#cfe3ff";
    const passWrap = document.createElement("div"); passWrap.style.cssText="position:relative";
    passWrap.append(inPass, eye);

    wrap.append(
      banner,
      mkLabel("Nombre"), inName, errName,
      mkLabel("Contraseña"), passWrap, errPass,
      mkLabel("Contacto (opcional)"), inContact,
      rowBtns
    );
    rowBtns.append(bReg, bIn, bCancel);

    this.formDom = scene.add.dom(this.panel.x + cardW/2, this.panel.y + 64, wrap).setOrigin(0.5,0);
    this.card.add(this.formDom);

    const say   = (t,c="#e8eef9") => { banner.textContent=t; banner.style.color=c; };
    const buttons = [bReg,bIn,bCancel];
    const interactive = [bReg,bIn,bCancel,inName,inPass,inContact,eye];
    const setBtnLoading = (btn,on)=>{
      buttons.forEach(b=> b.classList.remove('btn-loading'));
      if(on) btn.classList.add('btn-loading');
    };
    const lock  = (on, btnLoading=null)=>{ interactive.forEach(el=> el.disabled=on); if(btnLoading) setBtnLoading(btnLoading,on); else setBtnLoading(null,false); };
    const NAME_RE = /^[A-Za-z0-9 _\-.#]+$/; // caracteres permitidos
    const okName = async (dupCheck=true)=>{
      const raw = inName.value;
      const name = normName(raw);
      if(raw!==name) inName.value = name; // colapsar espacios
      if (name.length < 3){ errName.textContent="Mínimo 3 caracteres"; inName.classList.add('input-error'); return false; }
      if(!NAME_RE.test(name)){ errName.textContent="Caracteres inválidos"; inName.classList.add('input-error'); return false; }
      if(!dupCheck){ inName.classList.remove('input-error'); return true; }
      const users = await fetchUsers();
      const taken = users.some(u => u.nombre.toLowerCase() === name.toLowerCase());
      errName.textContent = taken ? "Nombre ocupado" : "";
      inName.classList.toggle('input-error', taken);
      return !taken;
    };
    const okPass = ()=> {
      const v = inPass.value.trim();
      const good = v.length >= 3;
      errPass.textContent = good ? "" : "Mínimo 3 caracteres";
      inPass.classList.toggle('input-error', !good);
      return good;
    };

    // Validación en vivo (debounce para duplicado)
    let nameTimer=null; inName.addEventListener('input', ()=>{
      inName.classList.remove('input-error'); errName.textContent=""; banner.textContent=""; 
      if(nameTimer) clearTimeout(nameTimer);
      nameTimer = setTimeout(()=> okName(false), 120); // primero validación básica
      // duplicado después de una pausa más larga
      setTimeout(()=> { if(document.activeElement===inName) okName(true); }, 400);
    });
    inPass.addEventListener('input', ()=>{ okPass(); });
    inName.autofocus = true;

    eye.onclick = ()=>{ inPass.type = (inPass.type==="password" ? "text" : "password"); };

    wrap.addEventListener("submit", async (e)=>{
      e.preventDefault();
      // Validar nombre (sintaxis mínima) y pass, pero no checar duplicado para login
      const nameOk = await okName(false); const passOk = okPass();
      if (!nameOk || !passOk) return;
      lock(true, bIn); say("Ingresando...");
      const res = await login({ nombre: inName.value, password: inPass.value });
      if (res.ok){ say("¡Bienvenido!", "#9bf6a3"); this.close(true, res.user); }
      else { say(res.error||"Error", "#ffadad"); lock(false); }
    });

    bReg.onclick = async ()=>{
      if (!(await okName(true)) || !okPass()) return;
      lock(true, bReg); say("Registrando...");
      const res = await register({ nombre: inName.value, password: inPass.value, contacto: inContact.value });
      if (res.ok){ say("¡Registrado!", "#9bf6a3"); this.close(true, res.user); }
      else { say(res.error||"Error", "#ffadad"); lock(false); }
    };
    bCancel.onclick = ()=> this.close(false);

    this.onResize = ()=> {
      const W2 = scene.scale.gameSize.width, H2 = scene.scale.gameSize.height;
      this.dim.setSize(W2,H2);
      const cw = Phaser.Math.Clamp(Math.floor(W2*0.42), 320, 380), ch = 310;
      this.panel.setDisplaySize(cw, ch);
      this.card.setPosition(W2/2 - cw/2, H2/2 - ch/2);
      this.formDom.setPosition(this.panel.x + cw/2, this.panel.y + 64);
    };
    scene.scale.on("resize", this.onResize);

    scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).once("down", ()=> this.close(false));
  }

  close(success=false, user=null){
    this.scene.scale.off("resize", this.onResize);
    this.g.destroy();
    if (success) this.scene.events.emit("auth:success", user);
  }
}
