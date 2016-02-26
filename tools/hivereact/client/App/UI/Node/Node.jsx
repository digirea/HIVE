import React from "react"
import ReactDOM from "react-dom"
import NodeInOut from "./NodeInOut.jsx"
import Core from '../../Core'
import Store from './Store.jsx'

/**
 * ノード.
 */
export default class Node extends React.Component {
	constructor(props) {
		super(props);
		this.isLeftDown = false;
		this.isCtrlDown = false;
		this.mousePos = { x : 0, y : 0};

		let node = this.props.store.getNode(this.props.nodeVarname).node;
		this.state = {
			node : node,
			closeHover : false,
			isSelected : node.select,
			zIndex : 0,
			isMinimum : true
		};

		this.nodeChanged = this.nodeChanged.bind(this);
		this.selectChanged = this.selectChanged.bind(this);
		this.moveNode = this.moveNode.bind(this);

		this.componentDidMount = this.componentDidMount.bind(this);
		this.componentWillUnmount = this.componentWillUnmount.bind(this);
		this.onMouseMove = this.onMouseMove.bind(this);
		this.onMouseUp = this.onMouseUp.bind(this);
		this.onMouseDown = this.onMouseDown.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.styles = this.styles.bind(this);
		this.nodeRect = this.nodeRect.bind(this);
	}

	nodeChanged(err, data) {
		if (data.varname === this.props.nodeVarname) {
			this.setState({
				node : Object.assign({}, data)
			});
		}
	}

	selectChanged(err, data) {
		if (data.varname === this.props.nodeVarname) {
			if (data.select) {
				this.setState({
					isSelected : data.select,
					zIndex : 1
				});
			} else {
				this.setState({
					isSelected : data.select,
					zIndex : 0
				});
			}
		}
	}

	moveNode(err, data) {
		if (this.state.isSelected) {
			// マウスダウン時のoffsetLeft/offsetTopに足し込む.
			this.state.node.pos = [this.offsetLeft + data.x, this.offsetTop + data.y];
			setTimeout(() => {
				this.props.action.changeNode({
					varname : this.state.node.varname,
					pos : this.state.node.pos
				});
			}, 0);
		}
	}

	nodeRect() {
		return {
			x : this.state.node.pos[0],
			y : this.state.node.pos[1],
			w : 200,
			h : (Math.max(this.state.node.input.length, this.state.node.output.length) + 1) * 18 + 10
		};
	}

	styles() {
		return {
			node : {
				position : "absolute",
				left : String(this.state.node.pos[0]),
				top : String(this.state.node.pos[1]),
				width : "200px",
				height : String((Math.max(this.state.node.input.length, this.state.node.output.length) + 1) * 18 + 20),
				backgroundColor : "rgb(66, 69, 66)",
				color : "white",
				opacity : "0.8",
				padding : "5px",
				border : this.state.isSelected ? "solid 1px orange" : "none",
				zIndex : this.state.zIndex
			},
			title : {
				color : "rgb(239, 136, 21)",
				fontSize : "16px"
			},
			closeButton : {
				position : "absolute",
				right : "0px",
				top : "0px",
				margin : "5px",
				width: "15px",
				height: "15px",
				backgroundColor : "#ea4412",
				textAlign : "center",
				borderRadius : "5px",
				border : this.state.closeHover ? "solid 1px" : "none"
			},
			closeText : {
				lineHeight : "12px",
				cursor : "pointer"
			}
		}
	}

	componentDidMount() {
		window.addEventListener('mousemove', this.onMouseMove);
		window.addEventListener('mouseup', this.onMouseUp);
		window.addEventListener('keydown', this.onKeyDown);
		window.addEventListener('keyup', this.onKeyUp);
		this.props.store.on(Core.Constants.NODE_CHANGED, this.nodeChanged);
		this.props.store.on(Core.Constants.NODE_SELECTE_CHANGED, this.selectChanged);
		this.props.nodeStore.on(Store.NODE_MOVED, this.moveNode);
	}

	componentWillUnmount() {
		window.removeEventListener('mousemove', this.onMouseMove);
		window.removeEventListener('mouseup', this.onMouseUp);
		window.removeEventListener('keydown', this.onKeyDown);
		window.removeEventListener('keyup', this.onKeyUp);
		this.props.store.removeListener(Core.Constants.NODE_CHANGED, this.nodeChanged);
		this.props.store.removeListener(Core.Constants.NODE_SELECTE_CHANGED, this.selectChanged);
		this.props.nodeStore.removeListener(Store.NODE_MOVED, this.moveNode);
	}

	onKeyDown(ev) {
		this.isCtrlDown = ev.ctrlKey;
	}

	onKeyUp(ev) {
		this.isCtrlDown = ev.ctrlKey;
	}

	onMouseDown(ev) {
		if (ev.button === 0) {
			this.isLeftDown = true;
			this.mousePos = { x : ev.clientX, y : ev.clientY };
			this.offsetLeft = ev.currentTarget.offsetLeft;
			this.offsetTop = ev.currentTarget.offsetTop;

			if (!this.isCtrlDown) {
				this.props.action.unSelectNode([], this.props.nodeVarname);
			}
			this.props.action.selectNode([this.props.nodeVarname]);
		}
	}

	onMouseUp(ev) {
		this.isLeftDown = false;
		this.offsetLeft = this.state.node.pos[0];
		this.offsetTop = this.state.node.pos[1];
	}

	onMouseMove(ev) {
		if (this.isLeftDown) {
			// マウスダウン位置からの差分移動量.
			let mv = { x : ev.clientX - this.mousePos.x, y : ev.clientY - this.mousePos.y };

			this.props.nodeAction.moveNode(mv);
		}
	}

	/// 閉じるボタンが押された.
	onCloseClick(ev) {
		this.props.action.deleteNode(this.props.nodeVarname);
	}

	/// 閉じるボタンにマウスホバーされた
	onCloseHover(ev) {
		this.setState({ closeHover : !this.state.closeHover })
	}

	/// タイトル.
	titleElem() {
		const style = this.styles.bind();
		return <div style={style.title}>{this.state.node.name}</div>
	}

	/// 入力端子.
	inputElem() {
		let inputs = this.state.node.input.map( (inputData, index) => {
			return (<NodeInOut
						nodeStore={this.props.nodeStore}
						nodeAction={this.props.nodeAction}
						nodeRect={this.nodeRect(index)}
						nodeVarname={this.props.nodeVarname}
						isInput={true} data={inputData}
						key={this.props.nodeVarname + "_" + inputData.name + "_" + index}
						id={this.props.nodeVarname + "_" + inputData.name + "_" + index}
						index={index} />)
		});
		return (<div>{inputs}</div>);
	}

	/// 出力端子.
	outputElem() {
		let outputs = this.state.node.output.map( (outputData, index) => {
			return (<NodeInOut
						nodeStore={this.props.nodeStore}
						nodeAction={this.props.nodeAction}
			 			nodeRect={this.nodeRect(index)}
						nodeVarname={this.props.nodeVarname}
						isInput={false}
						data={outputData}
						key={this.props.nodeVarname + "_" + outputData.name + "_" + index}
						id={this.props.nodeVarname + "_" + outputData.name + "_" + index}
						index={index} />)
		});
		return (<div>{outputs}</div>);
	}

	/// 閉じるボタン
	closeElem() {
		const style = this.styles();
		return (<div style={style.closeButton}
					onClick={this.onCloseClick.bind(this)}
					onMouseEnter={this.onCloseHover.bind(this)}
					onMouseLeave={this.onCloseHover.bind(this)}
				>
					<div style={style.closeText}>x</div>
				</div>)
	}

	render () {
		const style = this.styles();
		return (<div ref="node"
					style={style.node}
					onMouseDown={this.onMouseDown.bind(this)}
				>
					{this.titleElem.bind(this)()}
					{this.inputElem.bind(this)()}
					{this.outputElem.bind(this)()}
					{this.closeElem.bind(this)()}
				</div>);
	}
}
