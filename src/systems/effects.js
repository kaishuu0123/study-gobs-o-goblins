import { world } from "../state/ecs";
import { ActiveEffects, Animate, Paralyzed } from "../state/components";

const ActiveEffectsEntities = world.createQuery({
  all: [ActiveEffects],
});

// XXX
const classes = { Paralyzed };
function camelize(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, '');
}

export const effects = () => {
  ActiveEffectsEntities.get().forEach((entity) => {
    entity.activeEffects.forEach((c) => {
      if (entity[c.component]) {
        entity[c.component].current += c.delta;

        if (entity[c.component].current > entity[c.component].max) {
          entity[c.component].current = entity[c.component].max;
        }
      }

      if (c.events.length) {
        c.events.forEach((event) => entity.fireEvent(event.name, event.args));
      }

      // handle addComponents
      if (c.addComponents.length) {
        c.addComponents.forEach((component) => {
          // XXX: getClass
          if (!entity.has(classes[component.name])) {
            entity.add(classes[component.name], component.properties);
          }
        });
      }

      entity.add(Animate, { ...c.animate });

      if (!c.duration) {
        c.destroy();

        if (c.addComponents.length) {
          c.addComponents.forEach((component) => {
            if (entity.has(classes[component.name])) {
              // XXX
              entity.remove(entity[camelize(component.name)], component.properties)
            }
          })
        }
      } else {
        c.duration -= 1;
      }
    });
  });
};