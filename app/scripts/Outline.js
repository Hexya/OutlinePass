import soundFile from '../assets/sound/tundra-beats.mp3';
import Sound from './Sound.js';
import pVertexShader from './shaders/PlaneShader/pVertex.vert';
import pFragmentShader from './shaders/PlaneShader/pFragment.frag';
let OrbitControls = require('three-orbit-controls')(THREE)
let Stats = require('stats-js')

import ScrollMagic from "ScrollMagic";
import { TweenMax, TimelineMax,TweenLite, TimelineLite , Animation} from "gsap"; // Also works with TweenLite and TimelineLite
import { ScrollMagicPluginGsap } from "scrollmagic-plugin-gsap";
ScrollMagicPluginGsap(ScrollMagic, TweenMax, TimelineMax);

import KaleidoShader from './KaleidoShader';
import RGBShiftShader from './RGBShiftShader';

import toon from '../assets/img/toon.png';

import 'three/examples/js/postprocessing/EffectComposer';
import 'three/examples/js/postprocessing/RenderPass';
import 'three/examples/js/postprocessing/ShaderPass';
import 'three/examples/js/postprocessing/OutlinePass';
import 'three/examples/js/shaders/CopyShader'

import 'three/examples/js/shaders/DotScreenShader'
import 'three/examples/js/shaders/LuminosityHighPassShader';
import 'three/examples/js/postprocessing/UnrealBloomPass';

import * as dat from 'dat.gui';

var composer,renderer;
var outlinePass;
var rgbParams, rgbPass;
var kaleidoParams, kaleidoPass;
var params = {
    exposure: 1,
    bloomStrength: 0.7,
    bloomThreshold: 0.9,
    bloomRadius: 0,
    rgbAngle: 0,
    rgbAmount: 0,
    kaleidoSides: .37,
    kaleidoAngle: 0
};


// TODO : add Dat.GUI
// TODO : add Stats

class LoadSound {

    constructor() {
        this.sound = new Sound(soundFile,125,0,this.startSound.bind(this),false)
    }
    startSound() {
        document.querySelector('.start-btn').addEventListener('click',()=> {
            document.querySelector('.home-container').classList.add('remove')
            document.querySelector('.warning').classList.add('remove')
            setTimeout(()=>{
                document.querySelector('.home-container').style.display = 'none';
                document.querySelector('.warning').style.display = 'none';
                this.sound.play();
            },1000)
    })
    }
}

export default class App {

    constructor() {
        
        this.cubic = [];
        this.velocity = [];
        this.rayon = .9;

            //Stats
            this.stats = new Stats();
            this.stats.setMode(0); // 0: fps, 1: ms

            //Gui
            const gui = new dat.GUI();
            gui.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {
                renderer.toneMappingExposure = Math.pow( value, 4.0 );
            } );
            gui.add( params, 'bloomThreshold', 0.0, 1.0 ).onChange( function ( value ) {
                bloomPass.threshold = Number( value );
            } );
            gui.add( params, 'bloomStrength', 0.0, 3.0 ).onChange( function ( value ) {
                bloomPass.strength = Number( value );
            } );
            gui.add( params, 'bloomRadius', 0.0, 1.0 ).step( 0.01 ).onChange( function ( value ) {
                bloomPass.radius = Number( value );
            } );

            gui.add( params, 'rgbAngle', 0.0, 360.0 ).step( 0.01 ).onChange( function ( value ) {
                rgbPass.uniforms[ "angle" ].value = Number( value ) * 3.1416;
            } );
            gui.add( params, 'rgbAmount', 0.0, 360.0 ).step( 0.01 ).onChange( function ( value ) {
                rgbPass.uniforms[ "amount" ].value = Number( value );
            } );
            gui.add( params, 'kaleidoSides', 0.0, 12.0 ).step( 0.01 ).onChange( function ( value ) {
                kaleidoPass.uniforms[ "sides" ].value = Number( value );
            } );
            gui.add( params, 'kaleidoAngle', 0.0, 360.0 ).step( 0.01 ).onChange( function ( value ) {
                kaleidoPass.uniforms[ "angle" ].value = Number( value ) * 3.1416;
            } );
            gui.closed = true 
            dat.GUI.toggleHide();
            
            document.addEventListener('keydown',(e)=> {
                if ( e.keyCode === 32) {
                    dat.GUI.toggleHide();
                }
            })
        this.play = new LoadSound();

        this.stats.domElement.style.position = 'absolute';
        this.stats.domElement.style.top = '0px';
        this.stats.domElement.style.left = '0px';
        // document.body.appendChild( this.stats.domElement );

        //THREE SCENE
        this.container = document.querySelector( '#main' );
    	document.body.appendChild( this.container );

        this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.1, 10 );

        this.camera.position.x = 0.3;
        this.camera.position.y = 0.3;
        this.camera.position.z = Math.pow(1.7, -17);
        this.camera.rotation.y = 2.3;
        this.camera.rotation.z = 1.5;
        this.camera.rotation.x = 1.5;
        
        // this.controls = new OrbitControls(this.camera)
        
        this.scene = new THREE.Scene();

        //LIGHT
            //Directional
            this.light = new THREE.DirectionalLight({color: 0x0000ff,intensity : 1})
            this.light.position.x = -0.5
            this.light.position.y = 0.8
            this.scene.add(this.light)

            //PointLight
            this.pointLight = new THREE.PointLight( 0x0ae0ff, 0, 2 );
            this.pointLight.position.set( 0, 0, 0 );
            var pointLightHelper = new THREE.PointLightHelper( this.pointLight, 2 );
            this.scene.add( this.pointLight );
            // this.scene.add( pointLightHelper );

            //PointSphere
            let geometrys = new THREE.SphereGeometry( 0.05, 20, 20 );
            let materials = new THREE.MeshBasicMaterial({color:0xffffff});
            this.sphereLight = new THREE.Mesh( geometrys, materials );

        //BACK PLANE
        this.pGeometry = new THREE.PlaneBufferGeometry(  window.innerWidth, window.innerHeight, 10 );

        this.uniforms = {
            uTime: { type: 'f', value: 0},
            uAmp: { type:'f', value: 2. },
        };

        this.pMaterial = new THREE.ShaderMaterial({
            transparent: true,
            uniforms: this.uniforms,
            vertexShader: pVertexShader,
            fragmentShader: pFragmentShader,
        });

        this.plane = new THREE.Mesh( this.pGeometry, this.pMaterial );
        this.plane.position.x = -3.45; //Z
        this.plane.rotation.y = 1.5;
        this.plane.position.z = 30;
        // this.scene.add( this.plane );


        //TORUS
        const threeTone = new THREE.TextureLoader().load(toon)
        threeTone.minFilter = THREE.NearestFilter;
        threeTone.magFilter = THREE.NearestFilter;
        let outlineMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, side: THREE.BackSide } );

        let geoTorus = new THREE.TorusKnotGeometry( 0.4, 0.05, 130,80 );
        let matTorus = new THREE.MeshToonMaterial({color:0x7868e6});
        matTorus.gradientMap = threeTone
        this.torus = new THREE.Mesh( geoTorus, matTorus );
        this.scene.add(this.torus)

        let geoTorusS = new THREE.TorusKnotGeometry( 0.15, 0.025, 200,150 );
        let matTorusS = new THREE.MeshToonMaterial({color:0xe4fbff});
        matTorusS.gradientMap = threeTone
        this.torusS = new THREE.Mesh( geoTorusS, matTorusS );
        this.scene.add(this.torusS)

        //RENDERER
    	this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    	this.renderer.setPixelRatio( window.devicePixelRatio );
    	this.renderer.setSize( window.innerWidth, window.innerHeight );
    	this.container.appendChild( this.renderer.domElement );
        this.renderer.setClearColor( 0xb8b5ff, 1); //Al

    	window.addEventListener('resize', this.onWindowResize.bind(this), false);
        this.onWindowResize();

        //POST PROC
        var renderScene = new THREE.RenderPass( this.scene, this.camera );
        var kaleidoPass = new THREE.ShaderPass( THREE.KaleidoShader );
        
        composer = new THREE.EffectComposer( this.renderer );
        composer.setSize( window.innerWidth, window.innerHeight );
        
        kaleidoPass.uniforms[ "sides" ].value = params.kaleidoSides;
        kaleidoPass.uniforms[ "angle" ].value = params.kaleidoAngle * 3.1416;
        
        composer.addPass( renderScene );

            //OUTLINE
            outlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera, [this.torusS]);
            composer.addPass(outlinePass);
            outlinePass.edgeStrength = 100;
            outlinePass.edgeThickness = 1;
            outlinePass.visibleEdgeColor.setRGB(1, 1, 1);
            outlinePass.hiddenEdgeColor.set('#ffffff');
            
            //TO GET BLACK OUTLINE
            outlinePass.overlayMaterial.blending = THREE.SubtractiveBlending
            outlinePass.selectedObjects = [this.torusS, this.torus, this.sphereLight];
        
        composer.addPass( kaleidoPass );
        //Add to fixe
        var copyPass = new THREE.ShaderPass(THREE.CopyShader);
        copyPass.renderToScreen = true;
        composer.addPass(copyPass)
        

        this.renderer.animate( this.render.bind(this));

    }

    render() {
        
        this.stats.begin();
        let time = Date.now()/1000;

        this.pMaterial.uniforms.uTime.value += time /100000000000;

        //GLOBAL ANIMATION
        for(var i=0;i<1;i++) {


            this.torus.rotation.x += 0.005;
            this.torus.rotation.y += 0.01;
            this.torus.rotation.z += 0.008;

            this.torusS.rotation.x += 0.01;
            this.torusS.rotation.y += 0.008;
            this.torusS.rotation.z += 0.005;

            //SOUND Effect Color & Rotate
            if(this.play.sound.frequencyDataArray[90] > 20 ) {
                //console.log(this.play.sound.frequencyDataArray[90])

                this.pointLight.color.r = 0;
                this.pointLight.color.g = 0.5;
                this.pointLight.color.b = 1;

                this.sphereLight.material.color.r = 1;
                this.sphereLight.material.color.g = 1;
                this.sphereLight.material.color.b = 1;

                this.sphereLight.scale.x = 1 + (this.play.sound.frequencyDataArray[90]/500)
                this.sphereLight.scale.y = 1 + (this.play.sound.frequencyDataArray[90]/500)
                this.sphereLight.scale.z = 1 + (this.play.sound.frequencyDataArray[90]/500)

                this.torus.rotation.x += 0.02;
                this.torus.rotation.y += 0.09;
                this.torus.rotation.z += 0.05;

                this.torusS.rotation.x += 0.05;
                this.torusS.rotation.y += 0.03;
                this.torusS.rotation.z += 0.01;

            } else if(this.pointLight.intensity <= 2) {
                this.pointLight.color.r = 0;
                this.pointLight.color.g = 1;
                this.pointLight.color.b = 1;

                this.sphereLight.material.color.r = 1;
                this.sphereLight.material.color.g = 1;
                this.sphereLight.material.color.b = 1;
            }
            //BEGIN ANIMATION
          
                this.scene.add(this.sphereLight)
                //LIGHT
                if(this.pointLight.intensity < 1) {

                //AFTER READY SOUND
                } else {
                    document.querySelector('.start-btn').style.opacity = "1";
                    document.querySelector('.load-btn').style.display = "none";
                    document.querySelector('.start-btn').classList.add('bounce-anim');
                    document.querySelector('.ready-anim').classList.add('play-ready');

                    this.pointLight.intensity = 2;

                    this.sphereLight.scale.x = 0.5 + (this.play.sound.frequencyDataArray[90]/200)
                    this.sphereLight.scale.y = 0.5 + (this.play.sound.frequencyDataArray[90]/200)
                    this.sphereLight.scale.z = 0.5 + (this.play.sound.frequencyDataArray[90]/200)

                }
        }

        //RENDER
    	//this.renderer.render( this.scene, this.camera ); //Default
        composer.render(); //Bloom

        this.stats.end();
    }

    onWindowResize() {
    	this.camera.aspect = window.innerWidth / window.innerHeight;
    	this.camera.updateProjectionMatrix();
    	this.renderer.setSize( window.innerWidth, window.innerHeight );
    }
}
