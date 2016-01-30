function GameManager(size, InputManager, Actuator, ScoreManager) {
    this.size = size; // Size of the grid
    this.inputManager = new InputManager;
    this.scoreManager = new ScoreManager;
    this.actuator = new Actuator;

    this.startTiles = 2;

    this.inputManager.on("move", this.move.bind(this));
    this.inputManager.on("restart", this.restart.bind(this));
    this.inputManager.on("loadGame", this.loadGame.bind(this));
    this.inputManager.on("startNew", this.startNew.bind(this));

    this.displayCells();

    if (this.scoreManager.hasData(this.size))
        this.displayMessage();
    else {
        this.scoreManager.clearState();
        this.setup();
    }
}

GameManager.prototype.displayCells = function() {
    var gridContainer = document.querySelector(".grid-container");
    for (var x = 0; x < this.size; x++) {
        var row = document.createElement("div");
        row.className = "grid-row";

        for (var y = 0; y < this.size; y++) {
            var cell = document.createElement("div");
            cell.className = "grid-cell";
            row.appendChild(cell);
        }
        gridContainer.appendChild(row);
    }
}

// Restart the game
GameManager.prototype.restart = function () {
    this.actuator.restart();
    this.startNew();
};

GameManager.prototype.displayMessage = function () {
    this.actuator.savedMessage();
}

GameManager.prototype.loadGame = function () {
    this.actuator.clearSavedMessage();
    this.setup();
}

GameManager.prototype.startNew = function () {
    this.actuator.clearSavedMessage();
    this.scoreManager.clearState();
    this.setup();
}

// Set up the game
GameManager.prototype.setup = function () {
    if (this.restoreGame()) {
    } else {
        this.grid = new Grid(this.size);

        this.score = 0;
        this.over = false;
        this.won = false;
    }
    stop_auto_move();

    // Add the initial tiles
    this.addStartTiles();

    // Update the actuator
    this.actuate();
    this.autoSave();
};

GameManager.prototype.restoreGame = function () {
    var state = this.scoreManager.readState();
    if (null == state.grid)
        return false;

    if (state.grid.size != this.size) {
        this.scoreManager.clearState();
        return false;
    }

    this.grid = new Grid(this.size, state.grid);
    this.score = state.meta.score;
    this.over = state.meta.over;
    this.won = state.meta.won;
    return true;
}

GameManager.prototype.autoSave = function () {
    this.scoreManager.saveState(this.grid, {
        score: this.score,
        over: this.over,
        won: this.won
    });
    setTimeout('GM.autoSave()', 5000);
}

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
    this.addSequentialTiles();
    for (var i = 0; i < this.startTiles; i++) {
        this.addRandomTile();
    }
};

// Populates all available tiles with increasing values
GameManager.prototype.addSequentialTiles = function () {
    var power = 0;
    var cells = this.grid.availableCells();
    while (cells.length > 0 && power < 86) {
        power += 1;
        var value = Math.pow(2, power);
        var tile = new Tile(cells[1], value);

        this.grid.insertTile(tile);
        cells = this.grid.availableCells();
    }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
    if (this.scoreManager.get() < this.score) {
        this.scoreManager.set(this.score);
    }

    this.actuator.actuate(this.grid, {
        score: this.score,
        over: this.over,
        won: this.won,
        bestScore: this.scoreManager.get()
    });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
    this.grid.eachCell(function (x, y, tile) {
        if (tile) {
            tile.mergedFrom = null;
            tile.savePosition();
        }
    });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
    // 0: up, 1: right, 2:down, 3: left
    var self = this;

    if (this.over || this.won) return; // Don't do anything if the game's over

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    // Save the current tile positions and remove merger information
    this.prepareTiles();

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = {x: x, y: y};
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    self.score += merged.value;

                    // The mighty 2048 tile
                    if (merged.value === 9007199254740992) self.won = true;
                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });

    if (moved) {
        this.addRandomTile();

        if (!this.movesAvailable()) {
            this.over = true; // Game over!
        }

        this.actuate();
        //} else {
        //    this.move(2);
        //    this.move(2);
        //    this.move(2);
    }
    return moved;
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: {x: 0, y: -1}, // up
        1: {x: 1, y: 0},  // right
        2: {x: 0, y: 1},  // down
        3: {x: -1, y: 0}   // left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
    var traversals = {x: [], y: []};

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = {x: previous.x + vector.x, y: previous.y + vector.y};
    } while (this.grid.withinBounds(cell) &&
    this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

GameManager.prototype.movesAvailable = function () {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
    var self = this;

    var tile;

    for (var x = 0; x < this.size; x++) {
        for (var y = 0; y < this.size; y++) {
            tile = this.grid.cellContent({x: x, y: y});

            if (tile) {
                for (var direction = 0; direction < 4; direction++) {
                    var vector = self.getVector(direction);
                    var cell = {x: x + vector.x, y: y + vector.y};

                    var other = self.grid.cellContent(cell);

                    if (other && other.value === tile.value) {
                        return true; // These two tiles can be merged
                    }
                }
            }
        }
    }

    return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};
