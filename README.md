# Graph Editor

Reimplementation of [directed-graph-creator](https://github.com/cjrd/directed-graph-creator) with [D3](https://d3js.org/) v6 and a few improvements.

Demo: https://proceed-to-decode.com/posts/2020/graph-editor-demo/

## Usage

* Scroll to zoom in or out
* Drag whitespace to move graph  
* Shift-click on whitespace to create a node
* Shift-click on a node and drag to another node to connect them with a directed edge
* Shift-click on node or edge to change its title
* Click on node or edge and press backspace/delete to delete

## Improvements over original

* Optional edge labels
* Edge coloring includes arrow heads
* Upload fixed: current ID variable is initialized correctly from uploaded data, preventing bugs caused by duplicate IDs
* All positions relative to SVG container: elements outside SVG do not affect graph layout
* ES6 syntax and D3 v6

## TODO

* Multiline node labels
* Position editable edge labels

## License 

MIT-licensed, as the original.
