/*
    Constants
*/
var gcm = {};
window.gcm = gcm;

gcm.LANGUAGE_FLUENCY_COST_MAP = {
    'broken': 1,
    'accented': 2,
    'native': 3
};

gcm.SKILL_DIFFICULTY_CP_COSTS = {
    'easy': 1,
    'average': 2,
    'hard': 4,
    'very_hard': 8
};


/*
    Common functions
*/
function gcm_log(msg) {
    if (console != null) {
        console.log(msg);
    } else {
        alert(msg);
    }
}

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
        gcm_log('Error. Unknown skill difficulty: ' + skill['difficulty']);
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


/*
    Init hook
*/
function gcm_init() {
    gcm_load_templates();
    gcm_load_character('./lib/example_character.json');
}

function gcm_make_editable() {
    var attributes = gcm.character.attributes;

    for (var attr_key in attributes) {
        var attribute = gcm.character.attributes;
        var target_element = '#' + attr_key + '_value';

        gcm_log('Attempting to make "' + target_element + '" editable.');

        $(target_element).editable({
            'type': 'text',
            'title': 'Enter a new value.',

            'success': (
                function (name) {
                    return function (response, new_attr_value) {
                        var parsed_value = parseFloat(new_attr_value);

                        gcm_log('new value for ' + name + ': ' + parsed_value);

                        gcm.character.attributes[name] = parsed_value;
                        gcm_render_character();
                    }
                })(attr_key)
        });
    }
}

function gcm_load_templates() {
    gcm.templates = {};

    gcm_log('Loading templates,');

    $.ajax({
        'url': './templates/index.json',
        'async': false,
        'success': gcm_load_templates_from_index
    });
}

function gcm_load_templates_from_index(index) {
    var templates = index['templates'];

    for (var i in templates) {
        var template = templates[i];
        var key = /(.*)(?:.template.html)/.exec(template)[1];

        $.ajax({
            'url': './templates/' + template,
            'async': false,
            'success': function (data) {
                gcm_log('Loaded template: ' + key);
                gcm.templates[key] = data;
            }
        });
    }
}

function gcm_calculate_basic_attribute_cost(attributes) {
    var cp_cost = 0;

    cp_cost += (attributes['strength'] - 10) * 10;
    gcm_log('Strength CP cost: ' + (attributes['strength'] - 10) * 10);

    cp_cost += (attributes['dexterity'] - 10) * 20;
    gcm_log('Dexterity CP cost: ' + (attributes['dexterity'] - 10) * 20);

    cp_cost += (attributes['iq'] - 10) * 20;
    gcm_log('IQ CP cost: ' + (attributes['iq'] - 10) * 20);

    cp_cost += (attributes['health'] - 10) * 10;
    gcm_log('Health CP cost: ' + (attributes['health'] - 10) * 10);

    cp_cost += (attributes['hp'] - attributes['strength']) * 2;
    gcm_log('HP CP cost: ' + (attributes['hp'] - attributes['strength']) * 2);

    cp_cost += (attributes['will'] - attributes['iq']) * 5;
    gcm_log('Will CP cost: ' + (attributes['will'] - attributes['iq']) * 5);

    cp_cost += (attributes['perception'] - attributes['iq']) * 5;
    gcm_log('Preception CP cost: ' + (attributes['perception'] - attributes['iq']) * 5);

    cp_cost += (attributes['fp'] - attributes['health']) * 3;
    gcm_log('FP CP cost: ' + (attributes['fp'] - attributes['health']) * 3);

    cp_cost += attributes['basic_speed'] * 20;
    gcm_log('Basic Speed CP cost: ' + attributes['basic_speed'] * 20);

    cp_cost += attributes['basic_move'] * 5;
    gcm_log('Basic Move CP cost: ' + attributes['basic_move'] * 5);

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

            gcm_log('Skill: ' + skill['name'] + ' - Cost: ' + cost);
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
    Manipulation functions
*/
function gcm_update_attribute(key, new_value) {

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
    gcm_log('Rendering character');

    gcm_render_character_cp_values(gcm.character);
    gcm_render_character_identity(gcm.character);
    gcm_render_character_physical_features(gcm.character['physical_features']);
    gcm_render_character_attributes(gcm.character['attributes']);
    gcm_render_character_culture_features(gcm.character['culture_features']);
    gcm_render_character_advantages(gcm.character['advantages']);
    gcm_render_character_skills(gcm.character['skills']);
    gcm_render_character_disadvantages(gcm.character['disadvantages']);

    gcm_make_editable();
}

function gcm_render_character_cp_values(character) {
    var initial_cp = character['initial_cp'];
    $('#initial_cp_value').html(initial_cp);
    gcm_log('Initial CP: ' + initial_cp);

    var bonus_cp = character['bonus_cp'];
    $('#bonus_cp_value').html(bonus_cp);
    gcm_log('Bonus CP: ' + bonus_cp);

    var basic_attribute_cp_cost = gcm_calculate_basic_attribute_cost(character['attributes']);
    gcm_log('Basic attribute CP cost: ' + basic_attribute_cp_cost);

    var physical_features_cp_cost = gcm_calculate_physical_features_cost(character['physical_features']);
    gcm_log('Physical Feature CP cost: ' + physical_features_cp_cost);

    var culture_features_cost = gcm_calculate_culture_features_cost(character['culture_features']);
    gcm_log('Cluture Feature CP cost: ' + culture_features_cost);

    var advantages_cp_cost = gcm_calculate_advantages_cost(character['advantages']);
    gcm_log('Advantage CP cost: ' + advantages_cp_cost);

    var skills_cp_cost = gcm_calculate_skills_cost(character['skills']);
    gcm_log('Skill CP cost: ' + skills_cp_cost);

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

    gcm_log('Basic lift: ' + basic_lift);
    gcm_log('Basic move: ' + basic_move);
    gcm_log('Basic speed: ' + basic_speed);
    gcm_log('Dodge: ' + dodge);

    var movement_obj = {
        "encumbrance": {
            "none": basic_lift,
            "light": (basic_lift * 2).toFixed(2),
            "medium": (basic_lift * 3).toFixed(2),
            "heavy": (basic_lift * 6).toFixed(2),
            "x_heavy": (basic_lift * 10).toFixed(2)
        },

        "move": {
            "none": Math.floor(basic_move),
            "light": Math.floor(basic_move * 0.8),
            "medium": Math.floor(basic_move * 0.6),
            "heavy": Math.floor(basic_move * 0.4),
            "x_heavy": Math.floor(basic_move * 0.2)
        },

        "dodge": {
            "none": dodge,
            "light": dodge - 1,
            "medium": dodge - 2,
            "heavy": dodge - 3,
            "x_heavy": dodge - 4
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
