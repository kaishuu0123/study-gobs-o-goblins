import sample from "lodash.sample";
import times from "lodash.times";
import get from "lodash.get";
import "./lib/canvas.js";
import { grid, pxToCell } from "./lib/canvas.js";
import { circle, toLocId, toCell } from "./lib/grid";
import { addCache, clearCache, deserializeCache, readCache, readCacheSet, serializeCache } from "./state/cache.js";
import { createDungeon } from "./lib/dungeon.js";
import { ai } from "./systems/ai";
import { fov } from "./systems/fov.js";
import { movement } from "./systems/movement";
import { render } from "./systems/render";
import { ecs, world } from "./state/ecs";
import {
  ActiveEffects,
  Ai,
  Effects,
  IsInFov,
  Move,
  Position,
  Target,
  TargetingItem,
} from "./state/components";
import { update } from "lodash";
import { effects } from "./systems/effects.js";
import { animation } from "./systems/animation.js";
import { targeting } from "./systems/targeting.js";
import { Player, StairsDown, StairsUp } from "./state/prefabs.js";

let player = {};
let userInput = null;
let playerTurn = true;
let enemiesInFOV = null;
export let gameState = "GAME";
export let selectedInventoryIndex = 0;
export let messageLog = ["", "Welcome to Gobs 'O Goblins!", ""];
export const addLog = (text) => {
  messageLog.unshift(text);
};

// XXX: work around for BigInt serialize
// refs: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt
// Use within JSON
BigInt.prototype.toJSON = function() { return this.toString()  }

const newGame = () => {
  for (let item of world.getEntities()) {
    item.destroy();
  }
  clearCache();

  userInput = null;
  playerTurn = true;
  gameState = "GAME";
  selectedInventoryIndex = 0;

  messageLog = ["", "Welcome to Gobs 'O Goblins!", ""];

  initGame();
}

const saveGame = () => {
  const gameSaveData = {
    world: world.serialize(),
    cache: serializeCache(),
    playerId: player.id,
    messageLog,
  };
  console.log(gameSaveData);
  localStorage.setItem("gameSaveData", JSON.stringify(gameSaveData));
  addLog("Game saved");
};

const loadGame = () => {
  const data = JSON.parse(localStorage.getItem('gameSaveData'));
  if (!data) {
    addLog("Failed to load - no saved game found");
    return;
  }

  for (let entity of world.getEntities()) {
    entity.destroy();
  }
  clearCache();

  world.deserialize(data.world);
  deserializeCache(data.cache);

  player = world.getEntity(data.playerId);

  userInput = null;
  playerTurn = true;
  gameState = "GAME";
  selectedInventoryIndex = 0;

  messageLog = data.messageLog;
  addLog("Game loaded");
};

const initGame = () => {
  // init game map and player position
  const { stairsDown } = createDungeonLevel({ createStairsUp: false });

  player = world.createPrefab("Player");

  addCache(`floors.${-1}`, {
    stairsDown: toLocId(stairsDown.position),
  });

  player.add(Position, stairsDown.position);

  fov(player);
  render(player);
};

const createDungeonLevel = ({
  createStairsUp = true,
  createStairsDown = true,
} = {}) => {
  const dungeon = createDungeon({
    x: grid.map.x,
    y: grid.map.y,
    z: readCache('z'),
    width: grid.map.width,
    height: grid.map.height,
  });

  const openTiles = Object.values(dungeon.tiles).filter(
    (x) => x.sprite === "FLOOR"
  );

  enemiesInFOV = world.createQuery({ all: [IsInFov, Ai] });

  times(5, () => {
    const tile = sample(openTiles);

    world.createPrefab("Goblin").add(Position, tile);
  });

  times(5, () => {
    const tile = sample(openTiles);
    world.createPrefab("HealthPotion").add(Position, tile);
  });

  times(10, () => {
    const tile = sample(openTiles);
    world.createPrefab("ScrollLightning").add(Position, tile);
  });

  times(10, () => {
    const tile = sample(openTiles);
    world.createPrefab("ScrollParalyze").add(Position, tile);
  });

  times(10, () => {
    const tile = sample(openTiles);
    world.createPrefab("ScrollFireball").add(Position, tile);
  });

  let stairsUp, stairsDown;

  if (createStairsUp) {
    times(1, () => {
      const tile = sample(openTiles);
      stairsUp = world.createPrefab("StairsUp");
      stairsUp.add(Position, tile);
    });
  }

  if (createStairsDown) {
    times(1, () => {
      const tile = sample(openTiles);
      stairsDown = world.createPrefab("StairsDown");
      stairsDown.add(Position, tile);
    })
  }

  return { dungeon, stairsUp, stairsDown };
};

const goToDungeonLevel = (level) => {
  const goingUp = readCache("z") < level;
  const floor = readCache("floors")[level];

  if (floor) {
    addCache("z", level);
    player.remove(player.position);
    if (goingUp) {
      player.add(Position, toCell(floor.stairsDown));
    } else {
      player.add(Position, toCell(floor.stairsUp));
    }
  } else {
    addCache("z", level);
    const { stairsUp, stairsDown } = createDungeonLevel();

    addCache(`floors.${level}`, {
      stairsUp: toLocId(stairsUp.position),
      stairsDown: toLocId(stairsDown.position),
    });

    player.remove(player.position);

    if (goingUp) {
      player.add(Position, toCell(stairsDown.position));
    } else {
      player.add(Position, toCell(stairsUp.position));
    }
  }

  fov(player);
  render(player);
}

window.addEventListener('load', (event) => {
  initGame();

  document.addEventListener("keydown", (ev) => {
    if (ev.key !== "Shift") {
      userInput = ev.key;
    }
  });

  const processUserInput = () => {
    if (userInput === "n") {
      newGame();
    }

    if (userInput === "l") {
      loadGame();
    }

    if (userInput === "s") {
      saveGame();
    }

    if (gameState === "GAME") {
      if (userInput === ">") {
        if (
          toLocId(player.position) ==
          readCache(`floors.${readCache("z")}.stairsDown`)
        ) {
          addLog("You descend deeper into the dungeon");
          goToDungeonLevel(readCache("z") - 1);
        } else {
          addLog("There are no stairs to descend");
        }
      }

      if (userInput === "<") {
        // XXX
        if (
          toLocId(player.position) ==
          readCache(`floors.${readCache("z")}.stairsUp`)
        ) {
          addLog("You climb from the depths of the dungeon");
          goToDungeonLevel(readCache("z") + 1);
        } else {
          addLog("There are no stairs to climb");
        }
      }

      if (userInput === "ArrowUp") {
        player.add(Move, { x: 0, y: -1, z: readCache("z") });
      }
      if (userInput === "ArrowRight") {
        player.add(Move, { x: 1, y: 0, z: readCache("z") });
      }
      if (userInput === "ArrowDown") {
        player.add(Move, { x: 0, y: 1, z: readCache("z") });
      }
      if (userInput === "ArrowLeft") {
        player.add(Move, { x: -1, y: 0, z: readCache("z") });
      }

      if (userInput === "g") {
        let pickupFound = false;
        readCacheSet("entitiesAtLocation", toLocId(player.position)).forEach(
          (eId) => {
            const entity = world.getEntity(eId);
            if (entity.isPickup) {
              pickupFound = true;
              player.fireEvent("pick-up", entity);
              addLog(`You pickup a ${entity.description.name}`);
            }
          }
        );
        if (!pickupFound) {
          addLog("There is nothing to pick up here");
        }
      }

      if (userInput == "d") {
        if (player.inventory.list.length) {
          player.fireEvent("drop", player.inventory.list[0]);
        }
      }

      if (userInput === "i") {
        gameState = "INVENTORY";
      }

      userInput = null;
    }

    if (gameState === "TARGETING") {
      if (userInput === "Escape") {
        player.remove(player.targetingItem);
        gameState = "GAME";
      }

      userInput = null;
    }

    if (gameState === "INVENTORY") {
      if (userInput === "i" || userInput === "Escape") {
        gameState = "GAME";
      }

      if (userInput === "ArrowUp") {
        selectedInventoryIndex -= 1;
        if (selectedInventoryIndex < 0) {
          selectedInventoryIndex = 0;
        }
      }

      if (userInput === "ArrowDown") {
        selectedInventoryIndex += 1;
        if (selectedInventoryIndex > player.inventory.list.length - 1) {
          selectedInventoryIndex = player.inventory.list.length - 1;
        }
      }

      if (userInput === "c") {
        const entity = player.inventory.list[selectedInventoryIndex];

        if (entity) {
          if (entity.requiresTarget) {
            if (entity.requiresTarget.acquired === "RANDOM") {
              //get a target that is NOT the player
              const target = sample([...enemiesInFOV.get()]);

              if (target) {
                player.add(TargetingItem, { item: entity });
                player.add(Target, { locId: toLocId(target.position) });
              } else {
                addLog(`The scroll disintegrates uselessly in your hand`);
                // XXX
                player.fireEvent("consume", entity);
              }
            }
            if (entity.requiresTarget.acquired === "MANUAL") {
              player.add(TargetingItem, { item: entity });
              gameState = "TARGETING";
              return;
            }
          } else if (entity.has(Effects)) {
            // XXX: s/get("Effects")/components("effects")/
            entity
              .components["effects"]
              .forEach((x) => player.add(ActiveEffects, { ...x.serialize() }));

            addLog(`You consume a ${entity.description.name}`);
            // XXX
            const idx = player.inventory.list.indexOf(entity);
            player.inventory.list.splice(idx, 1);
            entity.destroy();
          }

          if (selectedInventoryIndex > player.inventory.list.length - 1) {
            selectedInventoryIndex = player.inventory.list.length - 1;
          }

          gameState = "GAME";
        }
      }

      if (userInput === "d") {
        if (player.inventory.list.length) {
          addLog(`You drop a ${player.inventory.list[0].description.name}`);
          player.fireEvent("drop", player.inventory.list[0]);
        }
      }

      userInput = null;
    }
  };

  const update = () => {
    animation();

    if (player.isDead) {
      if (gameState !== "GAMEOVER") {
        addLog("You are dead.");
        render(player);
      }
      gameState = "GAMEOVER";
      processUserInput();

      return;
    }

    if (playerTurn && userInput && gameState === "TARGETING") {
      processUserInput();
      render(player);
      playerTurn = true;
    }

    if (playerTurn && userInput && gameState === "INVENTORY") {
      processUserInput();
      targeting(player);
      effects();
      render(player);
      playerTurn = true;
    }

    if (playerTurn && userInput && gameState === "GAME") {
      processUserInput();
      effects();
      movement();
      fov(player);
      render(player);

      if (gameState === "GAME") {
        playerTurn = false;
      }
    }

    if (!playerTurn) {
      ai(player);
      effects();
      movement();
      fov(player);
      render(player);

      playerTurn = true;
    }
  };

  const gameLoop = () => {
    update();
    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);

  if (process.env.NODE_ENV === "development") {
    const canvas = document.querySelector("#canvas");

    canvas.onclick = (e) => {
      const [x, y] = pxToCell(e);
      const locId = toLocId({x, y, z: readCache("z") });

      readCacheSet("entitiesAtLocation", locId).forEach((eId) => {
        const entity = world.getEntity(eId);

        console.log(
          `${get(entity, "appearance.char", "?")} ${get(
            entity,
            "description.name",
            "?"
          )}`,
          entity.serialize()
        );

        if (gameState === "TARGETING") {
          const entity = player.inventory.list[selectedInventoryIndex];
          if (entity.requiresTarget.aoeRange) {
            const targets = circle({ x, y }, entity.requiresTarget.aoeRange).map(
              (locId) => `${locId},${readCache("z")}`
            );
            targets.forEach((locId) => player.add(Target, { locId }));
          } else {
            player.add(Target, { locId });
          }
          gameState = "GAME";
          targeting(player);
          effects();
          render(player);
        }
      });
    };
  }
});