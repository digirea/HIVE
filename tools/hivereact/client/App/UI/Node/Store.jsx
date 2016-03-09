import EventEmitter from 'eventemitter3'
import Core from '../../Core'

function calcPlugPositionY(node, inoutIndex) {
	const holeSize = node.node.close ? 10 : 15;
	return node.node.pos[1] + (inoutIndex + 1) * (holeSize + 3) + 24
}

function calcSimplePlugPositionY(node) {
	return node.node.pos[1] + 18 + 20
}

function validatePlugInfo(plug, plugInfo, dataName) {
	if (dataName !== null && dataName !== undefined) {
		return (plug.nodeVarname === plugInfo.data.nodeVarname && dataName === plugInfo.data.name);
	} else {
		return (plug.nodeVarname === plugInfo.data.nodeVarname && plug.name === plugInfo.data.name);
	}
}

export default class Store extends EventEmitter {
	constructor(dispatcher, coreStore) {
		super();
		this.dispatchToken = dispatcher.register(this.actionHandler.bind(this));

		// 以下の形式のプラグ情報のリスト
		// {
		//   input : {
		//      pos : [x, y],
		//      nodeVarname : varname,
		//      name : name
		//   },
		//   output : {
		//      pos : [x, y],
		//      nodeVarname : varname,
		//      name : name
		//   },
		// }
		this.plugPositions = [];

		// 以下の形式の選択中の端子情報リスト
		// 端子は2つ以上選択できず、2つ選択されたときは接続されたものとみなす
		// {
		//   nodeVarname : nodevarname,
		//   data : 端子データ,
		//   isInput : 入力端子ならtrue
		// }
		this.selectedHoles = [];

		// ビューのズーム
		this.zoom = 1.0;

		// nodemap
		this.nodeMap = {};
		this.nodeToGroupMap = {};
		this.isInitialRender = true;

		// { nodeVarname : {width:"", height:""} }
		this.nodeSizeMap = {};

		coreStore.on(Core.Constants.NODE_COUNT_CHANGED, (err, data) => {
			this.regenerateNodeMap(coreStore);
			for (let n in this.nodeSizeMap) {
				if (!this.nodeMap.hasOwnProperty(n)) {
					delete this.nodeSizeMap[n];
				}
			}
			this.isInitialRender = true;
		});

		this.calcPlugPosition = this.calcPlugPosition.bind(this);
		this.recalcPlugPosition = this.recalcPlugPosition.bind(this);

		coreStore.on(Core.Constants.PLUG_COUNT_CHANGED, (err, data) => {
			// ノードマップを作り直す.
			this.regenerateNodeMap(coreStore);
			this.recalcPlugPosition(coreStore);
			this.emit(Store.PLUG_COUNT_CHANGED, err, this.plugPositions);
		});

		this.getPlugPositions = this.getPlugPositions.bind(this);
		this.changePlugPosition = this.changePlugPosition.bind(this);
		this.moveNode = this.moveNode.bind(this);
		this.dragPlug = this.dragPlug.bind(this);
		this.endDragPlug = this.endDragPlug.bind(this);
		this.selectPlugHole = this.selectPlugHole.bind(this);
		this.unSelectPlugHoles = this.unSelectPlugHoles.bind(this);
		this.disconnectPlugHole = this.disconnectPlugHole.bind(this);
		this.changeZoom = this.changeZoom.bind(this);
		this.isConnected = this.isConnected.bind(this);
		this.isGroup = coreStore.isGroup;
		this.coreStore = coreStore;
	}

	regenerateNodeMap(coreStore) {
		let addNodeToNodeMap = (n) => {
			if (this.isGroup(n)) {
				this.nodeMap[n.varname] = n;
				this.nodeToGroupMap[n.varname] = n;
				for (let i = 0; i < n.nodes.length; i = i + 1) {
					addNodeToNodeMap(n.nodes[i]);
					this.nodeToGroupMap[n.nodes[i].varname] = n;
				}
			} else {
				this.nodeMap[n.varname] = n;
			}
		}
		this.nodeMap = {};
		this.nodeToGroupMap = {};
		for (let i = 0, size = coreStore.getNodes().length; i < size; i = i + 1) {
			let n = coreStore.getNodes()[i];
			addNodeToNodeMap(n);
		}
	}

	recalcPlugPosition(coreStore) {
		//if (!this.isInitialRender) { return; }
		this.plugPositions = [];
		let plugs = coreStore.getPlugs();
		for (let i = 0; i < plugs.length; i = i + 1) {
			let plug = plugs[i];
			let inVarname = plug.input.nodeVarname;
			let outVarname = plug.output.nodeVarname;
			if (this.nodeMap.hasOwnProperty(inVarname) && this.nodeMap.hasOwnProperty(outVarname)) {
				let inNode = this.nodeMap[inVarname];
				let outNode = this.nodeMap[outVarname];
				if (!coreStore.getNode(inVarname)) {
					inNode = this.nodeToGroupMap[inVarname];
				}
				if (!coreStore.getNode(outVarname)) {
					outNode = this.nodeToGroupMap[outVarname];
				}
				let plugPosition = {
					input : {
						nodeVarname : plug.input.nodeVarname,
						name : plug.input.name,
						pos : this.calcPlugPosition(true, plug, inNode)
					},
					output : {
						nodeVarname : plug.output.nodeVarname,
						name : plug.output.name,
						pos : this.calcPlugPosition(false, plug, outNode)
					}
				};
				this.emit(Store.PLUG_POSITION_CHANGED, null,  plugPosition);
				this.plugPositions.push(plugPosition);
			}
		}
	}

	/**
	 * プラグ位置を計算して返す.
	 * @param isInput 入力端子かどうか
	 * @param plug プラグ。
	 * @param node プラグが接続されているノード
	 */
	calcPlugPosition(isInput, plug, node) {
		let isClosed = node.node.close;
		if (isInput) {
			if (plug.input.nodeVarname === node.varname || this.isGroup(node)) {
				let count = 0;
				for (let k = 0; k < node.input.length; k = k + 1) {
					if (Array.isArray(node.input[k].array)) {
						let inputArray = node.input[k].array;
						for (let n = 0; n < inputArray.length; n = n + 1) {
							if (inputArray[n].name === plug.input.name) {
								return [node.node.pos[0], calcPlugPositionY(node, count)];
							}
							if (isClosed) {
								if (this.isConnected(node.varname, inputArray[n].name)) {
									count = count + 1;
								}
							} else {
								count = count + 1;
							}
						}
					} else {
						if (node.input[k].name === plug.input.name) {
							return [node.node.pos[0], calcPlugPositionY(node, count)];
						}
						if (isClosed) {
							if (this.isConnected(node.varname, node.input[k].name)) {
								count = count + 1;
							}
						} else {
							count = count + 1;
						}
					}
				}
			}
			//return [100000, node.node.pos[1]];
		} else {
			if (plug.output.nodeVarname === node.varname || this.isGroup(node)) {
				let width = 200;
				if (this.nodeSizeMap.hasOwnProperty(node.varname)) {
					width = this.nodeSizeMap[node.varname].width;
				}
				for (let k = 0; k < node.output.length; k = k + 1) {
					if (node.output[k].name === plug.output.name) {
						return [node.node.pos[0] + width, calcPlugPositionY(node, k)];
					}
				}
			}
			//return [-100000, node.node.pos[1]];
		}
		//console.error("notcalculate", this.isGroup(node), isInput, plug, node)
		return null;
	}

	calcSimplePlugPosition(plug) {
		let pos = [[0,0], [0,0]];
		if (this.nodeMap.hasOwnProperty(plug.input.nodeVarname)) {
			let node = this.nodeMap[plug.input.nodeVarname];
			pos[0] = [node.node.pos[0], calcSimplePlugPositionY(node)];
		}
		if (this.nodeMap.hasOwnProperty(plug.output.nodeVarname)) {
			let node = this.nodeMap[plug.output.nodeVarname];
			let width = this.nodeSizeMap[plug.output.nodeVarname].width;
			pos[1] = [node.node.pos[0] + width, calcSimplePlugPositionY(node)];
		}
		return pos;
	}

	/**
	 * plug位置リストを返す.
	 */
	getPlugPositions() {
		return this.plugPositions;
	}

	/**
	 * ノードサイズをセット
	 */
	setNodeSize(varname, width, height) {
		this.nodeSizeMap[varname] = { width : width, height : height };
	}

	/**
	 * 選択中の端子リストを返す
	 */
	getSelectedPlugHoles() {
		return this.selectedHoles;
	}

	/**
	 * ズーム値を返す.
	 */
	getZoom() {
		return this.zoom;
	}

	/**
	 * dispatchTokenを返す.
	 */
	getDispatchToken() {
		return this.dispatchToken;
	}

	/**
	 * アクションハンドラ
	 * @private
	 */
	actionHandler(payload) {
		if (payload && this.hasOwnProperty(payload.actionType)) {
			if (payload.hasOwnProperty("id") && payload.id === this.dispatchToken) {
				(() => {
					this[payload.actionType].bind(this)(payload);
				})();
			}
		}
	}

	/**
	 * プラグ位置を変更する.
	 * @private
	 */
	changePlugPosition(payload) {
		for (let i = 0; i < this.plugPositions.length; i = i + 1) {
			if (payload.isInput) {
				if (this.plugPositions[i].input.nodeVarname === payload.nodeVarname &&
					this.plugPositions[i].input.name === payload.name) {

					this.plugPositions[i].input.pos = JSON.parse(JSON.stringify(payload.pos));
					this.emit(Store.PLUG_POSITION_CHANGED, null, this.plugPositions[i]);
				}
			} else {
				if (this.plugPositions[i].output.nodeVarname === payload.nodeVarname &&
					this.plugPositions[i].output.name === payload.name) {

					this.plugPositions[i].output.pos = JSON.parse(JSON.stringify(payload.pos));
					this.emit(Store.PLUG_POSITION_CHANGED, null, this.plugPositions[i]);
				}
			}
		}
	}

	/// 入力端子にプラグが繋がっているかどうか返す
	isConnected(nodeVarname, inputName) {
		for (let i = 0; i < this.plugPositions.length; i = i + 1) {
			if (this.plugPositions[i].input.nodeVarname === nodeVarname) {
				if (Array.isArray(this.plugPositions[i].input.array)) {
					for (let k = 0; k < this.plugPositions[i].input.array.length; k = k + 1) {
						if (this.plugPositions[i].input.array[k].name === inputName) {
							return true;
						}
					}
				} else if (this.plugPositions[i].input.name === inputName) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * プラグのドラッグを開始する.
	 */
	dragPlug(payload) {
		if (payload.hasOwnProperty('plugInfo')) {
			this.emit(Store.PLUG_DRAGGING, null, payload.plugInfo, payload.inputPos, payload.outputPos);
		}
	}

	/**
	 * プラグのドラッグを終了する.
	 */
	endDragPlug(payload) {
		if (payload.hasOwnProperty('plugInfo')) {
			this.emit(Store.PLUG_DRAG_END, null, payload.plugInfo, payload.inputPos, payload.outputPos);
		}
	}

	/**
	 * プラグ端子を選択する
	 */
	selectPlugHole(payload) {
		if (payload.hasOwnProperty('plugInfo')) {
			this.selectedHoles.push(payload.plugInfo);
			this.emit(Store.PLUG_HOLE_SELECTED, null, this.selectedHoles);
		}
	}

	/**
	 * プラグ端子の選択を解除する
	 */
	unSelectPlugHoles(payload) {
		this.selectedHoles = [];
	}

	/**
	 * プラグ端子の接続を解除
	 */
	disconnectPlugHole(payload) {
		if (payload.hasOwnProperty('plugInfo')) {
			let plugInfo = payload.plugInfo;
			console.log(plugInfo);
			for (let i = 0; i < this.plugPositions.length; i = i + 1) {
				if (payload.plugInfo.isInput) {
					if (Array.isArray(this.plugPositions[i].input.array)) {
						let inputArray = this.plugPositions[i].input.array;
						for (let k = 0; k < inputArray.length; k = k + 1) {
							let input = inputArray[k];
							if (validatePlugInfo(this.plugPositions[i].input, payload.plugInfo, input.name)) {
								this.emit(Store.PLUG_HOLE_DISCONNECTED, null, this.plugPositions[i]);
								break;
							}
						}
					} else {
						if (validatePlugInfo(this.plugPositions[i].input, payload.plugInfo)) {
							this.emit(Store.PLUG_HOLE_DISCONNECTED, null, this.plugPositions[i]);
							break;
						}
					}
				} else {
					if (validatePlugInfo(this.plugPositions[i].output, payload.plugInfo)) {
						this.emit(Store.PLUG_HOLE_DISCONNECTED, null, this.plugPositions[i]);
						break;
					}
				}
			}
			// 外部へ公開していた場合は公開を中止する。
			if (payload.plugInfo.isInput) {
				let inputs = this.coreStore.getInput();
				for (let i = 0; i < inputs.length; i = i + 1) {
					let input = inputs[i];
					if (input.varname === plugInfo.data.varname &&
						input.name === plugInfo.data.name) {

						this.emit(Store.GROUP_INPUT_DISCONNECTED, null, input);
						break;
					}
				}
			} else {
				let outputs = this.coreStore.getOutput();
				for (let i = 0; i < outputs.length; i = i + 1) {
					let output = outputs[i];
					if (output.varname === plugInfo.data.varname &&
						output.name === plugInfo.data.name) {

						this.emit(Store.GROUP_OUTPUT_DISCONNECTED, null, output);
						break;
					}
				}
			}
		}
	}

	/**
	 * ノードを移動させる.
	 */
	moveNode(payload) {
		this.emit(Store.NODE_MOVED, null, payload.mv);
	}

	/**
	 * ズーム値を変更.
	 */
	changeZoom(payload) {
		if (payload.hasOwnProperty('zoom')) {
			this.zoom = payload.zoom;
			this.emit(Store.ZOOM_CHANGED, null, this.zoom);
		}
	}
}
Store.PLUG_COUNT_CHANGED = "plug_count_changed";
Store.PLUG_POSITION_CHANGED = "plug_position_changed";
Store.PLUG_DRAGGING = "plug_dragging";
Store.PLUG_DRAG_END = "plug_drag_end";
Store.PLUG_HOLE_SELECTED = "plug_hole_selected";
Store.PLUG_HOLE_DISCONNECTED = "plug_hole_disconnected";
Store.NODE_MOVED = "node_moved";
Store.ZOOM_CHANGED = "zoom_changed";
Store.NEED_RERENDER = "need_rerender";
Store.GROUP_INPUT_DISCONNECTED = "group_input_disconnected";
Store.GROUP_OUTPUT_DISCONNECTED = "group_output_disconnected";
