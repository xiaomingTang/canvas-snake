// 1. 成绩系统
// 2. 判定是否完成
// 3. 判定是否碰壁、碰自身等
// 4. 整体优化
import * as React from "react"
import { Button, Slider, Switch } from "antd"

import { Poper } from "@Src/components/Poper/index"
import { resizeToDisplaySize } from "@Src/utils/webgl-utils"

import * as Styles from "./index.module.scss"

type Coords = [number, number]

enum GridType {
  Null = 0,
  Body = 1,
  Head = 2,
  Food = 3,
  Border = 4,
}

const GridStylesMap: { [key in GridType]: string; } = {
  [GridType.Null]: "#ffffff",
  [GridType.Body]: "#000000",
  [GridType.Head]: "#ff0000",
  [GridType.Food]: "#66aaaa",
  [GridType.Border]: "#dddddd",
}

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

interface LineProps {
  ctx: CanvasRenderingContext2D;
  start: [number, number];
  end: [number, number];
  lineWidth: number;
  style: string;
}

function drawLine({
  ctx, start, end, lineWidth, style,
}: LineProps) {
  ctx.beginPath()
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = style
  ctx.moveTo(...start)
  ctx.lineTo(...end)
  ctx.closePath()
  ctx.stroke()
}

class GridBorder {
  public type: GridType = GridType.Border;

  public constructor(
    public uw: number, // unitWidth
    public uh: number, // unitHeight
    public xn: number, // x方向网格总数
    public yn: number, // y方向网格总数
    public lineWidth: number = 3,
  ) {}

  public get strokeStyle() {
    return GridStylesMap[this.type]
  }

  public get width() {
    return this.uw * this.xn
  }

  public get height() {
    return this.uh * this.yn
  }

  public render(ctx: CanvasRenderingContext2D) {
    const { width, height } = this
    for (let i = 0; i <= this.xn; i += 1) {
      drawLine({
        ctx,
        start: [i * this.uw, 0],
        end: [i * this.uw, height],
        lineWidth: this.lineWidth,
        style: this.strokeStyle,
      })
    }
    for (let j = 0; j <= this.xn; j += 1) {
      drawLine({
        ctx,
        start: [0, j * this.uh],
        end: [width, j * this.uh],
        lineWidth: this.lineWidth,
        style: this.strokeStyle,
      })
    }
  }
}

class GridItem {
  public constructor(
    public uw: number, // unitWidth
    public uh: number, // unitHeight
    public xn: number, // x方向网格总数
    public yn: number, // y方向网格总数
    public xi: number, // x坐标
    public yi: number, // y坐标
    public type: GridType,
  ) {}

  public get fillStyle() {
    return GridStylesMap[this.type]
  }

  public get order() {
    return this.yi * this.xn + this.xi
  }

  public get w0() {
    return this.xi * this.uw
  }

  public get h0() {
    return this.yi * this.uh
  }

  public render(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.fillStyle
    ctx.fillRect(this.w0, this.h0, this.uw, this.uh)
  }

  public clear(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(this.w0, this.h0, this.uw, this.uh)
  }

  public copy({
    uw, uh, xn, yn, xi, yi, type,
  }: GridItem) {
    this.uw = uw
    this.uh = uh
    this.xn = xn
    this.yn = yn
    this.xi = xi
    this.yi = yi
    this.type = type
  }

  public clone() {
    const {
      uw, uh, xn, yn, xi, yi, type,
    } = this
    return new GridItem(uw, uh, xn, yn, xi, yi, type)
  }

  public static getOrderFromGrid(xn: number, yn: number, xi: number, yi: number) {
    return yi * xn + xi
  }
}

class Snake {
  public food: Coords;

  public grids: GridItem[];

  public constructor(
    public uw: number, // unitWidth
    public uh: number, // unitHeight
    public xn: number, // x方向网格总数
    public yn: number, // y方向网格总数
    public rawBody: Coords[] = [[0, 0]],
    public curDir: Dir = Dir.Right,
  ) {
    this.grids = this.nullGrids
    this.mapToGrids()
    this.food = this.randomGeneFoodFromGrids()
  }

  public get nullGrids() {
    const {
      uw, uh, xn, yn,
    } = this
    const grids = [] as GridItem[]
    for (let j = 0; j < xn; j += 1) {
      for (let i = 0; i < yn; i += 1) {
        grids.push(new GridItem(uw, uh, xn, yn, i, j, GridType.Null))
      }
    }
    return grids
  }

  public get head() {
    return this.rawBody[0]
  }

  public get restBody() {
    const [_, ...restBody] = this.rawBody
    return restBody
  }

  public randomGeneFoodFromGrids() {
    const nullGrids = this.grids.filter(gridItem => gridItem.type === GridType.Null)
    const { length } = nullGrids
    const i = Math.floor(Math.random() * length)
    const foodGrid = nullGrids[i].clone()
    const { xi, yi } = foodGrid
    return [xi, yi] as Coords
  }

  public validateTurn(dir: Dir) {
    return dir !== -this.curDir
  }

  public moveOneStep(dir: Dir = this.curDir) {
    const [headX, headY] = this.head
    const newHead: Coords = [headX, headY]
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
      return
    }
    this.rawBody.unshift(newHead) // 将新的head推入body
    this.correct() // 修正rawBody
    const tail = this.rawBody.pop() as Coords
    if (this.checkIfCrashBody()) {
      console.error("撞自己身上了")
    } else if (this.checkIfCrashFood(this.food)) {
      this.rawBody.push(tail)
      this.mapToGrids()
      const newFood = this.randomGeneFoodFromGrids()
      this.setFood(...newFood)
    }
    this.mapToGrids()
  }

  public setFood(i: number, j: number) {
    this.food[0] = i
    this.food[1] = j
  }

  // 当允许循环(没有墙)时, 修正this.rawBody
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
    return !!this.restBody.find(item => (
      item[0] === this.head[0] && item[1] === this.head[1]
    ))
  }

  public checkIfCrashFood(food: Coords) {
    const head = this.rawBody[0]
    return food[0] === head[0] && food[1] === head[1]
  }

  // 将当前的this.rawBody的状态映射到_grids中
  public mapToGrids() {
    const {
      head, restBody, grids, xn, yn, food,
    } = this
    const { getOrderFromGrid } = GridItem

    grids.forEach((gridItem) => {
      // eslint-disable-next-line no-param-reassign
      gridItem.type = GridType.Null
    })

    restBody.forEach(([i, j]) => {
      const n = getOrderFromGrid(xn, yn, i, j)
      grids[n].type = GridType.Body
    })

    if (food) {
      const [i, j] = food
      const n = getOrderFromGrid(xn, yn, i, j)
      grids[n].type = GridType.Food
    }

    const [i, j] = head
    const n = getOrderFromGrid(xn, yn, i, j)
    grids[n].type = GridType.Head
  }

  public render(ctx: CanvasRenderingContext2D) {
    this.grids.forEach((gridItem) => {
      gridItem.render(ctx)
    })
  }
}

const backCanvas = document.querySelector("#canvas-background") as HTMLCanvasElement
const backCtx = backCanvas.getContext("2d") as CanvasRenderingContext2D
const foreCanvas = document.querySelector("#canvas-foreground") as HTMLCanvasElement
const foreCtx = foreCanvas.getContext("2d") as CanvasRenderingContext2D

const { clientWidth: defaultWidth, clientHeight: defaultHeight } = backCanvas
const XN = 25
const YN = 25
const UW = defaultWidth / XN
const UH = defaultHeight / YN
const DURATION = 500
let lastTime = new Date().getTime()
let paused = false

const snake = new Snake(UW, UH, XN, YN)
const gridBorder = new GridBorder(UW, UH, XN, YN, 2)

const initCanvas = function initCanvas() {
  const { clientWidth, clientHeight } = backCanvas
  const uw = clientWidth / XN
  const uh = clientHeight / YN
  snake.uw = uw
  snake.uh = uh
  gridBorder.uw = uw
  gridBorder.uh = uh
  /* eslint-disable no-param-reassign */
  snake.grids.forEach((gridItem) => {
    gridItem.uw = uw
    gridItem.uh = uh
  })
  /* eslint-enable no-param-reassign */
  resizeToDisplaySize(backCanvas)
  resizeToDisplaySize(foreCanvas)
  snake.render(foreCtx)
  gridBorder.render(backCtx)
}

const run = () => {
  const curTime = new Date().getTime()
  if (curTime - lastTime > DURATION) {
    snake.moveOneStep()
    lastTime = curTime
  }
  foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height)
  snake.render(foreCtx)
}

const animate = () => {
  if (!paused) {
    run()
  }
  window.requestAnimationFrame(animate)
}

const onKeyDown = function onKeyDown(e: KeyboardEvent) {
  const { keyCode } = e
  if (keyCode === 32) {
    paused = !paused
    return
  }
  const dir = keyCodeMapToDir[keyCode]
  if (dir && snake.validateTurn(dir)) {
    snake.curDir = dir
    snake.moveOneStep()
    lastTime = new Date().getTime()
    run()
  }
}

window.addEventListener("resize", initCanvas)
window.addEventListener("keydown", onKeyDown)

initCanvas()
animate()


export default function App() {
  const [poperVisible, setPoperVisible] = React.useState(false)
  return <div>
    <Button
      className={Styles.settingButton}
      type="ghost"
      icon="setting"
      onClick={() => {
        setPoperVisible(!poperVisible)
      }}
    />
    <Poper state={[poperVisible, setPoperVisible]}>
      <div>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>允许碰撞自身</span>
          <Switch defaultChecked />
        </div>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>允许碰撞墙壁</span>
          <Switch defaultChecked />
        </div>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>速度</span>
          <Slider className={`${Styles.target} ${Styles.block}`} defaultValue={30} min={10} max={100} />
        </div>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>网格数</span>
          <Slider className={`${Styles.target} ${Styles.block}`} defaultValue={30} min={10} max={100} step={10} />
        </div>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>同时存在食物数</span>
          <Slider className={`${Styles.target} ${Styles.block}`} defaultValue={30} min={10} max={100} step={10} />
        </div>
      </div>
    </Poper>
  </div>
}
