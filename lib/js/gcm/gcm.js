/*
    Constants
*/
var gcm = {};
window.gcm = gcm;

window.is_set = function (value) {
    return value !== null && value !== undefined;
}

window.is_not_set = function (value) {
    return !is_set(value);
}


var gcm = {};
window.gcm = gcm;

gcm.MODULE_INIT = '_gcm_module_init';

gcm.log = function(msg, level) {
    if (console != null) {
        console.log(msg);
    }
};

gcm.include = function (script_ref) {
    $.ajax({
        url: script_ref,
        async: false,
        dataType: 'text',

        success: function (data) {
            gcm.log('Loading module: ' + script_ref);

            try {
                eval(data);
            } catch (exception) {
                gcm.log(exception);
            }
        },

        error: function (err) {
            gcm.log(err);
        }
    });
};

gcm.include('/lib/js/gcm/common.lib.js');
gcm.include('/lib/js/gcm/json.lib.js');
gcm.include('/lib/js/gcm/gurps.lib.js');
gcm.include('/lib/js/gcm/html5_localstore.lib.js');
gcm.include('/lib/js/gcm/changes.lib.js');


function gcm_on_key_down(passed_event) {
    var actual_event = window.event ? event : passed_event;

    if (actual_event.ctrlKey) {
        switch (actual_event.keyCode) {
            case 77: //M
                var confirmed = confirm('Warning! This will reset all local data. Are you sure?');

                if (confirmed) {
                    gcm.change_manager.reset();
                }
                break;

            case 89: //Y
                gcm.change_manager.redo();
                gcm_render_character();
                break;

            case 90: //Z
                gcm.change_manager.undo();
                gcm_render_character();
                break;
        }
    }
}

function gcm_format_unit(unit) {
    var value_html = '' + unit.value;

    if (unit.shorthand != null && unit.shorthand.length > 0) {
        value_html += '<span class="unit_shorthand">' + unit.shorthand + '</span>';
    }

    return value_html;
}

/*
    Init hook
*/

function gcm_get_character() {
    var character = gcm.common.clone(gcm.character);
    var changes = gcm.changes;

    if (gcm.change_manager.has_changes()) {
        var bookmark = gcm.change_manager.bookmark();
        var remaining = gcm.change_manager.has_bookmark() ?
            gcm.change_manager.bookmark() : gcm.change_manager.num_changes();

        gcm.change_manager.walk_changeset(function (id, change) {
            if (remaining-- == 0) {
                return false;
            }

            switch (change.type) {
                case 'tav_mod':
                    apply_tav_change(change, character);
                    break;

                case 'remove':
                    remove_by_path(change, character);
                    break;

                default:
                    gcm.log('Unknown change type; ' + change.type);
            }

        });
    }

    return character;
}

function gcm_remove_language(name) {
    gcm.change_manager.add(
        "$.culture_features.languages[?(@['name']=='" + name + "')]",
        'remove');

    gcm_render_character();
}

function remove_by_path(change, character) {
    var target = gcm.json.locate(change.specifier, character);

    if (is_set(target)) {
        target.remove();
    } else {
        gcm.common.notify.error('Unable to remove: ' + JSON.stringify(change));
    }
}

function apply_tav_change(change, character) {
    var target = gcm.json.locate(change.specifier, character);

    if (is_set(target)) {
        target.set(change.value);
    } else {
        gcm.common.notify.error('Unable to update: ' + JSON.stringify(change));
    }
}

function gcm_init() {
    document.onkeydown = gcm_on_key_down;

    gcm.change_manager.load();

    gcm_load_templates();
    gcm_load_character('./lib/example_character.json');
}

function gcm_clean_editable_elements(character) {
    var attributes = character.attributes;

    for (var attr_key in attributes) {
        var attribute = character.attributes;
        var target_element = '#' + attr_key + '_value';

        $(target_element).editable('destroy')
    }
}

function gcm_init_editable_elements(character) {
    var attributes = character.attributes;

    for (var attr_key in attributes) {
        var attribute = character.attributes;
        var target_element = '#' + attr_key + '_value';

        $(target_element).editable({
            type: 'text',
            title: 'Enter a new value.',

            success: (
                function (name) {
                    return function (response, new_value) {
                        gcm.change_manager.add(
                            '$.attributes.' + name,
                            'tav_mod', parseFloat(new_value));
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
            gcm.change_manager.add(
                '$.initial_cp',
                'tav_mod', parseInt(new_value));

            gcm_render_character();
        }
    });

    $('#bonus_cp_value').editable({
        type: 'text',
        title: 'Enter a new value.',
        placement: 'bottom',

        success: function (response, new_value) {
            gcm.change_manager.add(
                '$.bonus_cp',
                'tav_mod',  parseInt(new_value));

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

    var basic_attribute_cp_cost = gcm.gurps.attributes_cp_cost(character['attributes']);
    gcm.log('Basic attribute CP cost: ' + basic_attribute_cp_cost);

    var physical_features_cp_cost = gcm.gurps.physical_features_cp_cost(character['physical_features']);
    gcm.log('Physical Feature CP cost: ' + physical_features_cp_cost);

    var culture_features_cost = gcm.gurps.culture_features_cp_cost(character['culture_features']);
    gcm.log('Cluture Feature CP cost: ' + culture_features_cost);

    var advantages_cp_cost = gcm.gurps.advantages_cp_cost(character['advantages']);
    gcm.log('Advantage CP cost: ' + advantages_cp_cost);

    var skills_cp_cost = gcm.gurps.skills_cp_cost(character['skills']);
    gcm.log('Skill CP cost: ' + skills_cp_cost);

    var spent_cp = culture_features_cost + basic_attribute_cp_cost + advantages_cp_cost + skills_cp_cost + physical_features_cp_cost;
    $('#spent_cp_value').html(spent_cp);

    var returned_cp = 0;
    returned_cp += gcm.gurps.disadvantages_cp_return(character['disadvantages']);

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
    var basic_lift = gcm.gurps.basic_lift(attributes);
    var basic_speed = gcm.gurps.basic_speed(attributes);
    var basic_move = gcm.gurps.basic_move(attributes);
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

    $('#movement_table_pane').html(
        gcm.common.process_template(gcm.templates.movement_table, movement_obj));
}

function gcm_render_character_culture_features(culture_features) {
    gcm_render_character_languages(culture_features['languages']);
    gcm_render_character_culture_familiarities(culture_features['familiarities']);
}

function gcm_render_character_languages(languages) {
    var html = '';

    for (var i in languages) {
        html += gcm.common.process_template(gcm.templates.language_table, languages[i]);
    }

    $('#language_tables_pane').html(html);
}

function gcm_render_character_reaction_modifiers(reaction_modifiers) {
    var html = '';

    for (var i in reaction_modifiers) {
        html += gcm.common.process_template(gcm.templates.reaction_modifiers_table, reaction_modifiers[i]);
    }

    $('#reaction_modifiers_tables_pane').html(html);
}

function gcm_render_character_culture_familiarities(culture_familiarities) {
    var html = '';

    for (var i in culture_familiarities) {
        html += gcm.common.process_template(gcm.templates.culture_familiarity_table, culture_familiarities[i]);
    }

    $('#culture_familiaritiy_tables_pane').html(html);
}

function gcm_render_character_advantages(advantages) {
    var html = '';

    for (var i in advantages) {
        html += gcm.common.process_template(gcm.templates.advantage_table, advantages[i]);
    }

    $('#advantage_tables_pane').html(html);
}

function gcm_render_character_skills(skills) {
    var html = '';

    for (var i in skills) {
        var skill = skills[i];
        skill['cp_cost'] = gcm.gurps.skill_cp_cost(skill);

        html += gcm.common.process_template(gcm.templates.skill_table, skill);
    }

    $('#skill_tables_pane').html(html);
}

function gcm_render_character_disadvantages(disadvantage) {
    var html = '';

    for (var i in disadvantage) {
        html += gcm.common.process_template(gcm.templates.disadvantage_table, disadvantage[i]);
    }

    $('#disadvantage_tables_pane').html(html);
}
