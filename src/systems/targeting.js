
import ecs, { world } from "../state/ecs";
import { readCacheSet } from "../state/cache";

import { ActiveEffects, Effects, Target, TargetingItem } from "../state/components";
import { addLog } from "..";

const targetingEntities = world.createQuery({
  all: [Target, TargetingItem],
});

export const targeting = (player) => {
  targetingEntities.get().forEach((entity) => {
    const { item } = entity.targetingItem;
    if (item && item.has(Effects)) {
      entity.target.forEach((t) => {
        const targets = readCacheSet("entitiesAtLocation", t.locId);

        targets.forEach((eId) => {
          const target = world.getEntity(eId);
          if (target.isInFov) {
            // XXX: s/get("Effects")/components["effects"]/
            item
              .components["effects"]
              .forEach((x) => {
                target.add(ActiveEffects, { ...x.serialize() });
              });
          }
        });
      });

      entity.target.forEach((t) => {
        t.destroy();
      });
      entity.remove(entity.targetingItem);

      addLog(`You use a ${item.description.name}`);
      // XXX
      player.fireEvent("consume", item);
    }
  });
};