window.fakeStorage = {
    _data: {},

    setItem: function (id, val) {
        return this._data[id] = String(val);
    },

    getItem: function (id) {
        return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
    },

    removeItem: function (id) {
        return delete this._data[id];
    },

    clear: function () {
        return this._data = {};
    }
};

function LocalScoreManager() {
    var localSupported = !!window.localStorage;

    this.key = "bestScore_quad9";
    this.gridKey = "grid_quad9";
    this.metaKey = "meta_quad9";

    this.storage = localSupported ? window.localStorage : window.fakeStorage;
}

LocalScoreManager.prototype.get = function () {
    return this.storage.getItem(this.key) || 0;
};

LocalScoreManager.prototype.set = function (score) {
    this.storage.setItem(this.key, score);
};

LocalScoreManager.prototype.readState = function () {
    var grid, meta;
    try {
        grid = JSON.parse(this.storage.getItem(this.gridKey));
        meta = JSON.parse(this.storage.getItem(this.metaKey));
    } catch (e) {
        grid = meta = null;
    }
    return {grid: grid, meta: meta};
};

LocalScoreManager.prototype.saveState = function (grid, meta) {
    this.storage.setItem(this.gridKey, JSON.stringify(grid));
    this.storage.setItem(this.metaKey, JSON.stringify(meta));
};

LocalScoreManager.prototype.clearState = function () {
    this.storage.removeItem(this.gridKey);
    this.storage.removeItem(this.metaKey);
}

LocalScoreManager.prototype.hasData = function (size) {
    var t = JSON.parse(this.storage.getItem(this.gridKey));
    return null != t && t.size == size;
}