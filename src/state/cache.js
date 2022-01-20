import get from 'lodash.get';
import set from 'lodash.set';

export const cache = {
  entitiesAtLocation: {},
  z: -1,
  floors: {}, // { x: { stairsUp: '', stairs Down: '' } }
};

export const addCache = (path, value) => {
  set(cache, path, value);
};

export const readCache = (path) => get(cache, path);

export const addCacheSet = (name, key, value) => {
  if (cache[name][key]) {
    cache[name][key].add(value);
  } else {
    cache[name][key] = new Set();
    cache[name][key].add(value);
  }
};

export const deleteCacheSet = (name, key, value) => {
  if (cache[name][key] && cache[name][key].has(value)) {
    cache[name][key].delete(value);
  }
};

export const readCacheSet = (name, key, value) => {
  if (cache[name][key]) {
    if (value) {
      return cache[name][key].get(value);
    }

    return cache[name][key];
  }
};

export const serializeCache = () => {
  const entitiesAtLocation = Object.keys(cache.entitiesAtLocation).reduce(
    (acc, val) => {
      acc[val] = [...cache.entitiesAtLocation[val]];
      return acc;
    },
    {}
  );

  return {
    entitiesAtLocation,
    z: cache.z,
    floors: cache.floors,
  };
};

export const deserializeCache = (data) => {
  cache.entitiesAtLocation = Object.keys(cache.entitiesAtLocation).reduce(
    (acc, val) => {
      acc[val] = new Set(data.entitiesAtLocation[val]);
      return acc;
    },
    {}
  );

  cache.z = data.z;
  cache.floors = data.floors;
};

export const clearCache = () => {
  cache.entitiesAtLocation = {};
  cache.z = 1;
  cache.floors = {};
};

export default cache;