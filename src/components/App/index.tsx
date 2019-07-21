// 1. 成绩系统
// 2. 判定是否完成
// 3. 判定是否碰壁、碰自身等
// 4. 整体优化
import React from "react"

import { resizeToDisplaySize } from "@Src/utils/webgl-utils"

enum Dir {
  Left = 2,
  Right = -2,
  Top = 3,
  Bottom = -3,
}

const keyCodeMapToDir: { [key in number]: Dir; } = {
  37: Dir.Left, // LEFT
  38: Dir.Top, // UP
  39: Dir.Right, // RIGHT
  40: Dir.Bottom, // DOWN

  97: Dir.Left, // A
  119: Dir.Top, // W
  100: Dir.Right, // D
  115: Dir.Bottom, // S

  52: Dir.Left, // 小键盘4
  56: Dir.Top, // 小键盘8
  54: Dir.Right, // 小键盘6
  53: Dir.Bottom, // 小键盘5
}

type rawBodyItem = [number, number]
type Grids = number[]

interface LineProps {
  ctx: CanvasRenderingContext2D;
  start: [number, number];
  end: [number, number];
  lineWidth: number;
  color: string;
}

function drawLine({
  ctx, start, end, lineWidth, color,
}: LineProps) {
  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = color
  ctx.moveTo(...start)
  ctx.lineTo(...end)
  ctx.closePath()
  ctx.stroke()
}

const backCanvas = document.querySelector("#canvas-background") as HTMLCanvasElement
const backCtx = backCanvas.getContext("2d") as CanvasRenderingContext2D
const foreCanvas = document.querySelector("#canvas-foreground") as HTMLCanvasElement
const foreCtx = foreCanvas.getContext("2d") as CanvasRenderingContext2D

const { clientWidth: defaultWidth, clientHeight: defaultHeight } = backCanvas
const NX = 5
const NY = 5
const UW = defaultWidth / NX
const UH = defaultHeight / NY

class Square {
  public constructor(
    public x0: number,
    public y0: number,
    public width: number,
    public height: number,
    public color: string = "#000000",
  ) {}

  public render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color
    ctx.fillRect(this.x0, this.y0, this.width, this.height)
  }

  public clear(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(this.x0, this.y0, this.width, this.height)
  }
}

class Food {
  public constructor(
    public unitWidth: number,
    public unitHeight: number,
    public xn: number,
    public yn: number,
    public x: number = 0,
    public y: number = 0,
  ) {}

  public randomGeneFromGrids(grids: Grids) {
    const temp = grids.map((item, i) => [!item, i]).filter(([item, i]) => item) as [boolean, number][]
    const { length } = temp
    const i = Math.floor(Math.random() * length)
    const k = temp[i][1]
    this.x = k % this.xn
    this.y = Math.floor(k / this.yn)
  }

  public render(ctx: CanvasRenderingContext2D) {
    const { x, y } = this
    const foodSquare = new Square(this.unitWidth * x, this.unitHeight * y, this.unitWidth, this.unitHeight, "pink")
    foodSquare.render(ctx)
  }
}

class Snake {
  public grids: Grids;

  public lastTail: rawBodyItem = [0, 0];

  public food: Food = new Food(UW, UH, NX, NY)

  public constructor(
    public unitWidth: number,
    public unitHeight: number,
    public xn: number,
    public yn: number,
    public rawBody: rawBodyItem[] = [[0, 0]],
    public curDir: Dir = Dir.Right,
  ) {
    this.grids = Array(...Array(xn * yn)).map(() => 0)
    this.mapToGrids()
    this.food.randomGeneFromGrids(this.grids)
  }

  public validateTurning(dir: Dir) {
    return dir !== -this.curDir
  }

  public moveOneStep(dir: Dir = this.curDir) {
    const [headX, headY] = this.rawBody[0]
    const newHead: rawBodyItem = [headX, headY]
    switch (dir) {
    case Dir.Left:
      newHead[0] = headX - 1
      break
    case Dir.Right:
      newHead[0] = headX + 1
      break
    case Dir.Top:
      newHead[1] = headY - 1
      break
    case Dir.Bottom:
      newHead[1] = headY + 1
      break
    default:
      return undefined
    }
    this.rawBody.unshift(newHead)
    this.correct()
    const tail = this.rawBody.pop() as rawBodyItem
    if (this.checkIfCrashBody()) {
      console.error("撞自己身上了")
    } else if (this.checkIfCrashFood([this.food.x, this.food.y])) {
      this.mapToGrids()
      this.food.randomGeneFromGrids(this.grids)
      this.rawBody.push(tail)
    }
    return undefined
  }

  public turnTo(dir: Dir) {
    this.curDir = dir
  }

  public correct() {
    /* eslint-disable no-param-reassign */
    this.rawBody.forEach((rawItem) => {
      const [x, y] = rawItem
      if (x < 0) {
        rawItem[0] = this.xn - 1
      } else if (x > this.xn - 1) {
        rawItem[0] = 0
      }

      if (y < 0) {
        rawItem[1] = this.yn - 1
      } else if (y > this.yn - 1) {
        rawItem[1] = 0
      }
    })
    /* eslint-enable no-param-reassign */
  }

  public checkIfCrashBody() {
    const [head, ...restBody] = this.rawBody
    return !!restBody.find(item => (
      item[0] === head[0] && item[1] === head[1]
    ))
  }

  public checkIfCrashFood(food: rawBodyItem) {
    const head = this.rawBody[0]
    return food[0] === head[0] && food[1] === head[1]
  }

  // 将当前的this.rawBody的状态映射到_grids中
  public mapToGrids() {
    const [head, ...restBody] = this.rawBody
    const { grids } = this

    grids.forEach((_, k) => {
      grids[k] = 0 // 将所有元素全部置0
    })

    restBody.forEach(([i, j]) => {
      const n = j * this.xn + i
      grids[n] = 1 // 普通body元素置1
    })

    const [i, j] = head
    const n = j * this.xn + i
    grids[n] = 2 // head元素置2
  }

  public render(ctx: CanvasRenderingContext2D) {
    const body = this.rawBody.map(([i, j]) => new Square(this.unitWidth * i, this.unitHeight * j, this.unitWidth, this.unitHeight))
    const [head, ...restBody] = body
    restBody.forEach(item => item.render(ctx))
    head.color = "red"
    head.render(ctx)
  }
}

class Grid {
  public constructor(
    public unitWidth: number,
    public unitHeight: number,
    public x: number,
    public y: number,
    public lineWidth: number,
    public color: string,
  ) {}

  public render(ctx: CanvasRenderingContext2D) {
    const width = this.x * this.unitWidth
    const height = this.y * this.unitHeight
    for (let i = 0; i <= this.x; i += 1) {
      drawLine({
        ctx,
        start: [i * this.unitWidth, 0],
        end: [i * this.unitWidth, height],
        lineWidth: this.lineWidth,
        color: this.color,
      })
    }
    for (let j = 0; j <= this.y; j += 1) {
      drawLine({
        ctx,
        start: [0, j * this.unitHeight],
        end: [width, j * this.unitHeight],
        lineWidth: this.lineWidth,
        color: this.color,
      })
    }
  }
}

const grid = new Grid(UW, UH, NX, NY, 3, "#eeeeee")
const s = new Snake(UW, UH, NX, NY, undefined)
let lastTime = new Date().getTime()
const DURATION = 1000
let paused = false

const run = function run() {
  const curTime = new Date().getTime()
  if (curTime - lastTime > DURATION) {
    s.moveOneStep()
    lastTime = curTime
  }
  foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height)
  s.food.render(foreCtx)
  s.render(foreCtx)
}

const animate = function animate() {
  if (!paused) {
    run()
  }
  window.requestAnimationFrame(animate)
}

const initCanvas = function initCanvas() {
  const { clientWidth, clientHeight } = backCanvas
  grid.unitWidth = clientWidth / NX
  s.unitWidth = clientWidth / NX
  grid.unitHeight = clientHeight / NY
  s.unitHeight = clientHeight / NY
  resizeToDisplaySize(backCanvas)
  resizeToDisplaySize(foreCanvas)
  grid.render(backCtx)
  s.render(foreCtx)
}

const onKeyDown = function onKeyDown(e: KeyboardEvent) {
  const { keyCode } = e
  if (keyCode === 32) {
    paused = !paused
    return
  }
  const dir = keyCodeMapToDir[keyCode]
  if (dir && s.validateTurning(dir)) {
    s.turnTo(dir)
    s.moveOneStep()
    lastTime = new Date().getTime()
    run()
  }
}

window.addEventListener("resize", initCanvas)
window.addEventListener("keydown", onKeyDown)

initCanvas()
animate()

export default function App(): React.ReactElement<HTMLElement> {
  return <React.Fragment>
    nihao
  </React.Fragment>
}
