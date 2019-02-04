function createLeaf(value) {
    return {
        type: 'leaf',
        value: value,
        minLeft: value
    }
}
function is3Node(node) {
    return node && node.right;
}
function is2Node(node) {
    return node && !is3Node(node) && node.middle;
}
function isSingleNode(node) {
    return node && node.left && !is2Node(node);
}
const branchSet = ['left', 'middle', 'right', 'fourth'],
    spec = '_';
function createNode(left, middle, right, parent, fourth) {
    return {
        left: left,
        minLeft: left.minLeft,
        middle: middle,
        right: right,
        fourth: fourth,
        parent,
        type: 'node'
    }
}

function getBranch(node, key) {
    let foundTree = node.left;
    if (node.right && key >= node.right.minLeft) {
        foundTree = node.right;
    } else if (node.middle && key >= node.middle) {
        foundTree = node.middle;
    }
    return foundTree;
}

function find(node, key) {
    if (node.type === 'leaf') {
        return key === node.value ? node : null;
    }
    const foundTree = getBranch(node, key);
    const resTree = find(foundTree, key);
    if (!resTree || (resTree && resTree.type === 'leaf')) {
        return node;
    }
    return resTree;
}
// tree is node always
function insert(tree, key) {
    const finalNode = find(tree, key);
}
function createParamsSet(node, index) {
    const res = branchSet.map(branch => node[branch]);
    res[index] = spec;
}
function createGetNewParamsForNode(node, key) {
    let params;
    for (let i = 0; i < branchSet.length; i++) {
        if (node[branchSet[i]] && key < node[branchSet[i]].minLeft) {
            params = createParamsSet(node, i);
            break;
        }
    }
    return function (node) => {
        params[params.indexOf(spec)] = node;
        return params;
    }
}
function insertToNode(node, nodeToInsert) {
    // params for node in which to insert
    const params = createGetNewParamsForNode(node, nodeToInsert.minLeft)(nodeToInsert);
    if (params[3]) {
        // split node param into 2 nodes, get its parent and create params for it
        // create 2 params for 2 nodes
        // get new 4 node
        // call procedure split
    }
}