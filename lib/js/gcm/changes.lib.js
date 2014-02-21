(function () {
var change_manager = {

    DEFAULT_DRIVER: 'html5_localstore',

    data: {
        tail: null,
        head: null,
        bookmark: null,

        deltas: {}
    },

    num_changes: function () {
        return gcm.common.dict_len(change_manager.data.deltas);
    },

    bookmark: function() {
        return change_manager.data.bookmark;
    },

    has_bookmark: function() {
        return is_set(change_manager.data.bookmark);
    },

    has_changes: function() {
        return is_set(change_manager.data.head);
    },

    load: function (driver_type) {
        var driver_name = change_manager.DEFAULT_DRIVER;

        if (is_set(driver_type)) {
            gcm.common.notify.warn('Driver support for loading changes not yet supported.');
        }

        var datastore = gcm[driver_name];

        try {
            var saved_changes = datastore.get('changes');

            if (is_set(saved_changes)) {
                change_manager.data = saved_changes;
            }
        } catch (exception) {
            gcm.log('Falure: ' + exception);
            gcm.common.notify.warn('Failed to load saved data. Cleaning.');
            datastore.remove('changes');
        }
    },

    save: function (driver_type) {
        var driver_name = change_manager.DEFAULT_DRIVER;

        if (is_set(driver_type)) {
            gcm.common.notify.warn('Driver support for saving changes not yet supported.');
        }

        var datastore = gcm[driver_name];
        datastore.save('changes', change_manager.data);

        gcm.common.notify.success('Changes saved');
    },

    add: function(key, type, value) {
        if (change_manager.has_bookmark()) {
            change_manager.trim_at_bookmark();
        }

        var new_change_id = gcm.common.uuid4();

        change_manager.data.deltas[new_change_id] = {
            id: new_change_id,
            next: null,
            key: key,
            type: type,
            value: value
        };

        if (change_manager.has_changes()) {
            change_manager.data.deltas[change_manager.data.tail].next = new_change_id;
        } else {
            change_manager.data.head = new_change_id;
        }

        change_manager.data.tail = new_change_id;
        change_manager.save();
    },

    redo: function() {
        if (change_manager.has_bookmark()) {
            change_manager.data.bookmark += 1;

            if (change_manager.data.bookmark == change_manager.num_changes()) {
                change_manager.data.bookmark = null;
            }

            gcm.common.notify.success('Redoing');
        }
    },

    undo: function () {
        if (change_manager.has_changes()) {
            if (change_manager.has_bookmark()) {
                if (change_manager.data.bookmark > 0) {
                    change_manager.data.bookmark--;
                    gcm.common.notify.success('Undoing');
                }
            } else {
                change_manager.data.bookmark = change_manager.num_changes() - 1;
                gcm.common.notify.success('Undoing');
            }
        }
    },

    walk_changeset: function (delegate) {
        if (change_manager.has_changes()) {
            var next_change = change_manager.data.head;

            while (is_set(next_change)) {
                gcm.log('Walking: ' + next_change);

                var change = change_manager.data.deltas[next_change];
                var key = next_change;

                next_change = change.next;

                var stop = delegate(key, change);
                if (is_set(stop) && !stop) {
                    break;
                }
            }
        }
    },

    trim_at_bookmark: function () {
        var remaining = change_manager.data.bookmark;

        change_manager.walk_changeset(function (key, change) {
            gcm.log('Reading: ' + key + ' with remaining: ' + remaining);

            if (remaining > 1) {
                remaining--;
            } else if (remaining == 1) {
                remaining--;

                gcm.log('Bookmarked at: ' + key);

                change.next = null;
                change_manager.data.tail = key;
            } else {
                gcm.log('Deleting: ' + key);
                delete change_manager.data.deltas[key];
            }
        });

        if (change_manager.num_changes() == 0) {
            change_manager.data.head = null;
            change_manager.data.tail = null;
        }

        change_manager.data.bookmark = null;
    }
};

gcm.change_manager = change_manager;
})();
