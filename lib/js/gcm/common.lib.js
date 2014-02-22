(function () {
var common = {
    uuid4: function () {
        // http://www.ietf.org/rfc/rfc4122.txt
        var HEX_CHARACTER_VALUES = "0123456789abcdef";
        var s = [];

        for (var i = 0; i < 36; i++) {
            var target_index = Math.floor(Math.random() * 0x10);
            s[i] = HEX_CHARACTER_VALUES[target_index];
        }

        // bits 12-15 of the time_hi_and_version field to 0010
        s[14] = "4";

        // bits 6-7 of the clock_seq_hi_and_reserved to 01
        s[19] = HEX_CHARACTER_VALUES[(s[19] & 0x3) | 0x8];

        // formatting
        s[8] = s[13] = s[18] = s[23] = "-";

        return s.join("");
    },

    notify: {
        raise: function (msg, type) {
            $.notify(msg, {
                className: type
            });
        },

        error: function (msg) {
            this.raise(msg, 'error');
        },

        warn: function (msg) {
            this.raise(msg, 'warn');
        },

        info: function (msg) {
            this.raise(msg, 'info');
        },

        success: function (msg) {
            this.raise(msg, 'success');
        }
    },

    clone: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    dict_len: function (obj) {
        var size = 0;

        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                size++;
            }
        }

        return size;
    },

    process_template: function (template, value_dict, prefix) {
        var processed_template = template;

        for (var key in value_dict) {
            var prefixed_key =  (prefix != null && prefix.length > 0)  ? prefix + '.' + key : key;

            var value = value_dict[key];
            var value_type = typeof(value);

            if (value_type === 'string' || value_type === 'number' || value_type === 'boolean') {
                var regexp = new RegExp('\\${' + prefixed_key + '}', 'g');
                processed_template = processed_template.replace(regexp, value);
            } else if (value_type === 'object') {
                processed_template = this.process_template(processed_template, value, prefixed_key);
            }
        }

        return processed_template;
    }
};

gcm.common = common;
})();
