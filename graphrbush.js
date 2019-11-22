function RbushBbox(minx, miny, maxx, maxy, id) {
    this.minX = minx;
    this.minY = miny;
    this.maxX = maxx;
    this.maxY = maxy;
    this.id = id;
}
/**
 * Create Saturated graph from rbush bboxes array
 * @param bboxes {RbushBbox[]}
 * @returns {DiGraph|*}
 */
function createVerticalSaturatedGraph(bboxes) {
    var tree = rbush();
    tree.load(bboxes);
    const maxX = tree.data.maxX,
        maxY = tree.data.maxY,
        intersectionsX = {},
    // assign vertices according to ids of elements
        newIds = bboxes.reduce(function (map, element, index) {
            return {...map, [element.id]: index}
        }, {});
    bboxes.forEach((cmp) => {
        const checkBBox = {
            minX: cmp.minX+1,
            minY: cmp.minY+1,
            maxX: cmp.maxX-1,
            maxY: maxY-1
        };
        intersectionsX[cmp.id] = tree.search(checkBBox).map(treeRecord => treeRecord.id);
    });
    var g = new jsgraphs.DiGraph(bboxes.length);
    Object.keys(intersectionsX).forEach((key) => {
        const intersections = intersectionsX[key],
            newIdKey = newIds[key];
        intersections.filter(function (cmpId) {
            return cmpId !== key;
        }).forEach(cmpId => g.addEdge(newIdKey, newIds[parseInt(cmpId, 10)]));

});
    return g;
}

function createPlainGrpah(g) {
    var pg = new jsgraphs.Graph(g.V);
    for (var v = 0; v < g.V; ++v) {
        var adj_v = g.adjList[v];
        for (var i = 0; i < adj_v.length; ++i){
            var w = adj_v[i];
            pg.addEdge(w, v);
        }
    }
    return pg;
}

function findComponents(g) {
    const pg = createPlainGrpah(g);
    return new jsgraphs.ConnectedComponents(pg)
}

function rbushToColumnSize(tree) {
    return {
        minX: tree.data.minX,
        minY: tree.data.minY,
        maxX: tree.data.maxX,
        maxY: tree.data.maxY
    }
}