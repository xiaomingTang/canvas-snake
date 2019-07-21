attribute vec2 a_position;
uniform vec2 u_resolution;
varying vec2 v_texcoord;

void main() {
  vec2 texcoord = vec2(
    a_position.x / u_resolution.x * 2.0 - 1.0,
    -(a_position.y / u_resolution.y * 2.0 - 1.0)
  );

  gl_Position = vec4(
    texcoord,
    1.0,
    1.0
  );

  v_texcoord = texcoord;
}
