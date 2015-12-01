function HTMLActuator() {
    this.tileContainer = document.querySelector(".tile-container");
    this.scoreContainer = document.querySelector(".score-container");
    this.bestContainer = document.querySelector(".best-container");
    this.messageContainer = document.querySelector(".game-message");
    this.savedMessageContainer = document.querySelector(".saved-game-message");

    this.score = 0;
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
    var self = this;

    window.requestAnimationFrame(function () {
        self.clearContainer(self.tileContainer);

        grid.cells.forEach(function (column) {
            column.forEach(function (cell) {
                if (cell) {
                    self.addTile(cell);
                }
            });
        });

        self.updateScore(metadata.score);
        self.updateBestScore(metadata.bestScore);

        if (metadata.over) self.message(false); // You lose
        if (metadata.won) self.message(true); // You win!
    });
};

HTMLActuator.prototype.restart = function () {
    this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
};

HTMLActuator.prototype.promote = function (unit) {
    switch (unit) {
        case '' :
            return 'K'
        case 'K' :
            return 'M'
        case 'M' :
            return 'G'
        case 'G' :
            return 'T'
        case 'T' :
            return 'P'
        case 'P' :
            return 'E'
        case 'E' :
            return 'Z'
        case 'Z' :
            return 'Y'
        default :
            return 'a lot & a lot'
    }
}

HTMLActuator.prototype.translateValue = function (value) {
    if (value < 128) {
        return {v: value, c: ''};
    } else if (value == 128) {
        return {v: '⅛', c: 'K'}
    } else if (value == 256) {
        return {v: '¼', c: 'K'}
    } else if (value == 512) {
        return {v: '½', c: 'K'}
    } else {
        v = this.translateValue(value / 1024);
        return {v: v.v, c: this.promote(v.c)};
    }
}

HTMLActuator.prototype.addTile = function (tile) {
    var self = this;

    var element = document.createElement("div");
    var position = tile.previousPosition || {x: tile.x, y: tile.y};
    positionClass = this.positionClass(position);

    // We can't use classlist because it somehow glitches when replacing classes
    var classes = ["tile", "tile-" + tile.value, positionClass];
    if (tile.value > 1048576)
        classes = ["tile", "tile-" + 1048576, positionClass];
    this.applyClasses(element, classes);

    textVal = self.translateValue(tile.value);
    element.textContent = textVal.v + textVal.c;

    if (tile.previousPosition) {
        // Make sure that the tile gets rendered in the previous position first
        window.requestAnimationFrame(function () {
            classes[2] = self.positionClass({x: tile.x, y: tile.y});
            self.applyClasses(element, classes); // Update the position
        });
    } else if (tile.mergedFrom) {
        classes.push("tile-merged");
        this.applyClasses(element, classes);

        // Render the tiles that merged
        tile.mergedFrom.forEach(function (merged) {
            self.addTile(merged);
        });
    } else {
        classes.push("tile-new");
        this.applyClasses(element, classes);
    }

    // Put the tile on the board
    this.tileContainer.appendChild(element);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
    element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
    return {x: position.x + 1, y: position.y + 1};
};

HTMLActuator.prototype.positionClass = function (position) {
    position = this.normalizePosition(position);
    return "tile-position-" + position.x + "-" + position.y;
};

HTMLActuator.prototype.updateScore = function (score) {
    this.clearContainer(this.scoreContainer);

    var difference = score - this.score;
    this.score = score;

    this.scoreContainer.textContent = this.score.toLocaleString();

    if (difference > 0) {
        var addition = document.createElement("div");
        addition.classList.add("score-addition");
        addition.textContent = "+" + difference;

        this.scoreContainer.appendChild(addition);
    }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
    this.bestContainer.textContent = bestScore.toLocaleString();
};

HTMLActuator.prototype.message = function (won) {
    var type = won ? "game-won" : "game-over";
    var message = won ? "You win!" : "Game over!";

    this.messageContainer.classList.add(type);
    this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
    this.messageContainer.classList.remove("game-won", "game-over");
};

HTMLActuator.prototype.savedMessage = function () {
    this.savedMessageContainer.classList.add("game-won");
    this.savedMessageContainer.getElementsByTagName("p")[0].textContent = "Saved game found";
};

HTMLActuator.prototype.clearSavedMessage = function () {
    this.savedMessageContainer.classList.remove("game-won");
};
