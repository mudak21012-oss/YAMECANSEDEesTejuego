import { getSession } from "../services/gsheetsAuth.js";
import AuthPanel from "../ui/AuthPanel.js";

export default class AuthScene extends Phaser.Scene {
  constructor(){ super("Auth"); }
  create(){
    this.cameras.main.setBackgroundColor("#0b1220");
    const existing = getSession();
    if(existing){ this.scene.start("Menu"); return; }
    new AuthPanel(this, { title:"REGISTRAR / ENTRAR" });
    this.events.once("auth:success", ()=> this.scene.start("Menu"));
  }
}
