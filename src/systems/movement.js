import world from "../state/ecs";
import { addCacheSet, deleteCacheSet, readCacheSet } from "../state/cache";
import { grid } from "../lib/canvas";
import { Ai, Defense, Health, IsDead, Layer300, Move, Paralyzed, Position } from "../state/components";
import { addLog } from "..";

const movableEntities = world.createQuery({
  all: [Move],
});

const attack = (entity, target) => {
  const damage = entity.power.current - target.defense.current;
  target.fireEvent("take-damage", { amount: damage });

  if (target.health.current <= 0) {
    return addLog(
      `${entity.description.name} kicked a ${target.description.name} for ${damage} damage and killed it!`
    );
  }

  addLog(`${entity.description.name} kicked a ${target.description.name} for ${damage} damage!`);
};

export const movement = () => {
  movableEntities.get().forEach((entity) => {
    if (entity.has(Paralyzed)) {
      return entity.remove(entity.move);
    }

    let mx = entity.move.x;
    let my = entity.move.y;
    let mz = entity.move.z;

    if (entity.move.relative) {
      mx = entity.position.x + entity.move.x;
      my = entity.position.y + entity.move.y;
    }

    // this is where we will run any checks to see if entity can move to new location
    // observe map boundaries
    mx = Math.min(grid.map.width + grid.map.x - 1, Math.max(21, mx));
    my = Math.min(grid.map.height + grid.map.y - 1, Math.max(3, my));

    // check for blockers
    const blockers = [];
    // read from cache
    const entitiesAtLoc = readCacheSet("entitiesAtLocation", `${mx},${my},${mz}`);
    for (const eId of entitiesAtLoc) {
      if (world.getEntity(eId).isBlocking) {
        blockers.push(eId);
      }
    }
    if (blockers.length) {
      blockers.forEach((eId) => {
        const target = world.getEntity(eId);
        if (target.has(Health) && target.has(Defense)) {
          attack(entity, target);
        } else {
          addLog(
            `${entity.description.name} bump into a ${target.description.name}`
          )
        }
      });

      entity.remove(entity.move);
      return;
    }

    deleteCacheSet(
      "entitiesAtLocation",
      `${entity.position.x},${entity.position.y}`,
      entity.id
    );
    addCacheSet("entitiesAtLocation", `${mx},${my}`, entity.id);

    entity.remove(entity.position);
    entity.add(Position, { x: mx, y: my, z: mz });

    entity.remove(entity.move);
  });
};