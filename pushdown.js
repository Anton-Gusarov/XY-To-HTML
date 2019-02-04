function calcNewTopPositions(rows, heightChanged, components, val, heightChanges) {
    const affectedComponentsMap = heightChanged.reduce((acc, cmp) => {
        acc[cmp.id] =findComponentsFurtherInPath(rows, findPathToComponent(rows, cmp.id));
        return acc;
    }, {}),
        componentInListMap = components.reduce((acc, component, index) => {
            acc[component.id] = index;
            return acc;
        }, {}),
        g = new jsgraphs.WeightedDiGraph(components.length),
        componentsChangesMapMap = {};
    Object.keys(affectedComponentsMap).forEach(heightChangedId => {
        affectedComponentsMap[heightChangedId].forEach(affectedComponent => {
            g.addEdge(
                new jsgraphs.Edge(
                    componentInListMap[heightChangedId],
                    componentInListMap[affectedComponent],
                    -heightChanges[heightChangedId] || -val
                )
        );
        });
    });
    heightChanged.forEach(hcComponent => {
        const dijkstra = new jsgraphs.Dijkstra(g, componentInListMap[hcComponent.id]);
        componentsChangesMapMap[hcComponent.id] = components.reduce((acc, component) => {
            acc[component.id] = dijkstra.distanceTo(componentInListMap[component.id]);
            return acc;
        }, {});
    });
    return components.reduce((acc, component) => {
        acc[component.id] = - Object.keys(componentsChangesMapMap).reduce((min, key) => {
            return min < componentsChangesMapMap[key][component.id] ? min : componentsChangesMapMap[key][component.id];
        }, 0);
        if (acc[component.id] <= 0) delete acc[component.id];
        return acc;
    }, {});
}