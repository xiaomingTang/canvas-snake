export enum Dir {
  None = 0,
  Left = 2,
  Right = -2,
  Top = 3,
  Bottom = -3,
}

export type Coords = [number, number]

export enum GridType {
  Null = 0,
  Body = 1,
  Head = 2,
  Food = 3,
  Border = 4,
}

export const GridStylesMap: { [key in GridType]: string; } = {
  [GridType.Null]: "#ffffff",
  [GridType.Body]: "#000000",
  [GridType.Head]: "#ff0000",
  [GridType.Food]: "#66aaaa",
  [GridType.Border]: "#dddddd",
}

export const KeysMap = {
  Space: 32,

  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,

  A: 97,
  W: 119,
  D: 100,
  S: 115,

  Num4: 52,
  Num8: 56,
  Num6: 54,
  Num5: 53,
}

export const keyCodeMapToDir: { [key in number]: Dir; } = {
  [KeysMap.ArrowLeft]: Dir.Left, // LEFT
  [KeysMap.ArrowUp]: Dir.Top, // UP
  [KeysMap.ArrowRight]: Dir.Right, // RIGHT
  [KeysMap.ArrowDown]: Dir.Bottom, // DOWN

  [KeysMap.A]: Dir.Left, // A
  [KeysMap.W]: Dir.Top, // W
  [KeysMap.D]: Dir.Right, // D
  [KeysMap.S]: Dir.Bottom, // S

  [KeysMap.Num4]: Dir.Left, // 小键盘4
  [KeysMap.Num8]: Dir.Top, // 小键盘8
  [KeysMap.Num6]: Dir.Right, // 小键盘6
  [KeysMap.Num5]: Dir.Bottom, // 小键盘5
}

export const DefaultEnableSelfCollision = true
export const DefaultEnableBorderCollision = true
export const DefaultSpeed = 5
export const DefaultGridLevel = 5
export const DefaultFoodNumber = 1

export const BackCanvas = document.querySelector("#canvas-background") as HTMLCanvasElement
export const BackCtx = BackCanvas.getContext("2d") as CanvasRenderingContext2D
export const ForeCanvas = document.querySelector("#canvas-foreground") as HTMLCanvasElement
export const ForeCtx = ForeCanvas.getContext("2d") as CanvasRenderingContext2D
