// 1. 成绩系统
// 2. 整体优化
import * as React from "react"
import {
  Button, Slider, Switch, Modal, message,
} from "antd"

import { Poper } from "@Src/components/Poper/index"
import { resizeToDisplaySize } from "@Src/utils/webgl-utils"
import { nonActiveState } from "@Src/utils/index"
import TouchPolyfill, { Dir as SwipeDir } from "@Src/utils/touch-polyfill"

import * as Styles from "./index.module.scss"

const scoreElem = document.querySelector("#score") as HTMLDivElement
const container = document.querySelector("#canvas-container") as HTMLDivElement
const backCanvas = document.querySelector("#canvas-background") as HTMLCanvasElement
const backCtx = backCanvas.getContext("2d") as CanvasRenderingContext2D
const foreCanvas = document.querySelector("#canvas-foreground") as HTMLCanvasElement
const foreCtx = foreCanvas.getContext("2d") as CanvasRenderingContext2D

const [wrapedEnableSelfCollision, setWrapedEnableSelfCollision] = nonActiveState(true)
const [wrapedEnableBorderCollision, setWrapedEnableBorderCollision] = nonActiveState(true)
const [wrapedSpeed, setWrapedSpeed] = nonActiveState(5)
const [wrapedGridLevel, setWrapedGridLevel, addGridLevelChangedListener] = nonActiveState(5)
const [wrapedPaused, setWrapedPaused] = nonActiveState(true)

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
  [GridType.Body]: "#666666",
  [GridType.Head]: "#ff3333",
  [GridType.Food]: "#66aaaa",
  [GridType.Border]: "#eeeeee",
}

enum Dir {
  None = 0,
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

  public resize(
    uw: number, // unitWidth
    uh: number, // unitHeight
    xn: number, // x方向网格总数
    yn: number, // y方向网格总数
  ) {
    this.uw = uw
    this.uh = uh
    this.xn = xn
    this.yn = yn
  }

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
    for (let j = 0; j <= this.yn; j += 1) {
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
  public static DefaultDir = Dir.None;

  public rawScore = 0;

  public state:
      0 // 失败
    | 1 // 进行中
    | 2 // 通关
    = 1;

  public food: Coords;

  public grids: GridItem[];

  public constructor(
    public ctx: CanvasRenderingContext2D,
    public uw: number, // unitWidth
    public uh: number, // unitHeight
    public xn: number, // x方向网格总数
    public yn: number, // y方向网格总数
    public rawBody: Coords[] = [[0, 0]],
    public curDir: Dir = Snake.DefaultDir,
  ) {
    this.grids = this.nullGrids
    this.mapToGrids()
    // this.randomSetFoodFromGrids方法中已经初始化this.food了
    // 本来这里是可以不用赋值的
    // 只不过为了满足ts的语法规范, 勉强在这里赋一下值吧
    this.food = this.randomSetFoodFromGrids()
  }

  public resize(
    uw: number,
    uh: number,
    xn: number,
    yn: number,
  ) {
    this.uw = uw
    this.uh = uh

    // 如果网格数发生了变化, 那就需要重新初始化了
    if (!(xn === this.xn && yn === this.yn)) {
      this.xn = xn
      this.yn = yn
      const gridType = this.grids[0].type
      this.grids = this.nullGrids
      this.setFood(0, 0)
      this.mapToGrids()
      this.randomSetFoodFromGrids()
      this.mapToGrid([0, 0], gridType)
      this.mapToGrid(this.food, GridType.Food)
      this.render()
    } else {
      /* eslint-disable no-param-reassign */
      this.grids.forEach((gridItem) => {
        gridItem.uw = uw
        gridItem.uh = uh
      })
      /* eslint-enable no-param-reassign */
    }
  }

  public reinit() {
    this.score = 0
    this.state = 1
    this.curDir = Snake.DefaultDir
    this.rawBody = [[0, 0]]
    const gridType = GridType.Head
    this.setFood(0, 0)
    this.mapToGrids()
    this.randomSetFoodFromGrids()
    this.mapToGrid([0, 0], gridType)
    this.mapToGrid(this.food, GridType.Food)
    this.render()
  }

  public get score() {
    return this.rawScore
  }

  public set score(val: number) {
    this.rawScore = val
    scoreElem.innerText = `score: ${val}`
  }

  public get nullGrids() {
    const {
      uw, uh, xn, yn,
    } = this
    const grids = [] as GridItem[]
    for (let j = 0; j < yn; j += 1) {
      for (let i = 0; i < xn; i += 1) {
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

  /* eslint-disable class-methods-use-this */
  public get enableSelfCollision() {
    return wrapedEnableSelfCollision.value
  }

  public get enableBorderCollision() {
    return wrapedEnableBorderCollision.value
  }
  /* eslint-enable class-methods-use-this */

  public randomSetFoodFromGrids() {
    const nullGrids = this.grids.filter(gridItem => gridItem.type === GridType.Null)
    const { length } = nullGrids
    const i = Math.floor(Math.random() * length)
    const foodGrid = nullGrids[i].clone()
    const { xi, yi } = foodGrid
    this.setFood(xi, yi)
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
    if (this.checkIfCollideBody()) {
      console.error("撞自己身上了")
      if (!this.enableSelfCollision) {
        this.state = 0
        setWrapedPaused(true)
      }
    } else if (this.checkIfCollideFood(this.food)) {
      this.score += 1
      this.rawBody.push(tail)
      this.mapToGrids()
      if (this.rawBody.length === this.grids.length) {
        this.state = 2
        setWrapedPaused(true)
        Modal.success({
          title: "过关",
          content: <React.Fragment>
            <div>哦，牛批</div>
            <div>那你是真的牛批</div>
            <br />
            <div>得分: {this.score}</div>
          </React.Fragment>,
          okText: "好的",
          onOk: () => {
            this.reinit()
          },
        })
      } else {
        this.randomSetFoodFromGrids()
      }
    }
    this.mapToGrids()
    if (this.state === 0) {
      Modal.error({
        title: "失败",
        content: <React.Fragment>
          <div>胜败乃兵家常事</div>
          <div>少侠请重新来过</div>
          <br />
          <div>得分: {this.score}</div>
        </React.Fragment>,
        okText: "好的",
        onOk: () => {
          this.reinit()
        },
      })
    }
  }

  public setFood(i: number, j: number) {
    if (this.food) {
      this.food[0] = i
      this.food[1] = j
    } else {
      this.food = [i, j]
    }
    this.grids[GridItem.getOrderFromGrid(this.xn, this.yn, i, j)].type = GridType.Food
  }

  // 当允许循环(没有墙)时, 修正this.rawBody
  public correct() {
    /* eslint-disable no-param-reassign */
    this.rawBody.forEach((rawItem) => {
      const [x, y] = rawItem
      if (x < 0) {
        rawItem[0] = this.xn - 1
        if (!this.enableBorderCollision) {
          this.state = 0
          setWrapedPaused(true)
        }
      } else if (x > this.xn - 1) {
        rawItem[0] = 0
        if (!this.enableBorderCollision) {
          this.state = 0
          setWrapedPaused(true)
        }
      }

      if (y < 0) {
        rawItem[1] = this.yn - 1
        if (!this.enableBorderCollision) {
          this.state = 0
          setWrapedPaused(true)
        }
      } else if (y > this.yn - 1) {
        rawItem[1] = 0
        if (!this.enableBorderCollision) {
          this.state = 0
          setWrapedPaused(true)
        }
      }
    })
    /* eslint-enable no-param-reassign */
  }

  public checkIfCollideBody() {
    return !!this.restBody.find(item => (
      item[0] === this.head[0] && item[1] === this.head[1]
    ))
  }

  public checkIfCollideFood(food: Coords) {
    const head = this.rawBody[0]
    return food[0] === head[0] && food[1] === head[1]
  }

  public mapToGrid(coords: Coords, type: GridType) {
    const {
      grids, xn, yn,
    } = this
    const [i, j] = coords
    const n = GridItem.getOrderFromGrid(xn, yn, i, j)
    const grid = grids[n]
    if (grid) {
      grid.type = type
      return true
    }
    return false
  }

  // 将当前的this.rawBody的状态映射到_grids中
  public mapToGrids() {
    const {
      head, restBody, grids, food,
    } = this

    grids.forEach((gridItem) => {
      // eslint-disable-next-line no-param-reassign
      gridItem.type = GridType.Null
    })

    // food必须在body前面, 先map
    // 因为reinit的时候
    if (food) {
      this.mapToGrid(food, GridType.Food)
    }

    for (let k = 0, len = restBody.length; k < len; k += 1) {
      const result = this.mapToGrid(restBody[k], GridType.Body)
      if (!result) {
        message.error("数组越界了, 已重新开局。")
        this.reinit()
        return
      }
    }

    const result = this.mapToGrid(head, GridType.Head)
    if (!result) {
      message.error("数组越界了, 已重新开局。")
      this.reinit()
    }
  }

  public render() {
    this.grids.forEach((gridItem) => {
      gridItem.render(this.ctx)
    })
  }
}

// 必须先将canvas resize到相应的尺寸, 然后再取width/height
resizeToDisplaySize(backCanvas)
resizeToDisplaySize(foreCanvas)

const { width: defaultWidth, height: defaultHeight } = backCanvas
let globalXN = 25
let globalYN = 25
let globalUW = defaultWidth / globalXN
let globalUH = defaultHeight / globalYN
let lastTime = new Date().getTime()

const snake = new Snake(foreCtx, globalUW, globalUH, globalXN, globalYN)
const gridBorder = new GridBorder(globalUW, globalUH, globalXN, globalYN, 1)

addGridLevelChangedListener((oldVal, newVal) => {
  const { width, height } = backCanvas
  globalXN = 2 + 3 * newVal
  globalUW = width / globalXN
  globalUH = globalUW
  globalYN = Math.floor(height / globalUH)

  foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height)
  backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height)

  snake.resize(globalUW, globalUH, globalXN, globalYN)
  gridBorder.resize(globalUW, globalUH, globalXN, globalYN)

  snake.render()
  gridBorder.render(backCtx)
})

const initCanvas = function initCanvas() {
  resizeToDisplaySize(backCanvas)
  resizeToDisplaySize(foreCanvas)
  const { width, height } = backCanvas
  const uw = width / globalXN
  const uh = height / globalYN
  snake.resize(uw, uh, snake.xn, snake.yn)
  gridBorder.resize(uw, uh, snake.xn, snake.yn)
  snake.render()
  gridBorder.render(backCtx)
}

const run = () => {
  const curTime = new Date().getTime()
  if (curTime - lastTime > 1000 / wrapedSpeed.value) {
    snake.moveOneStep()
    lastTime = curTime
    if (snake.state !== 1) {
      setWrapedPaused(true)
    }
  }
  foreCtx.clearRect(0, 0, foreCanvas.width, foreCanvas.height)
  snake.render()
}

const animate = () => {
  if (!wrapedPaused.value) {
    run()
  }
  window.requestAnimationFrame(animate)
}

const onKeyDown = function onKeyDown(e: KeyboardEvent) {
  const { keyCode } = e
  if (keyCode === 32) {
    setWrapedPaused(!wrapedPaused.value)
    if (snake.curDir === Dir.None) {
      snake.curDir = Dir.Right
    }
    return
  }
  const dir = keyCodeMapToDir[keyCode]
  if (dir && snake.validateTurn(dir)) {
    setWrapedPaused(false)
    snake.curDir = dir
    snake.moveOneStep()
    lastTime = new Date().getTime()
    animate()
  }
}

const ee = new TouchPolyfill(container)
let lastDir: Dir = Dir.None
const swipeDirMap: {
  [key in SwipeDir]?: Dir.Left | Dir.Right | Dir.Top | Dir.Bottom
} = {
  Bottom: Dir.Bottom,
  Left: Dir.Left,
  Top: Dir.Top,
  Right: Dir.Right,
}

ee.addEventListener("tap", () => {
  setWrapedPaused(!wrapedPaused.value)
  if (snake.curDir === Dir.None) {
    snake.curDir = Dir.Right
  }
  lastDir = Dir.None
})

ee.addEventListener("swipe", (e, swipeDir) => {
  const dir = swipeDirMap[swipeDir]
  if (dir && dir !== lastDir && snake.validateTurn(dir)) {
    lastDir = dir
    setWrapedPaused(false)
    snake.curDir = dir
    snake.moveOneStep()
    lastTime = new Date().getTime()
    animate()
  }
})

container.addEventListener("touchstart", e => e.preventDefault())

window.addEventListener("resize", initCanvas)
window.addEventListener("keydown", onKeyDown)

initCanvas()
setWrapedSpeed(5)
setWrapedGridLevel(5)
animate()

const { useState } = React

export default function App() {
  const [poperVisible, setPoperVisible] = useState(false)

  React.useEffect(() => {
    Modal.info({
      maskClosable: false,
      title: "操作指南",
      content: <React.Fragment>
        <h3>0. 右上角有设置按钮</h3>
        <h3>1. 移动端:</h3>
        <ul>
          <li>单击画布切换【暂停/开始】</li>
          <li>上下左右滑动控制方向</li>
        </ul>
        <h3>2. PC端:</h3>
        <ul>
          <li>Space键切换【暂停/开始】</li>
          <li>方向键、【WASD】键或小键盘【8456】均可以控制方向</li>
        </ul>
      </React.Fragment>,
    })
  }, [])

  React.useEffect(() => {
    if (poperVisible) {
      setWrapedPaused(true)
    }
  }, [poperVisible])

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
      <div style={{ padding: "1em" }}>
        <div className={Styles.settingItem}>
          <span className={Styles.label}>允许碰撞自身</span>
          <Switch defaultChecked={snake.enableSelfCollision} onChange={setWrapedEnableSelfCollision} />
        </div>

        <div className={Styles.settingItem}>
          <span className={Styles.label}>允许碰撞墙壁</span>
          <Switch defaultChecked={snake.enableBorderCollision} onChange={setWrapedEnableBorderCollision} />
        </div>

        <div className={Styles.settingItem}>
          <span className={Styles.label}>速度(level)</span>
          <div className={Styles.controlWrapper}>
            <div className={`${Styles.absLeft} ${Styles.abs}`}>1</div>
            <Slider defaultValue={wrapedSpeed.value} min={1} max={10} onChange={(value) => {
              setWrapedSpeed(value as number)
            }} />
            <div className={`${Styles.absRight} ${Styles.abs}`}>10</div>
          </div>
        </div>

        <div className={Styles.settingItem}>
          <span className={Styles.label}>网格数(level)</span>
          <div className={Styles.controlWrapper}>
            <div className={`${Styles.absLeft} ${Styles.abs}`}>1</div>
            <Slider defaultValue={wrapedGridLevel.value} min={1} max={10} onChange={(value) => {
              setWrapedGridLevel(value as number)
            }} />
            <div className={`${Styles.absRight} ${Styles.abs}`}>10</div>
          </div>
        </div>
      </div>
    </Poper>
  </div>
}
