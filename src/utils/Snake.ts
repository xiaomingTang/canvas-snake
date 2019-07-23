import * as React from "react"
import { Dir, DefaultEnableSelfCollision, DefaultEnableBorderCollision, DefaultFoodNumber, Coords, GridType, GridStylesMap } from "@Src/utils/constants"

interface LineProps {
  ctx: CanvasRenderingContext2D;
  start: Coords;
  end: Coords;
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

export class GridItem {
  public constructor(
    public uw: number, // unitWidth
    public uh: number, // unitHeight
    public xn: number, // x方向网格总数
    public yn: number, // y方向网格总数
    public xi: number, // x坐标
    public yi: number, // y坐标
    public type: GridType,
  ) {}

  public static getOrderFromGrid(xn: number, yn: number, xi: number, yi: number) {
    return yi * xn + xi
  }

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
}

export class Snake {
  public static DefaultDir = Dir.None;

  public state:
      0 // 失败
    | 1 // 进行中
    | 2 // 通关
    = 1;

  public enableSelfCollision = DefaultEnableSelfCollision;

  public enableBorderCollision = DefaultEnableBorderCollision;

  public foodNumber = DefaultFoodNumber; // 后期加上多食物功能

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
      this.food = [0, 0]
      this.grids = this.nullGrids
      this.mapToGrids()
      this.randomSetFoodFromGrids()
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
    this.state = 1
    this.curDir = Snake.DefaultDir
    this.rawBody = [[0, 0]]
    this.food = [0, 0]
    this.mapToGrids()
    this.randomSetFoodFromGrids()
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
      }
    } else if (this.checkIfCollideFood(this.food)) {
      this.rawBody.push(tail)
      this.mapToGrids()
      if (this.rawBody.length === this.grids.length) {
        this.state = 2
        Modal.success({
          title: "过关",
          content: <React.Fragment>
            <div>哦，牛批</div>
            <div>那你是真的牛批</div>
          </React.Fragment>,
          okText: "好的",
          onOk: () => {
            this.reinit()
            this.render()
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
        </React.Fragment>,
        okText: "好的",
        onOk: () => {
          this.reinit()
          this.render()
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
        if (!this.enableBorderCollision) { this.state = 0 }
      } else if (x > this.xn - 1) {
        rawItem[0] = 0
        if (!this.enableBorderCollision) { this.state = 0 }
      }

      if (y < 0) {
        rawItem[1] = this.yn - 1
        if (!this.enableBorderCollision) { this.state = 0 }
      } else if (y > this.yn - 1) {
        rawItem[1] = 0
        if (!this.enableBorderCollision) { this.state = 0 }
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

  public render() {
    this.grids.forEach((gridItem) => {
      gridItem.render(this.ctx)
    })
  }
}
