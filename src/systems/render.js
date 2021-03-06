import some from "lodash.some";
import throttle from "lodash.throttle";
import world from "../state/ecs";
import {
  Appearance,
  IsInFov,
  IsRevealed,
  Layer100,
  Layer300,
  Layer400,
  Position
} from "../state/components";
import { clearCanvas, drawCell, drawRect, drawText, grid, pxToCell } from "../lib/canvas";
import { toLocId } from "../lib/grid";
import { readCache, readCacheSet } from "../state/cache";
import { gameState, messageLog, selectedInventoryIndex } from "..";

const layer100Entities = world.createQuery({
  all: [Position, Appearance, Layer100],
  any: [IsInFov, IsRevealed],
});

const layer300Entities = world.createQuery({
  all: [Position, Appearance, Layer300],
  any: [IsInFov, IsRevealed],
});

const layer400Entities = world.createQuery({
  all: [Position, Appearance, Layer400, IsInFov],
});

const clearMap = () => {
  clearCanvas(grid.map.x - 1, grid.map.y, grid.map.width + 1, grid.map.height);
};

const renderMap = () => {
  clearMap();

  layer100Entities.get().forEach((entity) => {
    if (entity.position.z !== readCache("z")) return;

    if (entity.isInFov) {
      drawCell(entity);
    } else {
      drawCell(entity, { color: "#333" });
    }
  });

  layer300Entities.get().forEach((entity) => {
    if (entity.position.z !== readCache("z")) return;

    if (entity.isInFov) {
      drawCell(entity);
    } else {
      drawCell(entity, { color: "#333" });
    }
  });

  layer400Entities.get().forEach((entity) => {
    if (entity.position.z !== readCache("z")) return;

    if (entity.isInFov) {
      drawCell(entity);
    } else {
      drawCell(entity, { color: "#100" });
    }
  });
};

const clearPlayerHud = () => {
  clearCanvas(
    grid.playerHud.x,
    grid.playerHud.y,
    grid.playerHud.width + 1,
    grid.playerHud.height,
  );
};

const renderPlayerHud = (player) => {
  clearPlayerHud();

  drawText({
    text: `${player.appearance.char} ${player.description.name}`,
    background: `${player.appearance.background}`,
    color: `${player.appearance.color}`,
    x: grid.playerHud.x,
    y: grid.playerHud.y,
  });

  drawText({
    text: "???".repeat(grid.playerHud.width),
    background: "black",
    color: "#333",
    x: grid.playerHud.x,
    y: grid.playerHud.y + 1,
  });

  drawText({
    text: `Depth: ${Math.abs(readCache("z"))}`,
    background: "black",
    color: "#666",
    x: grid.playerHud.x,
    y: grid.playerHud.y + 2,
  });

  const hp = player.health.current / player.health.max;

  if (hp > 0) {
    drawText({
      text: "???".repeat(hp * grid.playerHud.width),
      background: "black",
      color: "red",
      x: grid.playerHud.x,
      y: grid.playerHud.y + 1,
    })
  }
};

const clearMessageLog = () => {
  clearCanvas(
    grid.messageLog.x,
    grid.messageLog.y,
    grid.messageLog.width + 1,
    grid.messageLog.height
  );
};

const renderMessageLog = () => {
  clearMessageLog();

  drawText({
    text: messageLog[2],
    background: "#000",
    color: "#666",
    x: grid.messageLog.x,
    y: grid.messageLog.y,
  });

  drawText({
    text: messageLog[1],
    background: "#000",
    color: "#aaa",
    x: grid.messageLog.x,
    y: grid.messageLog.y + 1,
  });

  drawText({
    text: messageLog[0],
    background: "#000",
    color: "#fff",
    x: grid.messageLog.x,
    y: grid.messageLog.y + 2,
  });
};

const clearInfoBar = () => {
  drawText({
    text: ` `.repeat(grid.infoBar.width),
    x: grid.infoBar.x,
    y: grid.infoBar.y,
    background: "black",
  });
};

const renderInfoBar = (mPos) => {
  clearInfoBar();

  const { x, y, z } = mPos;
  const locId = toLocId({ x, y, z });

  // XXX: added (|| [])
  const esAtLoc = readCacheSet("entitiesAtLocation", locId) || [];
  const entitiesAtLoc = [...esAtLoc];

  if (entitiesAtLoc) {
    if (some(entitiesAtLoc, (eId) => world.getEntity(eId).isRevealed)) {
      drawCell({
        appearance: {
          char: "",
          background: "rgba(255, 255, 255, 0.5)",
        },
        position: { x, y, z },
      });
    }

    entitiesAtLoc
      .filter((eId) => {
        const entity = world.getEntity(eId);
        return (
          layer100Entities.matches(entity) ||
          layer300Entities.matches(entity) ||
          layer400Entities.matches(entity)
        );
      })
      .forEach((eId) => {
        const entity = world.getEntity(eId);
        clearInfoBar();

        if (entity.isInFov) {
          drawText({
            text: `You see a ${entity.description.name}(${entity.appearance.char}) here.`,
            x: grid.infoBar.x,
            y: grid.infoBar.y,
            color: "white",
            background: "black",
          });
        } else {
          drawText({
            text: `You remember seeing a ${entity.description.name}(${entity.appearance.char}) here.`,
            x: grid.infoBar.x,
            y: grid.infoBar.y,
            color: "white",
            background: "black",
          });
        }
      });
  }
};

const renderInventory = (player) => {
  clearInfoBar();
  // translucent to obscure the game map
  drawRect(0, 0, grid.width, grid.height, "rgba(0,0,0,0.65)");

  drawText({
    text: "INVENTORY",
    background: "black",
    color: "white",
    x: grid.inventory.x,
    y: grid.inventory.y,
  });

  drawText({
    text: "(c)Consume (d)Drop",
    background: "black",
    color: "#666",
    x: grid.inventory.x,
    y: grid.inventory.y + 1,
  });

  if (player.inventory.list.length) {
    player.inventory.list.forEach((entity, idx) => {
      drawText({
        text: `${idx === selectedInventoryIndex ? "*" : " "}${
          entity.description.name
        }`,
        background: "black",
        color: "white",
        x: grid.inventory.x,
        y: grid.inventory.y + 3 + idx,
      });
    });
  } else {
    drawText({
      text: "-empty-",
      background: "black",
      color: "#666",
      x: grid.inventory.x,
      y: grid.inventory.y + 3,
    });
  }
};

const renderTargeting = (mPos) => {
  const { x, y, z } = mPos;
  const locId = toLocId({ x, y, z });

  const esAtLoc = readCacheSet("entitiesAtLocation", locId);
  const entitiesAtLoc = [...esAtLoc];

  clearInfoBar();

  if (entitiesAtLoc) {
    if (some(entitiesAtLoc, (eId) => world.getEntity(eId).isRevealed)) {
      drawCell({
        appearance: {
          char: "",
          background: "rgba(74, 232, 218, 0.5)",
        },
        position: { x, y, z },
      });
    }
  }
};

const renderMenu = () => {
  drawText({
    text: `(i)Inventory (g)Pickup (arrow keys)Move/Attack (mouse)Look/Target (<)Stairs Up (>)Stairs Down`,
    background: "#000",
    color: "#666",
    x: grid.menu.x,
    y: grid.menu.y,
  });

  drawText({
    text: `(n)New (s)Save (l)Load`,
    background: "#000",
    color: "#666",
    x: grid.menu.x,
    y: grid.menu.y + 1,
  });
}

export const render = (player) => {
  renderMap();
  renderPlayerHud(player);
  renderMessageLog();
  renderMenu();

  if (gameState === "INVENTORY") {
    renderInventory(player);
  }
};

// info bar on mouseover
const canvas = document.querySelector("#canvas");
canvas.onmousemove = throttle((e) => {
  if (gameState === "GAME") {
    const [x, y] = pxToCell(e);
    renderMap();
    renderInfoBar({ x, y, z: readCache("z") });
  }

  if (gameState === "TARGETING") {
    const [x, y] = pxToCell(e);
    renderMap();
    renderTargeting({ x, y, z: readCache("z") });
  }
}, 50);