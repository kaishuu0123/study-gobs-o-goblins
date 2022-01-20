import { Component } from "geotic";
import { remove } from "lodash";
import { addCacheSet, deleteCacheSet } from "./cache";

const effectProps = {
  component: "",
  delta: "",
  animate: { char: "", color: "" },
  events: [], // { name: "", args: {} },
  addComponents: [], // { name: '', properties: {} }
  duration: 0, // in turns
};

export class Appearance extends Component {
  static properties = {
    color: "#ff0077",
    char: "?",
    background: "#000",
  };
}

export class Animate extends Component {
  static allowMultiple = true;
  static properties = {
    startTime: null,
    duration: 250,
    char: "",
    color: "",
  };

  onSetStartTime(evt) {
    this.startTime = evt.data.time;
  }
}

export class ActiveEffects extends Component {
  static allowMultiple = true;
  static properties = effectProps;
}

export class Effects extends Component {
  static allowMultiple = true;
  static properties = effectProps;
}

export class Move extends Component {
  static properties = { x: 0, y: 0, z: 0, relative: true };
}

export class Position extends Component {
  static properties = { x: 0, y: 0, z: -1 };

  onAttached() {
    const locId = `${this.entity.position.x},${this.entity.position.y},${this.entity.position.z}`;
    addCacheSet("entitiesAtLocation", locId, this.entity.id);
  }

  // XXX: onDetached
  onDestroyed() {
    const locId = `${this.x},${this.y},${this.z}`;
    deleteCacheSet("entitiesAtLocation", locId, this.entity.id);
  }
}

export class IsBlocking extends Component {}

export class IsDead extends Component {}

export class Layer100 extends Component {}

export class Layer300 extends Component {}

export class Layer400 extends Component {}

export class Inventory extends Component {
  static properties = {
    list: [],
  };

  onPickUp(evt) {
    this.list.push(evt.data);

    if (evt.data.position) {
      evt.data.remove(evt.data.position);
    }
  }

  onDrop(evt) {
    remove(this.list, (x) => x.id === evt.data.id);
    evt.data.add(Position, this.entity.position);
  }

  // XXX
  onConsume(evt) {
    this.list = this.list.filter(
      (item) => item.id !== evt.data.id
    );

    evt.data.destroy();
  }
}

export class IsInFov extends Component {}

export class IsOpaque extends Component {}

export class IsPickup extends Component {}

export class IsRevealed extends Component {}

export class Description extends Component {
  static properties = { name: "No Name" };
}

export class Ai extends Component {}

export class Defense extends Component {
  static properties = { max: 1, current: 1 };
}

export class Health extends Component {
  static properties = { max: 10, current: 1 };

  onTakeDamage(evt) {
    this.current -= evt.data.amount;

    if (this.current <= 0) {
      this.entity.appearance.char = "%";
      if (this.entity.has(Ai)) {
        this.entity.remove(this.entity.ai);
      }
      this.entity.remove(this.entity.isBlocking);
      this.entity.add(IsDead);
      this.entity.remove(this.entity.layer400);
      this.entity.add(Layer300)
    }

    evt.handle();
  }
}

export class Power extends Component {
  static properties = { max: 5, current: 5 };
}

export class RequiresTarget extends Component {
  static properties = {
    acquired: "RANDOM",
    aoeRange: 0,
  };
};

export class Target extends Component {
  static allowMultiple = true;
  static properties = { locId: "" };
}

export class TargetingItem extends Component {
  static properties = { item: "<Entity>" };
}

export class Paralyzed extends Component {}