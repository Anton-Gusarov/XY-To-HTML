const G = {
    0: [1, 3, 2],
    1: [],
    2: [3, 5, 4],
    3: [8, 7],
    4: [6],
    5: [],
    6: [],
    7: [],
    8: []
};

function BFS(G, num) {
    Object.keys(G).forEach(key => {
        G[key].d = Infinity;
        G[key].p = null;
    });
    G[num].d = 0;
    const q = [];
    q.push(G[num]);
    while (q.length) {
        const u = q.shift();
        u.forEach((edgeNum) => {
           const a = G[edgeNum];
            if (a.black) return;
            q.push(a);
            if (a.d > u.d + 1) {
                a.d = u.d + 1;
            }
        });
        u.black = true;
    }
}

DFS(G, 0)

function DFS(G, num, callback = ()=>{}, start = {v: 1}) {
    if (G[num].start < start.v) return;
    G[num].start = start.v;
    callback(G, num);
    G[num].forEach(key => {
        if (G[key].black) return;
        start.v++;
        callback(G, key);
        DFS(G, key, callback, start);
    });
    start.v++;
    G[num].black = true;
    G[num].finish = start.v;
}
function CollectParentInfo(G, initialKey) {
    function proceed(G, num) {
        if (!G[num].parents) G[num].parents = {};
        if (num !== initialKey) G[num].parents[initialKey] = true;
        G[num].forEach(key => {
            proceed(G, key)
        });
    }
    proceed(G, initialKey);
}

function inverseGraph(adjList=[[]]) {
    const newAdjList = [];
    adjList.forEach((list, vertex) => {
        if (!newAdjList[vertex]) newAdjList[vertex] = []
        list.forEach(childVertex => {
            newAdjList[childVertex] = newAdjList[childVertex] ? [...newAdjList[childVertex], vertex] : [vertex];
    });
    });
    return newAdjList;
}