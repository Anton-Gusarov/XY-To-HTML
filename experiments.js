// create new row. Create column only after inspecting all children.
const graphDS = {
        // descenders 2, 3, 4, 9, 6, 11, 7, 8, 13, 12. descendant bbox is calculated. After inspecting siblings - create a simple row-col
        1: [2], // create a col and insert to row
        // Dont have siblings. descend bbox is calced
        2: [3,4,9], //create a major column for containing the descandants. Put 2 in a separate row-col
        // descend. bbox is calc. (13, 13) Calc siblings bboxes. (13, 13). Remove 13. Calc bbox again. (8, 8). Siblings's - (12, 8), (11, 11). Remove 8. 3 - (6, 7), 4 - (12, 12).
        3: [6], // Create a major column. Because it shares same children (any level but can be implemented on a first) with siblings, extend column to that sibling by X.
        // bbox by 13
        4: [6, 12], // bbox is diff but it has common children. Create new major column for each of new child. Add it
        5: [2], // bbox matches to 1. create a basic row col.
        // create a major column because it has
        6: [7,8], //
        7: [13], // has diff bbox. It will be within 3's by theory. Create a major column. But since we have only 1 component,
        8: [13], // because it is a second child we can consider apart from creating a new row, accomodate its major column next to its left sibling. In which cases to do it or not is still a question. Lets do it by default
        // bbox by 13
        9: [11],
        10: [11],
        11: [13],
        12: [13],
        13: []
    },
    sGraph = [
        [5, 1, 2, 3],
        [4],
        [4, 5],
        [5],
        [5],
        []
    ];
var g2 = new jsgraphs.DiGraph(sGraph.length);
sGraph.forEach((list, index) => {
    list.forEach(child => {
    // g.addEdge(index, child);
    g2.addEdge(index, child);
})
});
var g3 = new jsgraphs.DiGraph(sGraph.length);
sGraph.forEach((list, index) => {
    list.forEach(to => {
    g3.addEdge(index, to);
})
});