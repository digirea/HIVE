import React from 'react';
import ReactDOM from "react-dom";

function zeroPadding(n, c){
    return (new Array(c + 1).join('0') + n).slice(-c);
}

class prgLocations {
    constructor(props){
        this.prg = null;
        this.vs  = null;
        this.fs  = null;
        this.vSource = '';
        this.fSource = '';
        this.attL = [];
        this.attS = [];
        this.uniL = {};
        this.horizonBuffer = null;
        this.verticalBuffer = null;
        this.bufferWidth = 0;
        this.bufferHeight = 0;
    }
}

class ParallelCoordinate extends React.Component {
    constructor(props) {
        super(props);

        // member
        this.store  = this.props.store;
        this.action = this.props.action;
        this.node   = this.props.node;
        this.foreground = this.node.varname + '_foreground';
        this.brushed    = this.node.varname + '_brushed';

        this.mat = new matIV(); // from App/lib/glutil.js
        this.glContext = {};
        this.prev = {
            prevType: null,
            glforeground: null,
            glbrush: null
        };
        this.usr = {glRender: this.glRender};
        this.parcoords;         // from d3.parcoord.js
        this.dataval = null;
        this.densityRange = 95;
        this.density          = this.props.node.input[4].value;
        this.densityNormalize = this.props.node.input[5].value;
        this.logScale         = this.props.node.input[6].value;
        this.customScale      = this.props.node.input[7].value;
        this.min              = this.props.node.input[8].value;
        this.max              = this.props.node.input[9].value;
        this.weight = [];
        this.linecount = 0;
        this.dimensionTitles = {};

        // state
        this.state = {
            parse: null,
            data: null,
            param: null
        };

        // method
        this.redraw = this.redraw.bind(this);
        this.useAxes = this.useAxes.bind(this);
        this.beginDraw = this.beginDraw.bind(this);
        this.glInitialColor = this.glInitialColor.bind(this);
        this.glRender = this.glRender.bind(this);
        this.singleConv = this.singleConv.bind(this);
        this.imageRecieved = this.imageRecieved.bind(this);
        this.imageParse = this.imageParse.bind(this);
        this.setCanvas = this.setCanvas.bind(this);
        this.setContext = this.setContext.bind(this);
        this.componentDidMount = this.componentDidMount.bind(this);
        this.componentDidUpdate = this.componentDidUpdate.bind(this);
        this.componentWillUnmount = this.componentWillUnmount.bind(this);

        // event
        this.onChangeDensity = this.onChangeDensity.bind(this);
        this.onChangeDensityNormalize = this.onChangeDensityNormalize.bind(this);
        this.onChangeLogScale = this.onChangeLogScale.bind(this);
        this.onChangeCustomScale = this.onChangeCustomScale.bind(this);
        this.onChangeScaleMin = this.onChangeScaleMin.bind(this);
        this.onChangeScaleMax = this.onChangeScaleMax.bind(this);
        this.onColorChange = this.onColorChange.bind(this);
        this.onDensityColorChange = this.onDensityColorChange.bind(this);
    }

    imageRecieved(err, param, data){
        var a, buffer;
        const varname = this.node.varname;

        console.log('parallel: imageRecieved!!!');

        if(param.varname !== varname){return;}
        if(param.datatype === 'byte'){
            a = new Uint8Array(data);
        }else if(param.datatype === 'float'){
            a = new Float32Array(data);
        }
        let component = parseInt(param.component, 10);
        if(isNaN(component) || component === null || component === undefined || component < 2){
            console.log('parse error: invalid component count');
            return;
        }
        let parse = [];
        for(let i = 0, j = a.length / component; i < j; ++i){
            let k = i * component;
            parse.push([a[k], a[k + 1], a[k + 2]]);
        }
        this.setState({
            parse: parse,
            data: data,
            param: param
        });
        setTimeout(this.imageParse, 50);
    }

    imageParse(){
        if(this.state.parse === null || this.state.parse === undefined){return;}
        if(this.state.parse[0].length > 2){
            this.useAxes();
        }else{
            console.log('parallel: invalid data');
        }
    }

    onChangeDensity(){
        this.density = !this.density;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {density: this.density}
        });
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onChangeDensityNormalize(){
        this.densityNormalize = !this.densityNormalize;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {densityNormalize: this.densityNormalize}
        });
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onChangeLogScale(){
        this.logScale= !this.logScale;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {logScale: this.logScale}
        });
        this.usr.logScale = this.logScale;
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onChangeCustomScale(){
        this.customScale= !this.customScale;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {customScale: this.customScale}
        });
        this.usr.customScale = this.customScale;
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onChangeScaleMin(eve){
        this.min = eve.currentTarget.value;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {min: this.min}
        });
        this.usr.min = this.min;
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onChangeScaleMax(eve){
        this.max = eve.currentTarget.value;
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {max: this.max}
        });
        this.usr.max = this.max;
        setTimeout((()=>{this.redraw();}).bind(this), 50);
    }

    onColorChange(eve){
        var c, e, r, g, b;
        var a = [];
        for(let i = 1; i <= 2; ++i){
            e = ReactDOM.findDOMNode(this.refs["lineColor" + i]);
            c = e.value.match(/[0-9|a-f]{2}/ig);
            r = parseInt(c[0], 16) / 255;
            g = parseInt(c[1], 16) / 255;
            b = parseInt(c[2], 16) / 255;
            a.push([r, g, b, this.props.node.input[i - 1].value[3]]);
        }
        // send action from color input change
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {
                lineColor1: a[0],
                lineColor2: a[1]
            }
        });
        if(!this.density){setTimeout(this.redraw, 50);}
    }

    onDensityColorChange(eve){
        var c, e, r, g, b;
        var a = [];
        for(let i = 10; i < 20; ++i){
            e = ReactDOM.findDOMNode(this.refs["lineColor" + (i - 7)]);
            c = e.value.match(/[0-9|a-f]{2}/ig);
            r = parseInt(c[0], 16) / 255;
            g = parseInt(c[1], 16) / 255;
            b = parseInt(c[2], 16) / 255;
            a.push([r, g, b, this.props.node.input[i].value[3]]);
        }
        // send action from color input change
        this.props.action.changeNodeInput({
            varname: this.props.node.varname,
            input: {
                fLow:        a[0],
                fMiddleLow:  a[1],
                fMiddle:     a[2],
                fMiddleHigh: a[3],
                fHigh:       a[4],
                bLow:        a[5],
                bMiddleLow:  a[6],
                bMiddle:     a[7],
                bMiddleHigh: a[8],
                bHigh:       a[9],
            }
        });
        if(this.density){setTimeout(this.redraw, 50);}
    }

    singleConv(color){
        let r = zeroPadding(new Number(parseInt(color[0] * 255)).toString(16), 2);
        let g = zeroPadding(new Number(parseInt(color[1] * 255)).toString(16), 2);
        let b = zeroPadding(new Number(parseInt(color[2] * 255)).toString(16), 2);
        return '#' + r + g + b;
    }

    redraw(){
        var f = false;
        if(this.prev.prevType != null){
            if(this.prev[this.brushed] != null && this.prev[this.brushed].data != null){
                f = true;
                this.glRender(
                    this.brushed,
                    this.prev[this.brushed].data,
                    this.prev[this.brushed].lines,
                    this.prev[this.brushed].left,
                    this.prev[this.brushed].right
                );
            }
            if(this.prev.glforeground != null && this.prev.glforeground.data != null){
                f = true;
                this.glRender(
                    this.foreground,
                    this.prev[this.foreground].data,
                    this.prev[this.foreground].lines,
                    this.prev[this.foreground].left,
                    this.prev[this.foreground].right
                );
            }
        }
        if(!f){this.useAxes();}
    }

    useAxes(){
        let e = ReactDOM.findDOMNode(this.refs.examples);
        let d = [];
        if(e){
            for(let i in e.childNodes){
                if(e.childNodes[i].tagName === 'svg'){
                    d.push(e.childNodes[i]);
                }
                if(e.childNodes[i].id && !e.childNodes[i].id.match(/(foreground|brushed)/)){
                    d.push(e.childNodes[i]);
                }
            }
            for(let i in d){
                e.removeChild(d[i]);
            }
        }
        if(this.state.parse !== null){
            this.beginDraw(this.state.parse);
        }
    }

    beginDraw(data){
        if(data.length < 3){console.log('invalid data:' + data); return;}
        this.dimensionTitles = {};
        this.dataval = [];
        if(Array.isArray(data[0])){ // csv 先頭行がタイトルではない
            for(let i = 0, j = data[0].length; i < j; ++i){
                this.dimensionTitles[i] = i;
            }
            for(let i = 0, j = data.length; i < j; ++i){
                this.dataval[i] = [];
                for(let k = 0, l = data[i].length; k < l; ++k){
                    this.dataval[i][k] = data[i][k];
                }
            }
        }else{ // csv 先頭行がタイトルになっており配列の中に javascript オブジェクトが入っているケース
            let i = 0;
            for(let j in data[0]){
                this.dimensionTitles[i] = j;
                i++;
            }
            for(let i = 0, j = data.length; i < j; ++i){
                this.dataval[i] = [];
                for(let k in this.dimensionTitles){
                    this.dataval[i][k] = data[i][this.dimensionTitles[k]];
                }
            }
        }
        // usr には parcoord.js 側に渡したいこっち都合のものがいろいろ入ってる
        this.usr = {
            glRender: this.glRender,
            setCanvas: this.setCanvas,
            foreground: this.foreground,
            brushed: this.brushed,
            varname: this.node.varname,
            extent: null,
            logScale: this.props.node.input[6].value,
            customScale: this.props.node.input[7].value,
            min: this.props.node.input[8].value,
            max: this.props.node.input[9].value
        };
        this.linecount = this.dataval.length;
        this.parcoords = d3.parcoords({dimensionTitles: this.dimensionTitles, usr: this.usr})(ReactDOM.findDOMNode(this.refs.examples))
            .data(this.dataval)   // データの代入
            .mode("queue")        // 描画を WebGL Renderer に
            .width(500)           // 描画エリアのサイズ（横幅）
            .height(320);         // 描画エリアのサイズ（縦）

        this.glInitialColor();
        this.parcoords.render()   // ラインを描画する
            .createAxes()         // 目盛を生成する
            .reorderable()        // 軸の並び替え有効化
            .brushMode("1D-axes") // 抽出のやり方
            .interactive();       // 常時更新
    }
    setCanvas(canvas){
        this.setContext(canvas, this.foreground);
        this.setContext(canvas, this.brushed);
    }
    setContext(canvas, id){
        if(this.glContext[id] === null || this.glContext[id] === undefined){
            this.glContext[id] = {};
            this.glContext[id].canvas          = canvas[id];
            this.glContext[id].gl              = canvas[id].getContext('webgl');
            this.glContext[id].color           = [0.2, 0.2, 0.2, 0.1];
            this.glContext[id].lowColor        = [1.0, 1.0, 1.0];
            this.glContext[id].middleLowColor  = [0.2, 0.2, 0.2];
            this.glContext[id].middleColor     = [0.1, 0.5, 0.3];
            this.glContext[id].middleHighColor = [0.6, 0.6, 0.2];
            this.glContext[id].highColor       = [0.8, 0.2, 0.1];
            this.glContext[id].pl              = new prgLocations();
            this.glContext[id].plp             = new prgLocations();
            this.glContext[id].plf             = new prgLocations();
            this.glContext[id].ext             = this.glContext[id].gl.getExtension('OES_texture_float');
        }
    }
    glInitialColor(){
        this.glContext[this.foreground].color           = this.props.node.input[0].value;
        this.glContext[this.foreground].lowColor        = this.props.node.input[10].value;
        this.glContext[this.foreground].middleLowColor  = this.props.node.input[11].value;
        this.glContext[this.foreground].middleColor     = this.props.node.input[12].value;
        this.glContext[this.foreground].middleHighColor = this.props.node.input[13].value;
        this.glContext[this.foreground].highColor       = this.props.node.input[14].value;

        this.glContext[this.brushed].color              = this.props.node.input[1].value;
        this.glContext[this.brushed].lowColor           = this.props.node.input[15].value;
        this.glContext[this.brushed].middleLowColor     = this.props.node.input[16].value;
        this.glContext[this.brushed].middleColor        = this.props.node.input[17].value;
        this.glContext[this.brushed].middleHighColor    = this.props.node.input[18].value;
        this.glContext[this.brushed].highColor          = this.props.node.input[19].value;
    }

    glRender(target, data, lines, left, right){
        if(!target){return;}
        if(data){
            this.prev.prevType = target;
            this.prev[target] = {target: target, data: data, lines: lines, left: left, right: right};
            if(this.glContext[target].gl == null){return;}
        }else{
            if(this.glContext[target].gl !== null && this.glContext[target].gl !== undefined){
                this.glContext[target].gl.viewport(0, 0, width, height);
                this.glContext[target].gl.clearColor(0.0, 0.0, 0.0, 0.0);
                this.glContext[target].gl.clear(this.glContext[target].gl.COLOR_BUFFER_BIT);
                if(this.prev[target] && this.prev[target].data){
                    this.prev[target].data = null;
                    this.prev[target].lines = 0;
                }
            }
        }

        var gc = this.glContext[target];
        var gl = gc.gl;
        var vPosition, vboL;
        var polyPosition = [];
        var vPolyPosition, vboPL;
        var width = gl.canvas.width;
        var height = gl.canvas.height;
        var ext = gc.ext;
        var mat = this.mat;
        var linecount = lines;

        if(gc.pl.prg == null){
            gc.pl.vSource = '';
            gc.pl.vSource += 'attribute vec2 position;';
            gc.pl.vSource += 'uniform mat4 matrix;';
            gc.pl.vSource += 'void main(){';
            gc.pl.vSource += '    gl_Position = matrix * vec4(position, 0.0, 1.0);';
            gc.pl.vSource += '}';

            gc.pl.fSource = '';
            gc.pl.fSource += 'precision mediump float;';
            gc.pl.fSource += 'uniform vec4 color;';
            gc.pl.fSource += 'uniform float density;';
            gc.pl.fSource += 'void main(){';
            gc.pl.fSource += '    if(density > 0.0){';
            gc.pl.fSource += '        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);';
            gc.pl.fSource += '    }else{';
            gc.pl.fSource += '        gl_FragColor = color;';
            gc.pl.fSource += '    }';
            gc.pl.fSource += '}';

            gc.pl.vs = create_shader(gl, gc.pl.vSource, gl.VERTEX_SHADER);
            gc.pl.fs = create_shader(gl, gc.pl.fSource, gl.FRAGMENT_SHADER);
            gc.pl.prg = create_program(gl, gc.pl.vs, gc.pl.fs);

            gc.pl.attL = [gl.getAttribLocation(gc.pl.prg, 'position')];
            gc.pl.attS = [2];
            gc.pl.uniL = {
                matrix: gl.getUniformLocation(gc.pl.prg, 'matrix'),
                color: gl.getUniformLocation(gc.pl.prg, 'color'),
                density: gl.getUniformLocation(gc.pl.prg, 'density')
            };

            gc.plp.vSource = '';
            gc.plp.vSource += 'attribute vec3 position;';
            gc.plp.vSource += 'void main(){';
            gc.plp.vSource += '    gl_Position = vec4(position, 1.0);';
            gc.plp.vSource += '}';

            gc.plp.fSource = '';
            gc.plp.fSource += 'precision mediump float;';
            gc.plp.fSource += 'uniform vec2 resolution;';
            gc.plp.fSource += 'uniform bool horizontal;';
            gc.plp.fSource += 'uniform float weight[30];';
            gc.plp.fSource += 'uniform sampler2D texture;';
            gc.plp.fSource += 'void main(){';
            gc.plp.fSource += '    vec2 tFrag = 1.0 / resolution;';
            gc.plp.fSource += '    vec2 fc = gl_FragCoord.st;';
            gc.plp.fSource += '    vec4 destColor = texture2D(texture, fc) * weight[0];';
            gc.plp.fSource += '    if(horizontal){';
            gc.plp.fSource += '        for(int i = 1; i < 30; ++i){';
            gc.plp.fSource += '            destColor += texture2D(texture, (fc + vec2( float(i), 0.0)) * tFrag) * weight[i];';
            gc.plp.fSource += '            destColor += texture2D(texture, (fc + vec2(-float(i), 0.0)) * tFrag) * weight[i];';
            gc.plp.fSource += '        }';
            gc.plp.fSource += '    }else{';
            gc.plp.fSource += '        for(int i = 1; i < 30; ++i){';
            gc.plp.fSource += '            destColor += texture2D(texture, (fc + vec2(0.0,  float(i))) * tFrag) * weight[i];';
            gc.plp.fSource += '            destColor += texture2D(texture, (fc + vec2(0.0, -float(i))) * tFrag) * weight[i];';
            gc.plp.fSource += '        }';
            gc.plp.fSource += '    }';
            gc.plp.fSource += '    gl_FragColor = destColor;';
            gc.plp.fSource += '}';

            gc.plp.vs = create_shader(gl, gc.plp.vSource, gl.VERTEX_SHADER);
            gc.plp.fs = create_shader(gl, gc.plp.fSource, gl.FRAGMENT_SHADER);
            gc.plp.prg = create_program(gl, gc.plp.vs, gc.plp.fs);

            gc.plp.attL = [gl.getAttribLocation(gc.plp.prg, 'position')];
            gc.plp.attS = [3];
            gc.plp.uniL = {
                resolution: gl.getUniformLocation(gc.plp.prg, 'resolution'),
                horizontal: gl.getUniformLocation(gc.plp.prg, 'horizontal'),
                weight:     gl.getUniformLocation(gc.plp.prg, 'weight'),
                texture:    gl.getUniformLocation(gc.plp.prg, 'texture')
            };

            gc.plf.vSource = '';
            gc.plf.vSource += 'attribute vec3 position;';
            gc.plf.vSource += 'void main(){';
            gc.plf.vSource += '    gl_Position = vec4(position, 1.0);';
            gc.plf.vSource += '}';

            gc.plf.fSource = '';
            gc.plf.fSource += 'precision mediump float;';
            gc.plf.fSource += 'uniform vec4 color;';
            gc.plf.fSource += 'uniform vec2 resolution;';
            gc.plf.fSource += 'uniform sampler2D texture;';
            gc.plf.fSource += 'uniform float density;';
            gc.plf.fSource += 'uniform vec3 lowColor;';
            gc.plf.fSource += 'uniform vec3 middleLowColor;';
            gc.plf.fSource += 'uniform vec3 middleColor;';
            gc.plf.fSource += 'uniform vec3 middleHighColor;';
            gc.plf.fSource += 'uniform vec3 highColor;';
            gc.plf.fSource += 'const float low = 0.2;';
            gc.plf.fSource += 'const float middle = 0.4;';
            gc.plf.fSource += 'const float high = 0.7;';
            gc.plf.fSource += 'void main(){';
            gc.plf.fSource += '    if(density > 0.0){';
            gc.plf.fSource += '        vec4 c = color;';
            gc.plf.fSource += '        vec2 texcoord = gl_FragCoord.st / resolution;';
            gc.plf.fSource += '        vec4 smpColor = texture2D(texture, texcoord);';
            gc.plf.fSource += '        float range = smpColor.a / density;';
            gc.plf.fSource += '        if(range < low){';
            gc.plf.fSource += '            c = vec4(mix(lowColor, middleLowColor, smoothstep(0.0, low, range)) * 1.5, 1.0);';
            gc.plf.fSource += '        }else if(range < middle){';
            gc.plf.fSource += '            c = vec4(mix(middleLowColor, middleColor, smoothstep(low, middle, range)) * 1.5, 1.0);';
            gc.plf.fSource += '        }else if(range < high){';
            gc.plf.fSource += '            c = vec4(mix(middleColor, middleHighColor, smoothstep(middle, high, range)) * 1.5, 1.0);';
            gc.plf.fSource += '        }else{';
            gc.plf.fSource += '            c = vec4(mix(middleHighColor, highColor, smoothstep(high, 1.0, range)) * 1.5, 1.0);';
            gc.plf.fSource += '        }';
            gc.plf.fSource += '        gl_FragColor = vec4(c.rgb, range * 2.0);';
            gc.plf.fSource += '    }else{';
            gc.plf.fSource += '        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);';
            gc.plf.fSource += '    }';
            gc.plf.fSource += '}';

            gc.plf.vs = create_shader(gl, gc.plf.vSource, gl.VERTEX_SHADER);
            gc.plf.fs = create_shader(gl, gc.plf.fSource, gl.FRAGMENT_SHADER);
            gc.plf.prg = create_program(gl, gc.plf.vs, gc.plf.fs);

            gc.plf.attL = [gl.getAttribLocation(gc.plf.prg, 'position')];
            gc.plf.attS = [3];
            gc.plf.uniL = {
                color: gl.getUniformLocation(gc.plf.prg, 'color'),
                resolution: gl.getUniformLocation(gc.plf.prg, 'resolution'),
                texture: gl.getUniformLocation(gc.plf.prg, 'texture'),
                density: gl.getUniformLocation(gc.plf.prg, 'density'),
                lowColor: gl.getUniformLocation(gc.plf.prg, 'lowColor'),
                middleLowColor: gl.getUniformLocation(gc.plf.prg, 'middleLowColor'),
                middleColor: gl.getUniformLocation(gc.plf.prg, 'middleColor'),
                middleHighColor: gl.getUniformLocation(gc.plf.prg, 'middleHighColor'),
                highColor: gl.getUniformLocation(gc.plf.prg, 'highColor')
            };

            (()=>{
                var t = 0.0;
                for(var i = 0; i < 30; i++){
                    var r = 1.0 + 2.0 * i;
                    var w = Math.exp(-0.5 * (r * r) / 150.0);
                    this.weight[i] = w;
                    if(i > 0){w *= 2.0;}
                    t += w;
                }
                for(i = 0; i < this.weight.length; i++){
                    this.weight[i] /= t;
                }
            })();

            (()=>{
                var i;
                for(i = 1; i < width; i *= 2){}
                gc.plp.bufferWidth = Math.max(i, 1024);
                for(i = 1; i < height; i *= 2){}
                gc.plp.bufferHeight = Math.max(Math.max(i, 1024), gc.plp.bufferWidth);
            })();
            gc.plp.horizonBuffer  = create_framebuffer(gl, ext, gc.plp.bufferWidth, gc.plp.bufferHeight);
            gc.plp.verticalBuffer = create_framebuffer(gl, ext, gc.plp.bufferWidth, gc.plp.bufferHeight);
        }

        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);
        // gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
        gl.lineWidth(1.0);
        gl.useProgram(gc.pl.prg);
        gl.viewport(0, 0, width, height);
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        if(data == null){return;}
        // data をアウトプットに出すとしたらここぽい気がする

        var vMatrix = mat.identity(mat.create());
        var pMatrix = mat.identity(mat.create());
        var vpMatrix = mat.identity(mat.create());

        vPosition = create_vbo(gl, data);
        vboL = [vPosition];

        polyPosition = [
            -1.0,  1.0,  0.0,
             1.0,  1.0,  0.0,
            -1.0, -1.0,  0.0,
             1.0, -1.0,  0.0
        ];
        vPolyPosition = create_vbo(gl, polyPosition);
        vboPL = [vPolyPosition];

        mat.lookAt(
            [0.0, 0.0, 1.0],
            [0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0],
            vMatrix
        );
        mat.ortho(
            0,
            width,
            0,
            height,
            0.5,
            5.0,
            pMatrix
        );
        mat.multiply(pMatrix, vMatrix, vpMatrix);

        if(this.densityNormalize){
            linecount *= (101 - this.densityRange) / 100 * 0.5;
        }else{
            linecount = this.linecount * (101 - this.densityRange) / 100 * 0.5;
        }

        if(this.density){
            // first scene to vertical buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, gc.plp.verticalBuffer.framebuffer);
            gl.viewport(0, 0, gc.plp.bufferWidth, gc.plp.bufferHeight);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(gc.pl.prg);
            set_attribute(gl, vboL, gc.pl.attL, gc.pl.attS);
            gl.uniformMatrix4fv(gc.pl.uniL.matrix, false, vpMatrix);
            gl.uniform4fv(gc.pl.uniL.color, gc.color);
            gl.uniform1f(gc.pl.uniL.density, linecount);
            gl.drawArrays(gl.LINES, 0, data.length / 2);

            // horizon blur
            gl.bindFramebuffer(gl.FRAMEBUFFER, gc.plp.horizonBuffer.framebuffer);
            gl.bindTexture(gl.TEXTURE_2D, gc.plp.verticalBuffer.texture);
            gl.viewport(0, 0, gc.plp.bufferWidth, gc.plp.bufferHeight);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(gc.plp.prg);
            set_attribute(gl, vboPL, gc.plp.attL, gc.plp.attS);
            gl.uniform2fv(gc.plp.uniL.resolution, [gc.plp.bufferWidth, gc.plp.bufferHeight]);
            gl.uniform1i(gc.plp.uniL.horizontal, true);
            gl.uniform1fv(gc.plp.uniL.weight, this.weight);
            gl.uniform1i(gc.plp.uniL.texture, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // vertical blur
            gl.bindFramebuffer(gl.FRAMEBUFFER, gc.plp.verticalBuffer.framebuffer);
            gl.bindTexture(gl.TEXTURE_2D, gc.plp.horizonBuffer.texture);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.uniform1i(gc.plp.uniL.horizontal, false);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // first scene to vertical buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.bindTexture(gl.TEXTURE_2D, gc.plp.verticalBuffer.texture);
            gl.viewport(0, 0, width, height);
            gl.clearColor(0.0, 0.0, 0.0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(gc.plf.prg);
            set_attribute(gl, vboPL, gc.plf.attL, gc.plf.attS);
            gl.uniform4fv(gc.plf.uniL.color, gc.color);
            gl.uniform2fv(gc.plf.uniL.resolution, [width, height]);
            gl.uniform1i(gc.plf.uniL.texture, 0);
            gl.uniform1f(gc.plf.uniL.density, linecount);
            gl.uniform3fv(gc.plf.uniL.lowColor        , [gc.lowColor[0]        , gc.lowColor[1]        , gc.lowColor[2]]);
            gl.uniform3fv(gc.plf.uniL.middleLowColor  , [gc.middleLowColor[0]  , gc.middleLowColor[1]  , gc.middleLowColor[2]]);
            gl.uniform3fv(gc.plf.uniL.middleColor     , [gc.middleColor[0]     , gc.middleColor[1]     , gc.middleColor[2]]);
            gl.uniform3fv(gc.plf.uniL.middleHighColor , [gc.middleHighColor[0] , gc.middleHighColor[1] , gc.middleHighColor[2]]);
            gl.uniform3fv(gc.plf.uniL.highColor       , [gc.highColor[0]       , gc.highColor[1]       , gc.highColor[2]]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }else{
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, width, height);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(gc.pl.prg);
            set_attribute(gl, vboL, gc.pl.attL, gc.pl.attS);
            gl.uniformMatrix4fv(gc.pl.uniL.matrix, false, vpMatrix);
            gl.uniform4fv(gc.pl.uniL.color, gc.color);
            gl.uniform1f(gc.pl.uniL.density, -1.0);
            gl.drawArrays(gl.LINES, 0, data.length / 2);
        }
        gl.flush();
    }

    componentDidMount(){
        const Store_IMAGE_RECIEVED = "image_revieved";
        this.store.on(Store_IMAGE_RECIEVED, this.imageRecieved);
    }

    componentDidUpdate(){
        if(this.glContext.hasOwnProperty(this.foreground)){
            this.glContext[this.foreground].color = this.props.node.input[0].value;
            this.glContext[this.brushed].color = this.props.node.input[1].value;
        }
    }

    componentWillUnmount(){
        const Store_IMAGE_RECIEVED = "image_revieved";
        this.store.removeListener(Store_IMAGE_RECIEVED, this.imageRecieved);
    }

    styles(){
        return {
            container: {
                width: "500px",
                height: "auto",
                margin: "2px 5px"
            },
            examples: {
                backgroundColor: "white",
                width: "500px",
                height: "320px"
            },
            uiFrame: {
                width: "100%",
                height: "125px",
                display: "flex",
                flexDirection: "column"
            },
            flexrow: {
                flex: "1 0 auto",
                padding: "2px",
                display: "flex",
                flexDirection: "row"
            },
            flexcol: {
                flex: "1 0 auto",
                padding: "2px",
                display: "flex",
                flexDirection: "row"
            },
            colorInputs: {
                width: "20px",
                height: "20px",
                padding: "0px"
            },
            inputTitle: {
                marginRight: "3px",
            },
            textInputs: {
                padding: "1px 2px",
                height: "20px",
            },
            canvas: {},
        };
    }

    render(){
        const styles = this.styles();
        return (
            <div>
                <div ref="container" style={styles.container}>
                    <div ref="examples" className="parcoords" style={styles.examples}></div>
                    <div style={styles.uiFrame}>
                        <div style={styles.flexrow}>
                            <div style={styles.flexcol}>
                                <input type="checkbox" checked={this.props.node.input[4].value} id="densityCheck" onChange={this.onChangeDensity} />
                                <label onClick={this.onChangeDensity}>density mode</label>
                            </div>
                            <div style={styles.flexcol}>
                                <input type="checkbox" checked={this.props.node.input[5].value} id="densityNormalize" onChange={this.onChangeDensityNormalize} />
                                <label onClick={this.onChangeDensityNormalize}>density normalize</label>
                            </div>
                            <div style={styles.flexcol}>
                                <input type="checkbox" checked={this.props.node.input[6].value} id="logScale" onChange={this.onChangeLogScale} />
                                <label onClick={this.onChangeLogScale}>log scale</label>
                            </div>
                        </div>
                        <div style={styles.flexrow}>
                            <div style={styles.flexcol}>
                                <input type="checkbox" checked={this.props.node.input[7].value} id="customCheck" onChange={this.onChangeCustomScale} />
                                <label onClick={this.onChangeCustomScale}>custom scale</label>
                            </div>
                            <div style={styles.flexcol}>
                                <p>min</p>
                                <input type="text" value={this.props.node.input[8].value} id="customScaleMin" onChange={this.onChangeScaleMin} style={styles.textInputs} />
                            </div>
                            <div style={styles.flexcol}>
                                <p>max</p>
                                <input type="text" value={this.props.node.input[9].value} id="customScaleMax" onChange={this.onChangeScaleMax} style={styles.textInputs}/>
                            </div>
                        </div>
                        <div style={styles.flexrow}>
                            <div style={styles.flexcol}>
                                <p style={styles.inputTitle}>line</p>
                                <input type="color" id="color1" ref="lineColor1" value={this.singleConv(this.props.node.input[0].value)} onChange={this.onColorChange} style={styles.colorInputs} />
                                <input type="color" id="color2" ref="lineColor2" value={this.singleConv(this.props.node.input[1].value)} onChange={this.onColorChange} style={styles.colorInputs} />
                            </div>
                            <div style={styles.flexcol}>
                                <p style={styles.inputTitle}>density</p>
                                <input type="color" id="color3" ref="lineColor3" value={this.singleConv(this.props.node.input[10].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color4" ref="lineColor4" value={this.singleConv(this.props.node.input[11].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color5" ref="lineColor5" value={this.singleConv(this.props.node.input[12].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color6" ref="lineColor6" value={this.singleConv(this.props.node.input[13].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color7" ref="lineColor7" value={this.singleConv(this.props.node.input[14].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                            </div>
                            <div style={styles.flexcol}>
                                <p style={styles.inputTitle}>select</p>
                                <input type="color" id="color8"  ref="lineColor8" value={this.singleConv(this.props.node.input[15].value)}  onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color9"  ref="lineColor9" value={this.singleConv(this.props.node.input[16].value)}  onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color10" ref="lineColor10" value={this.singleConv(this.props.node.input[17].value)}  onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color11" ref="lineColor11" value={this.singleConv(this.props.node.input[18].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                                <input type="color" id="color12" ref="lineColor12" value={this.singleConv(this.props.node.input[19].value)} onChange={this.onDensityColorChange} style={styles.colorInputs} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

module.exports = ParallelCoordinate;
