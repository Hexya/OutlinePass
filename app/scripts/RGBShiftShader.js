/**
 * @author Felix Turner | http://airtight.cc/
 * @author Tom Butterworth | http://kriss.cx/tom/
 *
 * RGB Shift Shader
 * Ported from http://kriss.cx/tom/2009/05/rgb-shift/
 */

 THREE.RGBShiftShader = {

	uniforms: {

		"tDiffuse": { type: "t", value: null },
		"angle":  { type: "f", value: 0.0 }, //radians
		"amount":  { type: "f", value: 0.01 } // 1 is width of screen

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform float angle;",
		"uniform float amount;",
		"varying vec2 vUv;",

		"void main() {",

			"vec2 offset = vec2(amount * cos(angle), amount * sin(angle));",
			"vec4 cr = texture2D(tDiffuse, vUv + offset);",
			"vec4 cg = texture2D(tDiffuse, vUv);",
			"vec4 cb = texture2D(tDiffuse, vUv - offset);",
			"gl_FragColor = vec4(cr.r, cg.g, cb.b, 1.0);",

		"}"

	].join("\n")

};