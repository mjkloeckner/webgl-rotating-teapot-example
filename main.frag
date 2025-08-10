precision mediump float;
varying vec3 v_normal;

uniform vec3 u_light_dir;
uniform vec3 u_light_color;
uniform vec3 u_ambient_color;
uniform vec3 u_object_color;

void main(void) {
    float diff = max(dot(v_normal, normalize(u_light_dir)), 0.0);
    vec3 ambient = u_ambient_color * u_object_color;
    vec3 diffuse = diff * u_object_color;

    gl_FragColor = vec4(ambient + diffuse, 1.0);
}
