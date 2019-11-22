function getMiddle(component, letter) {
    return (component['max' + letter] - component['min' + letter]) / 2 + component['min' + letter];
}
function getLayers(colsArray) {
    const cmpsQueue = [...colsArray].sort((a, b) => (b.zIndex - a.zIndex)),
        result = [];
    let accumulatedItems = [cmpsQueue.shift()];
    while (cmpsQueue.length) {
        const tree = rbush(),
            component = cmpsQueue.shift();
        tree.load(accumulatedItems);
        const overlapped =  tree.search(component),
            allChildren = overlapped
                .filter(cmp => {
                    if (cmp.zIndex <= component.zIndex) return false;
                    // filter out snapped components because rbush has non strict condition
                    if (cmp.maxX === component.minX || cmp.minX === component.maxX
                    || cmp.maxY === component.minY || cmp.minY === component.maxY) return false;
                    return getMiddle(cmp, 'X') >= component.minX
                        && getMiddle(cmp, 'X') < component.maxX
                        && getMiddle(cmp, 'Y') >= component.minY
                        && getMiddle(cmp, 'Y') < component.maxY;
                });
        // filter out these yielded nested items
        accumulatedItems = accumulatedItems.filter(cmp => {
            return !allChildren.find(nestedItem => nestedItem.id === cmp.id);
        });
        if (allChildren.length) {
            result.push({
                block: component,
                items: allChildren
            })
        }
        accumulatedItems.push(component);
    }
    return result;
}