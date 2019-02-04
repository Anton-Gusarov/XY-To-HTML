function ballmanFordLongest(G, s) {
    jsgraphs.BellmanFord.call(this, G, s);
}
ballmanFordLongest.prototype = Object.assign({}, jsgraphs.BellmanFord.prototype);
ballmanFordLongest.prototype.relax = function(e) {

    var v = e.from();
    var w = e.to();

    if(this.cost[w] > this.cost[v] + e.weight) {
        this.cost[w] = this.cost[v] + e.weight;
        this.marked[w] = true;
        this.edgeTo[w] = e;
    }
};
// this is new push down
/*
var g = new jsgraphs.WeightedDiGraph(bboxes.length+1);
Object.keys(intersectionsX).forEach((key) => {
    const intersections = intersectionsX[key];
    intersections.forEach(cmpId => g.addEdge(new jsgraphs.Edge(parseInt(key, 10), parseInt(cmpId, 10), -1)));

});
var bf = new jsgraphs.BellmanFord(g, 1);

for(var v = 1; v < g.V; ++v){
    if(bf.hasPathTo(v)){
        var path = bf.pathTo(v);
        console.log(path)
        console.log('=====path from 0 to ' + v + ' start==========');
        for(var i = 1; i < path.length; ++i) {
            var e = path[i];
            console.log(e.from() + ' => ' + e.to() + ': ' + e.weight);
        }
        console.log('=====path from 0 to ' + v + ' end==========');
        console.log('=====distance: '  + bf.distanceTo(v) + '=========');
    }
}*/