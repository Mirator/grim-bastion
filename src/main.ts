import "./style.css";
import { bootstrapGame } from "./game/GameApp";

async function main(): Promise<void> {
  const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
  const hudRoot = document.querySelector<HTMLElement>("#hud-root");

  if (!canvas || !hudRoot) {
    throw new Error("Missing required #game-canvas or #hud-root element");
  }

  const app = await bootstrapGame(canvas, hudRoot);
  app.start();
}

main().catch((error) => {
  console.error("Failed to bootstrap Grim Bastion", error);
  const root = document.querySelector<HTMLElement>("#hud-root");
  if (root) {
    root.innerHTML = `<div class=\"fatal-error\">Failed to start Grim Bastion: ${String(error)}</div>`;
  }
});
