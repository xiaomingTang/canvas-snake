export interface WrapedValue<T> {
  value: T;
}

export type SetWrapedState<T> = (val: T) => void;

export type EventHandler<T> = (oldVal: T, newVal: T) => void;

export type AddEventListener<T> = (f: EventHandler<T>) => void;

export type RemoveEventListener<T> = (f: EventHandler<T>) => void;

export function nonActiveState<T>(defaultVal: T): [WrapedValue<T>, SetWrapedState<T>, AddEventListener<T>, RemoveEventListener<T>] {
  const handlers = [] as EventHandler<T>[]

  const state: WrapedValue<typeof defaultVal> = {
    value: defaultVal,
  }

  const setState = (newVal: T) => {
    handlers.forEach((handler) => {
      handler(state.value, newVal)
    })
    state.value = newVal
  }

  function addEventListener(f: EventHandler<T>) {
    if (!handlers.includes(f)) {
      handlers.push(f)
    }
  }

  function removeEventListener(f: EventHandler<T>) {
    const index = handlers.indexOf(f)
    if (index >= 0) {
      handlers.splice(index, 1)
    }
  }

  return [state, setState, addEventListener, removeEventListener]
}
