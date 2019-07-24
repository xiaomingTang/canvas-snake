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
type SwipeEventHandler = (e: TouchEvent, dir: Dir) => void
type EventHandler = TapEventHandler | SwipeEventHandler

interface AddEventListener {
  (tag: TapEventTag, handler: TapEventHandler): EventEmitter;
  (tag: SwipeEventTag, handler: SwipeEventHandler): EventEmitter;
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
    if (e.touches.length === 1) {
      this.tapAble = true
      const { clientX, clientY } = e.touches[0]
      this.startPoint.set(clientX, clientY)
    }
  }

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 1) {
      this.tapAble = false
      const { clientX, clientY } = e.touches[0]
      this.curPoint.set(clientX, clientY)
      const { direction, length } = this.detPoint
      if (length > this.minLen) {
        this.startPoint.set(clientX, clientY)
        this.dispatchEvent("swipe", [e, direction])
      }
    }
  }

  private onTouchCancel = () => {
    this.startPoint.clear()
    this.curPoint.clear()
  }

  private onTouchEnd = (e: TouchEvent) => {
    if (e.changedTouches.length === 1) {
      const { clientX, clientY } = e.changedTouches[0]
      this.curPoint.set(clientX, clientY)
      const { direction, length } = this.detPoint
      if (length > this.minLen) {
        this.dispatchEvent("swipe", [e, direction])
      } else if (this.tapAble && this.startPoint.approEqual(this.curPoint, this.approVal)) {
        this.dispatchEvent("tap", [e])
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

  public addEventListener = ((tag: EventTag, handler: EventHandler) => {
    super.addListener(tag, handler)
    return this
  }) as AddEventListener

  private dispatchEvent(tag: EventTag, data: unknown[]) {
    this.emitEvent(tag, data)
  }
}
