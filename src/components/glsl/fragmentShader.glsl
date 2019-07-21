precision mediump float;
varying vec2 v_texcoord;

void main() {
  gl_FragColor = vec4(v_texcoord, 0.5, 1.0);
}
