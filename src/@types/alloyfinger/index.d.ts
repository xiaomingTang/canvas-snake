declare module "alloyfinger" {
    import * as CustomModule from "alloyfinger"

    export type EventType = "rotate"
      | "touchStart"
      | "multipointStart"
      | "multipointEnd"
      | "pinch"
      | "swipe"
      | "tap"
      | "doubleTap"
      | "longTap"
      | "singleTap"
      | "pressMove"
      | "twoFingerPressMove"
      | "touchMove"
      | "touchEnd"
      | "touchCancel"

    export interface AlloyEvent extends TouchEvent {
      zoom: number;
      angle: number;
      direction: "Left" | "Right" | "Up" | "Down";
    }

    export type EventHandler = (e: AlloyEvent) => boolean | void

    export default class AlloyFinger {
      constructor(el: HTMLElement, options: {
        [key in EventType]?: EventHandler;
      });
      on: (eventType: EventType, handler: EventHandler) => void;
    }
}
