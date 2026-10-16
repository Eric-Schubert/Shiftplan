const instances = new Map<string, unknown>();

/** One Intl object per kind, locale and options: they are slow to create, and lists format many values. */
export function cached<T>(key: string, create: () => T): T {
  let instance = instances.get(key) as T | undefined;
  if (instance === undefined) {
    instance = create();
    instances.set(key, instance);
  }
  return instance;
}
