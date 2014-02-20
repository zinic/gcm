/*
    Constants
*/
var gcm = {};
window.gcm = gcm;


function gcm_on_key_down(passed_event) {
    var actual_event = window.event ? event : passed_event;

    if (actual_event.ctrlKey) {
        switch (actual_event.keyCode) {
            case 89:
                gcm_redo_change();
                break;

            case 90:
                gcm_undo_change();
                break;
        }
    }
}


/*
    Common functions
*/
var HEX_CHARACTER_VALUES = "0123456789abcdef";

function uuid4() {
    // http://www.ietf.org/rfc/rfc4122.txt
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
}

function dict_len(obj) {
    var size = 0;

    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }

    return size;
};

function gcm_format_unit(unit) {
    var value_html = '' + unit.value;

    if (unit.shorthand != null && unit.shorthand.length > 0) {
        value_html += '<span class="unit_shorthand">' + unit.shorthand + '</span>';
    }

    return value_html;
}

function gcm_process_template(template, value_dict, prefix) {
    var processed_template = template;

    for (var key in value_dict) {
        var prefixed_key =  (prefix != null && prefix.length > 0)  ? prefix + '.' + key : key;

        var value = value_dict[key];
        var value_type = typeof(value);

        if (value_type === 'string' || value_type === 'number' || value_type === 'boolean') {
            var regexp = new RegExp('\\${' + prefixed_key + '}');
            processed_template = processed_template.replace(regexp, value);
        } else if (value_type === 'object') {
            processed_template = gcm_process_template(processed_template, value, prefixed_key);
        }
    }

    return processed_template;
}

function gcm_skill_cp_cost(skill) {
    var cost = gcm.SKILL_DIFFICULTY_CP_COSTS[skill['difficulty']];

    if (cost == undefined) {
        gcm.log('Error. Unknown skill difficulty: ' + skill['difficulty']);
        cost = -1000;
    }

    var proficiency = skill['proficiency'];
    var negative_prof = proficiency < 0;

    for (var abs_prof = Math.abs(proficiency); abs_prof > 0; abs_prof--) {
        var value = abs_prof <= 2 ? abs_prof : 4;
        cost += negative_prof ? -1 * value : value;
    }

    return cost;
}

function gcm_basic_speed(attributes) {
    return (attributes['dexterity'] + attributes['health']) / 4 + attributes['basic_speed'];
}

function gcm_basic_move(attributes) {
    return gcm_basic_speed(attributes) + attributes['basic_move'];
}

function gcm_basic_lift(attributes) {
    var strength = attributes['strength'];

    return strength * strength / 5;
}

function is_set(value) {
    return value != null && value != undefined;
}

function is_not_set(value) {
    return !is_set(value);
}

/*
    Init hook
*/
function clone_object(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function gcm_change_character(key, type, value) {
    var new_change_id = uuid4();
    var changes = gcm.changes;

    changes.changeset[new_change_id] = {
        next: null,
        key: key,
        type: type,
        value: value
    };

    if (is_not_set(changes.head)) {
        changes.head = new_change_id;
    } else {
        if (is_set(changes.bookmark)) {
            gcm_trim_changes_to_bookmark();
        }

        changes.changeset[changes.tail].next = new_change_id;
    }

    gcm.changes.tail = new_change_id;
}

function gcm_redo_change() {
    var changes = gcm.changes;

    if (is_set(changes.bookmark)) {
        if (++changes.bookmark == dict_len(changes.changeset)) {
            changes.bookmark = null;
        }

        $.notify('Redoing', {
            className: 'info'
        });
    }

    gcm_render_character();
}

function gcm_undo_change() {
    var changes = gcm.changes;

    if (is_set(changes.head)) {
        if (is_set(changes.bookmark)) {
            if (changes.bookmark > 0) {
                changes.bookmark--;
            }
        } else {
            changes.bookmark = dict_len(changes.changeset) - 1;
        }

        $.notify('Undoing', {
            className: 'info'
        });
    }

    gcm_render_character();
}

function gcm_walk_changeset(delegate) {
    var changes = gcm.changes;

    if (is_set(changes.head)) {
        var next_change = changes.head;

        while (is_set(next_change)) {
            gcm.log('Walking: ' + next_change);

            var change = changes.changeset[next_change];
            var key = next_change;

            next_change = change.next;

            var stop = delegate(key, change);
            if (is_set(stop) && !stop) {
                break;
            }
        }
    }
}

function gcm_trim_changes_to_bookmark() {
    var changes = gcm.changes;
    var remaining = changes.bookmark;

    gcm_walk_changeset(function (key, change) {
        gcm.log('Reading: ' + key + ' with remaining: ' + remaining);

        if (remaining > 1) {
            remaining--;
        } else if (remaining == 1) {
            remaining--;

            gcm.log('Bookmarked at: ' + key);

            change.next = null;
            changes.tail = key;
        } else {
            gcm.log('Deleting: ' + key);
            delete changes.changeset[key];
        }
    });

    changes.bookmark = null;
}

function gcm_get_character() {
    var character = clone_object(gcm.character);
    var changes = gcm.changes;

    if (is_set(changes.head)) {
        var remaining = is_set(changes.bookmark) ?
            changes.bookmark : dict_len(changes.changeset);

        gcm_walk_changeset(function (key, change) {
            if (remaining-- == 0) {
                return false;
            }

            var obj_path = change.key.split('.');
            var target_obj = character;

            gcm.log('Processing change: ' + key + '(' + JSON.stringify(change) + ')');

            for (var i in obj_path) {
                if (is_not_set(target_obj)) {
                    gcm.log('Unable to locate object by key: ' + current_change.key);
                    break;
                }

                var path_part = obj_path[i];

                if (i + 1 < obj_path.length) {
                    target_obj = target_obj[path_part];
                } else {
                    apply_change(change, target_obj, path_part);
                }
            }
        });
    }

    return character;
}

function apply_change(change, parent_obj, target_key) {
    switch (change.type) {
        case 'cp_mod':
        case 'attr_mod':
            parent_obj[target_key] = change.value;
            break;

        default:
            gcm.log('Unknown change type; ' + change.type);
    }
}

function gcm_init() {
    gcm.LANGUAGE_FLUENCY_COST_MAP = {
        broken: 1,
        accented: 2,
        native: 3
    };

    gcm.SKILL_DIFFICULTY_CP_COSTS = {
        easy: 1,
        average: 2,
        hard: 4,
        very_hard: 8
    };

    gcm.changes = {
        tail: null,
        head: null,
        bookmark: null,
        changeset: {}
    };

    gcm.log = function(msg, level) {
        if (console != null) {
            console.log(msg);
        }
    }

    document.onkeydown = gcm_on_key_down;

    gcm_load_templates();
    gcm_load_character('./lib/example_character.json');
}

function gcm_clean_editable_elements(character) {
    var attributes = character.attributes;

    for (var attr_key in attributes) {
        var attribute = character.attributes;
        var target_element = '#' + attr_key + '_value';

        gcm.log('Attempting to destroy "' + target_element + '" editable.');

        $(target_element).editable('destroy')
    }
}

function gcm_init_editable_elements(character) {
    var attributes = character.attributes;

    for (var attr_key in attributes) {
        var attribute = character.attributes;
        var target_element = '#' + attr_key + '_value';

        gcm.log('Attempting to make "' + target_element + '" editable.');

        $(target_element).editable({
            type: 'text',
            title: 'Enter a new value.',

            success: (
                function (name) {
                    return function (response, new_value) {
                        gcm_change_character(
                            'attributes.' + name,
                            'attr_mod',
                            parseFloat(new_value));

                        gcm_render_character();
                    }
                })(attr_key)
        });
    }

    $('#initial_cp_value').editable({
        type: 'text',
        title: 'Enter a new value.',
        placement: 'bottom',

        success: function (response, new_value) {
            gcm_change_character(
                'initial_cp',
                'cp_mod',
                parseInt(new_value));

            gcm_render_character();
        }
    });

    $('#bonus_cp_value').editable({
        type: 'text',
        title: 'Enter a new value.',
        placement: 'bottom',

        success: function (response, new_value) {
            gcm_change_character(
                'bonus_cp',
                'cp_mod',
                parseInt(new_value));

            gcm_render_character();
        }
    });
}

function gcm_load_templates() {
    gcm.templates = {};

    gcm.log('Loading templates,');

    $.ajax({
        url: './templates/index.json',
        async: false,
        success: gcm_load_templates_from_index
    });
}

function gcm_load_templates_from_index(index) {
    var templates = index['templates'];

    for (var i in templates) {
        var template = templates[i];
        var key = /(.*)(?:.template.html)/.exec(template)[1];

        $.ajax({
            url: './templates/' + template,
            async: false,
            success: function (data) {
                gcm.log('Loaded template: ' + key);
                gcm.templates[key] = data;
            }
        });
    }
}

function gcm_calculate_basic_attribute_cost(attributes) {
    var cp_cost = 0;

    cp_cost += (attributes['strength'] - 10) * 10;
    gcm.log('Strength CP cost: ' + (attributes['strength'] - 10) * 10);

    cp_cost += (attributes['dexterity'] - 10) * 20;
    gcm.log('Dexterity CP cost: ' + (attributes['dexterity'] - 10) * 20);

    cp_cost += (attributes['iq'] - 10) * 20;
    gcm.log('IQ CP cost: ' + (attributes['iq'] - 10) * 20);

    cp_cost += (attributes['health'] - 10) * 10;
    gcm.log('Health CP cost: ' + (attributes['health'] - 10) * 10);

    cp_cost += (attributes['hp'] - attributes['strength']) * 2;
    gcm.log('HP CP cost: ' + (attributes['hp'] - attributes['strength']) * 2);

    cp_cost += (attributes['will'] - attributes['iq']) * 5;
    gcm.log('Will CP cost: ' + (attributes['will'] - attributes['iq']) * 5);

    cp_cost += (attributes['perception'] - attributes['iq']) * 5;
    gcm.log('Preception CP cost: ' + (attributes['perception'] - attributes['iq']) * 5);

    cp_cost += (attributes['fp'] - attributes['health']) * 3;
    gcm.log('FP CP cost: ' + (attributes['fp'] - attributes['health']) * 3);

    cp_cost += attributes['basic_speed'] * 20;
    gcm.log('Basic Speed CP cost: ' + attributes['basic_speed'] * 20);

    cp_cost += attributes['basic_move'] * 5;
    gcm.log('Basic Move CP cost: ' + attributes['basic_move'] * 5);

    return cp_cost;
}

function gcm_calculate_physical_features_cost(physical_features) {
    var reaction_modifiers = physical_features['reaction_modifiers'];
    var cp_cost = 0;

    for (var i in reaction_modifiers) {
        cp_cost += reaction_modifiers[i]['cp_cost'];
    }

    return cp_cost;
}

function gcm_language_cost(language) {
    var fluency_modifier = gcm.LANGUAGE_FLUENCY_COST_MAP[language['fluency']];
    var cost = 0;

    if (language['spoken']) {
        cost += fluency_modifier;
    }

    if (language['written']) {
        cost += fluency_modifier;
    }

    return cost;
}

function gcm_calculate_culture_features_cost(culture_features) {
    var languages = culture_features['languages'];

    // First language and culture are free
    var cp_cost = -7;
    cp_cost += culture_features['familiarities'].length;

    for (var i in languages) {
        cp_cost += gcm_language_cost(languages[i]);
    }

    return cp_cost;
}

function gcm_calculate_advantages_cost(advantages) {
    var cp_cost = 0;

    for (var i in advantages) {
        cp_cost += advantages[i]['cp_cost'];
    }

    return cp_cost;
}

function gcm_calculate_skills_cost(skills) {
    var cp_cost = 0;

    for (var i in skills) {
        var skill = skills[i];

        if (!skill['disabled']) {
            var cost = gcm_skill_cp_cost(skills[i]);

            gcm.log('Skill: ' + skill['name'] + ' - Cost: ' + cost);
            cp_cost += cost;
        }
    }

    return cp_cost;
}

function gcm_calculate_disadvantages_return(disadvantages) {
    var cp_return = 0;

    for (var i in disadvantages) {
        var disadvantage = disadvantages[i];

        if (!disadvantage['disabled']) {
            cp_return += disadvantages[i]['cp_return'];
        }
    }

    return cp_return;
}


/*
    Rendering functions
*/
function gcm_load_character(location) {
    $.get(location, function (character) {
        gcm.character = character;

        gcm_render_character();
    });
}

function gcm_render_character() {
    gcm.log('Rendering character');

    var character = gcm_get_character();

    gcm_clean_editable_elements(character);

    gcm_render_character_cp_values(character);
    gcm_render_character_identity(character);
    gcm_render_character_physical_features(character['physical_features']);
    gcm_render_character_attributes(character['attributes']);
    gcm_render_character_culture_features(character['culture_features']);
    gcm_render_character_advantages(character['advantages']);
    gcm_render_character_skills(character['skills']);
    gcm_render_character_disadvantages(character['disadvantages']);

    gcm_init_editable_elements(character);
}

function gcm_render_character_cp_values(character) {
    var initial_cp = character['initial_cp'];
    $('#initial_cp_value').html(initial_cp);
    gcm.log('Initial CP: ' + initial_cp);

    var bonus_cp = character['bonus_cp'];
    $('#bonus_cp_value').html(bonus_cp);
    gcm.log('Bonus CP: ' + bonus_cp);

    var basic_attribute_cp_cost = gcm_calculate_basic_attribute_cost(character['attributes']);
    gcm.log('Basic attribute CP cost: ' + basic_attribute_cp_cost);

    var physical_features_cp_cost = gcm_calculate_physical_features_cost(character['physical_features']);
    gcm.log('Physical Feature CP cost: ' + physical_features_cp_cost);

    var culture_features_cost = gcm_calculate_culture_features_cost(character['culture_features']);
    gcm.log('Cluture Feature CP cost: ' + culture_features_cost);

    var advantages_cp_cost = gcm_calculate_advantages_cost(character['advantages']);
    gcm.log('Advantage CP cost: ' + advantages_cp_cost);

    var skills_cp_cost = gcm_calculate_skills_cost(character['skills']);
    gcm.log('Skill CP cost: ' + skills_cp_cost);

    var spent_cp = culture_features_cost + basic_attribute_cp_cost + advantages_cp_cost + skills_cp_cost + physical_features_cp_cost;
    $('#spent_cp_value').html(spent_cp);

    var returned_cp = 0;
    returned_cp += gcm_calculate_disadvantages_return(character['disadvantages']);

    $('#returned_cp_value').html(returned_cp);
    $('#available_cp_value').html(initial_cp + bonus_cp + returned_cp - spent_cp);
}

function gcm_render_character_identity(character) {
    $('#character_name_value').html(character['name']);
    $('#player_name_value').html(character['player']);
    $('#character_tech_level_value').html(character['tech_level']);
}

function gcm_render_character_physical_features(physical_features) {
   for (var feature_key in physical_features) {
        var target_element = '#character_' + feature_key + '_value';
        $(target_element).html(gcm_format_unit(physical_features[feature_key]));
    }

    gcm_render_character_reaction_modifiers(physical_features['reaction_modifiers']);
}

function gcm_render_character_attributes(attributes) {
    for (var attr_key in attributes) {
        var target_element = '#' + attr_key + '_value';
        $(target_element).html(attributes[attr_key]);
    }

    gcm_render_character_movement(attributes);
}

function gcm_render_character_movement(attributes) {
    var basic_lift = gcm_basic_lift(attributes);
    var basic_speed = gcm_basic_speed(attributes);
    var basic_move = gcm_basic_move(attributes);
    var dodge = Math.floor(basic_speed) + 3;

    gcm.log('Basic lift: ' + basic_lift);
    gcm.log('Basic move: ' + basic_move);
    gcm.log('Basic speed: ' + basic_speed);
    gcm.log('Dodge: ' + dodge);

    var movement_obj = {
        "encumbrance": {
            none: basic_lift,
            light: (basic_lift * 2).toFixed(2),
            medium: (basic_lift * 3).toFixed(2),
            heavy: (basic_lift * 6).toFixed(2),
            x_heavy: (basic_lift * 10).toFixed(2)
        },

        "move": {
            none: Math.floor(basic_move),
            light: Math.floor(basic_move * 0.8),
            medium: Math.floor(basic_move * 0.6),
            heavy: Math.floor(basic_move * 0.4),
            x_heavy: Math.floor(basic_move * 0.2)
        },

        "dodge": {
            none: dodge,
            light: dodge - 1,
            medium: dodge - 2,
            heavy: dodge - 3,
            x_heavy: dodge - 4
        }
    };

    $('#movement_table_pane').html(gcm_process_template(gcm.templates.movement_table, movement_obj));
}

function gcm_render_character_culture_features(culture_features) {
    gcm_render_character_languages(culture_features['languages']);
    gcm_render_character_culture_familiarities(culture_features['familiarities']);
}

function gcm_render_character_languages(languages) {
    var html = '';

    for (var i in languages) {
        html += gcm_process_template(gcm.templates.language_table, languages[i]);
    }

    $('#language_tables_pane').html(html);
}

function gcm_render_character_reaction_modifiers(reaction_modifiers) {
    var html = '';

    for (var i in reaction_modifiers) {
        html += gcm_process_template(gcm.templates.reaction_modifiers_table, reaction_modifiers[i]);
    }

    $('#reaction_modifiers_tables_pane').html(html);
}

function gcm_render_character_culture_familiarities(culture_familiarities) {
    var html = '';

    for (var i in culture_familiarities) {
        html += gcm_process_template(gcm.templates.culture_familiarity_table, culture_familiarities[i]);
    }

    $('#culture_familiaritiy_tables_pane').html(html);
}

function gcm_render_character_advantages(advantages) {
    var html = '';

    for (var i in advantages) {
        html += gcm_process_template(gcm.templates.advantage_table, advantages[i]);
    }

    $('#advantage_tables_pane').html(html);
}

function gcm_render_character_skills(skills) {
    var html = '';

    for (var i in skills) {
        var skill = skills[i];
        skill['cp_cost'] = gcm_skill_cp_cost(skill);

        html += gcm_process_template(gcm.templates.skill_table, skill);
    }

    $('#skill_tables_pane').html(html);
}

function gcm_render_character_disadvantages(disadvantage) {
    var html = '';

    for (var i in disadvantage) {
        html += gcm_process_template(gcm.templates.disadvantage_table, disadvantage[i]);
    }

    $('#disadvantage_tables_pane').html(html);
}
