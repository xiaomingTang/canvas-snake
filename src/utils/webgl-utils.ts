export function createGLShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) {
    return null
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (success) {
    return shader
  }

  console.warn(gl.getShaderInfoLog(shader))
  gl.deleteShader(shader)
  return null
}

export function createGLProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader | null, fragmentShader: WebGLShader | null) {
  const program = gl.createProgram()
  if (!(program && vertexShader && fragmentShader)) {
    return null
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  const success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (success) {
    return program
  }

  console.warn(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
  return null
}

/* eslint-disable no-param-reassign */
export function resizeToDisplaySize(canvas: HTMLCanvasElement, doSetDevicePixelRatio = true) {
  const realToCSSPixels = doSetDevicePixelRatio ? window.devicePixelRatio : 1
  const { clientWidth, clientHeight } = canvas
  const [width, height] = [
    clientWidth * realToCSSPixels,
    clientHeight * realToCSSPixels,
  ]
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width
    canvas.height = height
  }
}
/* eslint-enable no-param-reassign */
