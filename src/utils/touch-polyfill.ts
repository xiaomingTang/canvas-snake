import EventEmitter from "wolfy87-eventemitter"

export type Dir =
    "Right"
  | "BottomRight"
  | "Bottom"
  | "BottomLeft"
  | "Left"
  | "TopLeft"
  | "Top"
  | "TopRight"

const EPS = 0.00001

const DirsMap: Dir[] = [
  "Right",
  "BottomRight",
  "Bottom",
  "Bottom",
  "BottomLeft",
  "Left",
  "Left",
  "TopLeft",
  "Top",
  "Top",
  "TopRight",
  "Right",
]

class Point {
  public isPoint = true;

  public constructor(
    public x: number = -1,
    public y: number = -1,
  ) {}

  public get isValid() {
    return this.x >= 0 && this.y >= 0
  }

  public get lengthSquared() {
    return this.x * this.x + this.y * this.y
  }

  public get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y)
  }

  public get angle() { // 0 ~ 2PI
    // computes the angle in radians with respect to the positive x-axis
    let angle = Math.atan2(this.y, this.x)

    if (angle < 0) {
      angle += 2 * Math.PI
    }

    return angle
  }

  public get direction() {
    const intDir = Math.floor(this.angle / Math.PI * 6) // 0 ~ 11
    return DirsMap[intDir]
  }

  public set(x: number, y: number) {
    this.x = x
    this.y = y
    return this
  }

  public clear() {
    this.x = -1
    this.y = -1
    return this
  }

  public copy(p: Point) {
    this.x = p.x
    this.y = p.y
    return this
  }

  public clone() {
    return new Point(this.x, this.y)
  }

  public sub(p: Point) {
    this.x -= p.x
    this.y -= p.y
    return this
  }

  public distanceToSquared(p: Point) {
    const dx = this.x - p.x
    const dy = this.y - p.y
    return dx * dx + dy * dy
  }

  public distanceTo(p: Point) {
    const dx = this.x - p.x
    const dy = this.y - p.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  public approEqual(p: Point, approVal = EPS) {
    return this.distanceToSquared(p) <= approVal
  }
}

type TapEventTag = "tap"
type SwipeEventTag = "swipe"
type EventTag = TapEventTag | SwipeEventTag

type TapEventHandler = (e: TouchEvent) => void
type SwipeEventHandler = (e: TouchEvent, dir: Dir, angle: number) => void
type EventHandler = TapEventHandler | SwipeEventHandler

interface HandleEventListener {
  (tag: RegExp, handler: EventHandler): EventEmitter;
  (tag: TapEventTag, handler: TapEventHandler): EventEmitter;
  (tag: SwipeEventTag, handler: SwipeEventHandler): EventEmitter;
}

interface MultipleEvents {
  "tap"?: TapEventHandler | TapEventHandler[];
  "swipe"?: SwipeEventHandler | SwipeEventHandler[];
}

interface HandleEventListeners {
  (tag: RegExp, handlers: EventHandler[]): EventEmitter;
  (tag: TapEventTag, handlers: TapEventHandler[]): EventEmitter;
  (tag: SwipeEventTag, handlers: SwipeEventHandler[]): EventEmitter;
  (events: MultipleEvents): EventEmitter;
}

interface ManipulateEventListeners {
  (doRemove: boolean, tag: RegExp, handlers: EventHandler[]): EventEmitter;
  (doRemove: boolean, tag: TapEventTag, handlers: TapEventHandler[]): EventEmitter;
  (doRemove: boolean, tag: SwipeEventTag, handlers: SwipeEventHandler[]): EventEmitter;
  (doRemove: boolean, events: MultipleEvents): EventEmitter;
}

type TapEmitArgs = [TouchEvent]
type SwipeEmitArgs = [TouchEvent, Dir, number]
type EmitArgs = TapEmitArgs | SwipeEmitArgs

interface EmitEvent {
  (tag: RegExp, args: EmitArgs): EventEmitter;
  (tag: TapEventTag, args: TapEmitArgs): EventEmitter;
  (tag: SwipeEventTag, args: SwipeEmitArgs): EventEmitter;
}

interface Emit {
  (tag: RegExp, ...args: EmitArgs): EventEmitter;
  (tag: TapEventTag, ...args: TapEmitArgs): EventEmitter;
  (tag: SwipeEventTag, ...args: SwipeEmitArgs): EventEmitter;
}

export default class TouchPolyfill extends EventEmitter {
  private startPoint = new Point()

  private curPoint = new Point()

  private rawDetPoint = new Point()

  private startTime = -1

  private curTime = -1

  private minLen = 30

  // 是否可能是tap
  private tapAble = true

  // tap事件判定中
  // 手指落点和起点之间距离的平方
  // 小于该值的可被判定为tap事件
  private rawApproVal = 100

  private get detPoint() {
    return this.rawDetPoint.copy(this.curPoint).sub(this.startPoint)
  }

  private get detTime() {
    return this.curTime - this.startTime
  }

  private onTouchStart = (e: TouchEvent) => {
    console.log("onTouchStart")
    if (e.touches.length === 1) {
      this.tapAble = true
      const { clientX, clientY } = e.touches[0]
      this.startPoint.set(clientX, clientY)
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    console.log("onTouchMove")
    if (e.touches.length === 1) {
      this.tapAble = false
      const { clientX, clientY } = e.touches[0]
      this.curPoint.set(clientX, clientY)
      const { direction, length, angle } = this.detPoint
      if (length > this.minLen) {
        this.startPoint.set(clientX, clientY)
        this.emitEvent("swipe", [e, direction, angle])
      }
    }
  }

  private onTouchCancel = () => {
    console.log("onTouchCancel")
    this.startPoint.clear()
    this.curPoint.clear()
  }

  private onTouchEnd = (e: TouchEvent) => {
    console.log("onTouchEnd")
    if (e.changedTouches.length === 1) {
      const { clientX, clientY } = e.changedTouches[0]
      this.curPoint.set(clientX, clientY)
      const { direction, length, angle } = this.detPoint
      if (length > this.minLen) {
        this.emitEvent("swipe", [e, direction, angle])
      } else if (this.tapAble && this.startPoint.approEqual(this.curPoint, this.approVal)) {
        this.emitEvent("tap", [e])
      }
      this.startPoint.clear()
      this.curPoint.clear()
    }
  }

  public get approVal() {
    return this.rawApproVal
  }

  public set approVal(val: number) {
    if (val <= 0) {
      this.rawApproVal = EPS
    } else {
      this.rawApproVal = val
    }
  }

  public constructor(public element: HTMLElement) {
    super()
    element.addEventListener("touchstart", this.onTouchStart)
    element.addEventListener("touchmove", this.onTouchMove)
    element.addEventListener("touchend", this.onTouchEnd)
    element.addEventListener("touchcancel", this.onTouchCancel)
  }

  public destroy() {
    const { element } = this
    element.removeEventListener("touchstart", this.onTouchStart)
    element.removeEventListener("touchmove", this.onTouchMove)
    element.removeEventListener("touchend", this.onTouchEnd)
    element.removeEventListener("touchcancel", this.onTouchCancel)
  }

  // 这儿super.addListener是一个重载函数, 识别不了复合变量(tag: RegExp | EventTag), vscode总报错, 勉强这么搞了, 如有大佬修复最好
  // 其实功能和super.addListener一模一样, 只是将接口进行了一定的类型限制
  public addListener: HandleEventListener = (tag: RegExp | EventTag, handler: EventHandler) => {
    if (tag instanceof RegExp) {
      super.addListener(tag, handler)
    } else {
      super.addListener(tag, handler)
    }
    return this
  }

  public removeListener: HandleEventListener = (tag: RegExp | EventTag, handler: EventHandler) => {
    if (tag instanceof RegExp) {
      super.removeListener(tag, handler)
    } else {
      super.removeListener(tag, handler)
    }
    return this
  }

  public addOnceListener: HandleEventListener = (tag: RegExp | EventTag, handler: EventHandler) => {
    if (tag instanceof RegExp) {
      super.addOnceListener(tag, handler)
    } else {
      super.addOnceListener(tag, handler)
    }
    return this
  }

  public defineEvent(tag: EventTag) {
    super.defineEvent(tag)
    return this
  }

  public defineEvents(tags: EventTag[]) {
    super.defineEvents(tags)
    return this
  }

  public addListeners: HandleEventListeners = (tag: RegExp | EventTag | MultipleEvents, handlers?: EventHandler[]) => {
    if (tag instanceof RegExp) {
      super.addListeners(tag, handlers as EventHandler[])
    } else if (tag instanceof Object) {
      super.addListeners(tag)
    } else {
      super.addListeners(tag, handlers as EventHandler[])
    }
    return this
  }

  public removeListeners: HandleEventListeners = (tag: RegExp | EventTag | MultipleEvents, handlers?: EventHandler[]) => {
    if (tag instanceof RegExp) {
      super.removeListeners(tag, handlers as EventHandler[])
    } else if (tag instanceof Object) {
      super.removeListeners(tag)
    } else {
      super.removeListeners(tag, handlers as EventHandler[])
    }
    return this
  }

  public manipulateListeners: ManipulateEventListeners = (doRemove: boolean, tag: RegExp | EventTag | MultipleEvents, handlers?: EventHandler[]) => {
    if (tag instanceof RegExp) {
      super.manipulateListeners(doRemove, tag, handlers as EventHandler[])
    } else if (tag instanceof Object) {
      super.manipulateListeners(doRemove, tag)
    } else {
      super.manipulateListeners(doRemove, tag, handlers as EventHandler[])
    }
    return this
  }

  public emitEvent: EmitEvent = (tag: RegExp | EventTag, args: EmitArgs) => {
    if (tag instanceof RegExp) {
      super.emitEvent(tag, args)
    } else {
      super.emitEvent(tag, args)
    }
    return this
  }

  public emit: Emit = (tag: RegExp | EventTag, ...args: EmitArgs) => {
    if (tag instanceof RegExp) {
      super.emit(tag, ...args)
    } else {
      super.emit(tag, ...args)
    }
    return this
  }

  public removeEvent: {
    (tag?: EventTag): EventEmitter;
    (tag?: RegExp): EventEmitter;
  } = (tag?: RegExp | EventTag) => {
    if (tag instanceof RegExp) {
      super.removeEvent(tag)
    } else {
      super.removeEvent(tag)
    }
    return this
  }

  public on = this.addListener

  public once = this.addOnceListener

  public off = this.removeListener

  public trigger = this.emitEvent

  public removeAllListeners = this.removeEvent
}
