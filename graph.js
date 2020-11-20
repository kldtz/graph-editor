class Graph {
    constructor(opts) {
        this.nodes = opts.nodes;
        // current id == maximum id
        this.nodeId = this.nodes.reduce((prev, curr) => {
            return (prev.id > curr.id) ? prev.id : curr.id
        });
        this.setEdges(opts.edges)
        this.element = opts.element;
        this.state = {
            mouseOverNode: null,
            shiftNodeDrag: false,
            selectedNode: null,
            selectedEdge: null,
        }
        this.consts = {
            BACKSPACE_KEY: 8,
            DELETE_KEY: 46,
            NODE_RADIUS: 50,
            CLICK_DISTANCE: 5,
            ENTER_KEY: 13,
        }
        this.draw();
    }

    setEdges(edges) {
        // map source and target id to respective node
        this.edges = edges.map(e => {
            return {
                source: this.nodes.find(n => n.id == e.source),
                target: this.nodes.find(n => n.id == e.target),
                label: e.label
            }
        });
    }

    draw() {
        this.width = 1000;
        this.height = 800;

        d3.select(window).on("keydown", (event) => {
            switch (event.keyCode) {
                case this.consts.BACKSPACE_KEY:
                case this.consts.DELETE_KEY:
                    if (this.state.selectedNode) {
                        event.preventDefault();
                        const selected = this.state.selectedNode;
                        this.nodes = this.nodes.filter(node => { return selected !== node; });
                        this.edges = this.edges.filter(edge => { return edge.source !== selected && edge.target !== selected; });
                        this.update();
                    } else if (this.state.selectedEdge) {
                        event.preventDefault();
                        const selected = this.state.selectedEdge;
                        this.edges = this.edges.filter(edge => { return selected !== edge; });
                        this.updateEdges();
                    }
                    break;
            }
        });

        this.svg = this.element.append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .style("border", "solid 1px");

        // add zoom behavior to whole svg
        const zoom = d3.zoom()
            .clickDistance(this.consts.CLICK_DISTANCE)
            .on('zoom', (event) => {
                this.plot.attr('transform', event.transform);
            });
        // prepare SVG
        this.svg
            .on("mousedown", (event, d) => {
                if (event.shiftKey) {
                    const pos = d3.pointer(event, graph.plot.node())
                    const node = { id: ++this.nodeId, title: this.nodeId.toString(), x: pos[0], y: pos[1] }
                    this.nodes.push(node);
                    this.updateNodes();
                }
            })
            .on('click', () => {
                this.state.selectedNode = null;
                this.state.selectedEdge = null;
                this.update();
            })
            .call(zoom);

        this.defineMarkers();

        // drag behavior
        const graph = this;
        this.drag = d3.drag()
            .clickDistance(this.consts.CLICK_DISTANCE)
            .on("drag", function (event, d) {
                if (graph.state.shiftNodeDrag) {
                    const pos = d3.pointer(event, graph.plot.node());
                    graph.dragLine.attr('d', 'M' + d.x + ',' + d.y + 'L' + pos[0] + ',' + pos[1]);
                } else {
                    d.x = event.x;
                    d.y = event.y;
                    d3.select(this).raise().attr("transform", d => "translate(" + [d.x, d.y] + ")");
                    graph.updateEdges();
                }
            })
            .on("end", (event, source) => {
                this.state.shiftNodeDrag = false;
                // hide line, remove arrow tip
                this.dragLine.classed("hidden", true);

                const target = this.state.mouseOverNode;

                if (!source || !target) return;

                // source and target are different
                if (source !== target) {
                    // remove edge between source and target (any order)
                    this.edges = this.edges.filter(edge => {
                        return !(edge.source === source && edge.target === target) &&
                            !(edge.source === target && edge.target === source);
                    });
                    var newEdge = { source: source, target: target };
                    this.edges.push(newEdge);
                    this.updateEdges();
                }
            });

        // populate svg
        this.plot = this.svg.append('g');

        // displayed when dragging between nodes
        this.dragLine = this.plot.append('path')
            .classed('line', true)
            .classed('dragline', true)
            .classed('hidden', true)
            .attr('d', 'M0,0L0,0');

        // circles need to be added last to be drawn above the paths
        this.paths = this.plot.append('g').classed('edges', true);
        this.circles = this.plot.append('g').classed('nodes', true);

        this.update();
    }

    defineMarkers() {
        const defs = this.svg.append('defs');
        // arrow marker for edge
        defs.append('marker')
            .attr('id', 'end-arrow')
            // keep same scale
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('viewBox', '-20 -10 20 20')
            .attr('markerWidth', 20)
            .attr('markerHeight', 20)
            // tip of marker at circle (cut off part of tip that is thinner than line)
            .attr('refX', this.consts.NODE_RADIUS - 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M-20,-10L0,0L-20,10');
        // arrow marker for selected edge (to allow separate CSS styling)
        defs.append('marker')
            .attr('id', 'selected-end-arrow')
            // keep same scale
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('viewBox', '-20 -10 20 20')
            .attr('markerWidth', 20)
            .attr('markerHeight', 20)
            // tip of marker at circle (cut off part of tip that is thinner than line)
            .attr('refX', this.consts.NODE_RADIUS - 3)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M-20,-10L0,0L-20,10');
        // arrow marker for leading arrow
        defs.append('marker')
            .attr('id', 'mark-end-arrow')
            // keep same scale
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('viewBox', '-20 -10 20 20')
            .attr('markerWidth', 20)
            .attr('markerHeight', 20)
            // tip of marker at end of line
            .attr('refX', -5)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M-20,-10L0,0L-20,10');
    }

    update() {
        this.updateEdges();
        this.updateNodes();
    }

    updateNodes() {
        // enter node groups
        const nodes = this.circles.selectAll("g")
            .data(this.nodes, d => { return d.id; })
            .join(
                enter => {
                    const nodes = enter.append("g")
                        .attr("class", "node")
                        .attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
                        .on("mousedown", (event, d) => {
                            event.stopPropagation();
                            if (event.shiftKey) {
                                this.state.shiftNodeDrag = true;
                                this.dragLine.classed('hidden', false)
                                    .attr('d', 'M' + d.x + ',' + d.y + 'L' + d.x + ',' + d.y);
                            }
                        })
                        .on("mouseover", (event, d) => { this.state.mouseOverNode = d; })
                        .on("mouseout", () => { this.state.mouseOverNode = null; })
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            if (event.shiftKey) {
                                this.editNodeLabel(d);
                            } else {
                                this.state.selectedNode = d;
                                this.state.selectedEdge = null;
                                this.update();
                            }
                        })
                        .call(this.drag);

                    nodes.append("circle")
                        .attr("r", String(this.consts.NODE_RADIUS));

                    nodes.append("text")
                        .attr("dy", 5)
                        .text(d => { return d.title; });
                },
                update => {
                    update.attr("transform", d => { return "translate(" + d.x + "," + d.y + ")"; })
                        .classed("selected", d => { return d === this.state.selectedNode; });

                    update.select("text")
                        .text(d => { return d.title; });
                },
                exit => exit.remove()
            );
    }

    editNodeLabel(d) {
        const selection = this.circles.selectAll('g').filter(function (dval) {
            return dval.id === d.id;
        });
        // hide current label
        const text = selection.selectAll("text").classed("hidden", true);
        // add intermediate editable paragraph
        const d3txt = this.plot.selectAll("foreignObject")
            .data([d])
            .enter()
            .append("foreignObject")
            .attr("x", d.x - this.consts.NODE_RADIUS)
            .attr("y", d.y - 13)
            .attr("height", 2 * this.consts.NODE_RADIUS)
            .attr("width", 2 * this.consts.NODE_RADIUS)
            .append("xhtml:div")
            .attr("id", "editable-p")
            .attr("contentEditable", "true")
            .style("text-align", "center")
            //.style("border", "1px solid")
            .text(d.title)
            .on("mousedown", (event, d) => {
                event.stopPropagation();
            })
            .on("keydown", (event, d) => {
                event.stopPropagation();
                if (event.keyCode == this.consts.ENTER_KEY) {
                    event.target.blur();
                }
            })
            .on("blur", (event, d) => {
                d.title = event.target.textContent;
                d3.select(event.target.parentElement).remove();
                this.updateNodes();
                text.classed("hidden", false);
            });
        d3txt.node().focus();
    }

    updateEdges() {
        this.paths.selectAll(".edge")
            .data(this.edges, this.edgeId)
            .join(
                enter => {
                    const edges = enter.append("g")
                        .classed("edge", true)
                        .on("click", (event, d) => {
                            event.stopPropagation();
                            if (event.shiftKey) {
                                this.editEdgeLabel(d);
                            } else {
                                this.state.selectedEdge = d;
                                this.state.selectedNode = null;
                                this.update();
                            }
                        })
                        .on("mousedown", (event, d) => {
                            event.stopPropagation();
                        });

                    edges.append("path")
                        .attr("id", this.edgeId)
                        .classed("line", true)
                        .attr("d", d => {
                            return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                        });

                    edges.append("text")
                        .attr("class", "edge-label")
                        .attr("dy", - 10)
                        .attr("fill", "black")
                        .append("textPath")
                        .attr("xlink:href", d => "#" + this.edgeId(d))
                        .attr("text-anchor", "middle")
                        .attr("startOffset", "50%")
                        .text(d => d.label);
                },
                update => {
                    update.classed("selected", d => { return d === this.state.selectedEdge; });

                    update.select("path")
                        .attr("d", d => {
                            return "M" + d.source.x + "," + d.source.y + "L" + d.target.x + "," + d.target.y;
                        });

                    update.select("text").select("textPath").text(d => d.label);
                },
                exit => exit.remove()
            );
    }

    edgeId(d) {
        return String(d.source.id) + "+" + String(d.target.id);
    }

    editEdgeLabel(d) {
        const selection = this.paths.selectAll('g').filter(dval => {
            return this.edgeId(dval) === this.edgeId(d);
        });
        // hide current label
        const text = selection.selectAll("text").classed("hidden", true);
        // add intermediate editable paragraph
        const d3txt = this.plot.selectAll("foreignObject")
            .data([d])
            .enter()
            .append("foreignObject")
            // TODO: middle position + rotate via transform: rotate(20deg);
            .attr("x", d.target.x - (d.target.x - d.source.x) / 2)
            .attr("y", d.target.y - (d.target.y - d.source.y) / 2)
            .attr("height", 100)
            .attr("width", 100)
            .append("xhtml:div")
            //.style("transform", "rotate(20deg)")
            .attr("id", "editable-p")
            .attr("contentEditable", "true")
            .style("text-align", "center")
            //.style("border", "1px solid")
            .text(d.label)
            .on("mousedown", (event, d) => {
                event.stopPropagation();
            })
            .on("keydown", (event, d) => {
                event.stopPropagation();
                if (event.keyCode == this.consts.ENTER_KEY) {
                    event.target.blur();
                }
            })
            .on("blur", (event, d) => {
                d.label = event.target.textContent;
                d3.select(event.target.parentElement).remove();
                this.updateEdges();
                text.classed("hidden", false);
            });
        d3txt.node().focus();
    }

    clear() {
        const doDelete = window.confirm("Do you really want to delete the whole graph?");
        if (doDelete) {
            this.nodes = []
            this.edges = []
            this.update();
        }
    }

    load(nodes, edges) {
        this.nodeId = nodes.reduce(function (prev, curr) {
            return (prev.id > curr.id) ? prev.id : curr.id
        });
        this.nodes = nodes;
        this.setEdges(edges);
        this.update();
    }

    serialize() {
        const saveEdges = this.edges.map(edge => {
            return { source: edge.source.id, target: edge.target.id };
        });
        return new window.Blob([window.JSON.stringify({ "nodes": this.nodes, "edges": saveEdges })], { type: "text/plain;charset=utf-8" });
    }
}

/* Main */

const graph = new Graph({
    element: d3.select("#graph"),
    nodes: [{ id: 1, title: "A", x: 250, y: 150 },
    { id: 2, title: "B", x: 800, y: 500 },
    { id: 3, title: "C", x: 200, y: 700 }],
    edges: [
        { source: 1, target: 2, label: "Hello" },
        { source: 2, target: 3, label: "World!" }
    ]
})

d3.select("#delete-graph").on("click", () => {
    graph.clear();
});

d3.select("#download-input").on("click", () => {
    saveAs(graph.serialize(), "dag-download.json");
});


d3.select("#upload-input").on("click", function () {
    document.getElementById("select-file").click();
});

d3.select("#select-file").on("change", function () {
    var files = document.getElementById('select-file').files;
    if (files.length <= 0) {
        return false;
    }

    var fr = new FileReader();

    fr.onload = function (e) {
        try {
            const result = JSON.parse(e.target.result);
            graph.load(result.nodes, result.edges);
        } catch (err) {
            window.alert("Error loading graph from file!\nError message: " + err.message);
            return;
        }
    }

    fr.readAsText(files.item(0));
});