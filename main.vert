attribute vec3 a_pos;
attribute vec3 a_normal;

uniform mat3 u_normal_matrix;
uniform mat4 u_transform;

varying vec3 v_normal;

void main(void) {
    v_normal = normalize(u_normal_matrix * a_normal);
    gl_Position = u_transform*vec4(a_pos, 1.0);
}
