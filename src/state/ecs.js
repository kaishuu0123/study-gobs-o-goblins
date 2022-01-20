import { Engine } from "geotic";
import {
  Ai,
  Appearance,
  Description,
  Defense,
  Health,
  IsBlocking,
  IsInFov,
  IsOpaque,
  IsRevealed,
  Layer100,
  Layer300,
  Layer400,
  Move,
  Position,
  Power,
  IsDead,
  IsPickup,
  Inventory,
  ActiveEffects,
  Effects,
  Animate,
  RequiresTarget,
  Target,
  TargetingItem,
  Paralyzed,
} from "./components";

import { Being, Tile, Goblin, Player, Wall, Floor, Item, HealthPotion, ScrollLightning, ScrollParalyze, ScrollFireball, StairsUp, StairsDown } from "./prefabs";

export const ecs = new Engine();

export const world = ecs.createWorld();

// all Components must be `registered` by the engine
ecs.registerComponent(ActiveEffects);
ecs.registerComponent(Animate);
ecs.registerComponent(Ai);
ecs.registerComponent(Appearance);
ecs.registerComponent(Description);
ecs.registerComponent(Defense);
ecs.registerComponent(Effects);
ecs.registerComponent(Health);
ecs.registerComponent(Inventory);
ecs.registerComponent(IsBlocking);
ecs.registerComponent(IsDead);
ecs.registerComponent(IsInFov);
ecs.registerComponent(IsOpaque);
ecs.registerComponent(IsPickup);
ecs.registerComponent(IsRevealed);
ecs.registerComponent(Layer100);
ecs.registerComponent(Layer300);
ecs.registerComponent(Layer400);
ecs.registerComponent(Move);
ecs.registerComponent(Paralyzed);
ecs.registerComponent(Position);
ecs.registerComponent(Power);
ecs.registerComponent(RequiresTarget);
ecs.registerComponent(Target);
ecs.registerComponent(TargetingItem);

// register "base" prefabs first!
ecs.registerPrefab(Tile);
ecs.registerPrefab(Being);
ecs.registerPrefab(Item);

ecs.registerPrefab(HealthPotion);
ecs.registerPrefab(Wall);
ecs.registerPrefab(Floor);
ecs.registerPrefab(Goblin);
ecs.registerPrefab(Player);
ecs.registerPrefab(ScrollFireball);
ecs.registerPrefab(ScrollLightning);
ecs.registerPrefab(ScrollParalyze);
ecs.registerPrefab(StairsUp);
ecs.registerPrefab(StairsDown);

export default world;
