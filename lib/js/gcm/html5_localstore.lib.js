(function () {

function LocalStorageError() {
}

var html5_localstore = {

    is_supported: function () {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    },

    save: function (key, value) {
        gcm.log('Saving to localStorage: ' + "gcm." + key);

        window.localStorage.setItem('gcm.' + key, JSON.stringify(value));
    },

    get: function (key) {
        gcm.log('Loading from localStorage: ' + "gcm." + key);

        var json = window.localStorage.getItem('gcm.' + key);
        if (is_set(json)) {
            try {
                return JSON.parse(json);
            } catch (exception) {
                gcm.log('Exception encountered trying to parse saved JSON data: ' + exception);
                throw new LocalStorageError();
            }
        }

        return null;
    },

    remove: function (key) {
        gcm.log('Removing from localStorage: ' + "gcm." + key);

        return window.localStorage.removeItem('gcm.' + key);
    }
};

gcm.html5_localstore = html5_localstore;
})();
