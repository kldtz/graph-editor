# Graph Editor

Reimplementation of [directed-graph-creator](https://github.com/cjrd/directed-graph-creator) with [D3](https://d3js.org/) v6.

## Bugfixes and improvements

* Upload fixed: current ID variable is initialized correctly from uploaded data, preventing bugs caused by duplicate IDs
* Edge coloring includes arrow heads
* All positions relative to SVG container: elements outside SVG do not affect graph layout
* ES6 syntax and D3 v6

## TODO

* Multiline node labels
* Automatically adjust to viewport
* Test in different Browsers (so far only Firefox 82)

## Usage

* Scroll to zoom in or out
* Drag whitespace to move graph  
* Shift-click on whitespace to create a node
* Shift-click on a node and drag to another node to connect them with a directed edge
* Shift-click on a node to change its title
* Click on node or edge and press backspace/delete to delete

## License 

MIT-licensed, as the original.