/*
    Constants
*/
var SKILL_DIFFICULTY_CP_COSTS = {
    'easy': 1,
    'average': 2,
    'hard': 4,
    'very_hard': 8
};

var LANGUAGE_FLUENCY_COST_MAP = {
    'broken': 1,
    'accented': 2,
    'native': 3
}


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
    var cost = SKILL_DIFFICULTY_CP_COSTS[skill['difficulty']];

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

    gcm_log('Skill: ' + skill['name'] + ' - Cost: ' + cost);

    return cost;
}

function gcm_basic_speed(attributes) {
    return (attributes['dexterity'] + attributes['health']) / 4 + attributes['basic_speed'];
}

function gcm_basic_move(attributes) {
    return gcm_basic_speed(attributes) + attributes['basic_move'];
}


/*
    Init hook
*/
function gcm_init() {
    gcm_load_character('./lib/example_character.json');
}


/*
    Rendering functions
*/
function gcm_load_character(location) {
    $.get(location, gcm_display_character);
}

function gcm_display_character(character) {
    gcm_render_character_cp_values(character);
    gcm_render_character_identity(character);
    gcm_render_character_physical_features(character['physical_features']);
    gcm_render_character_attributes(character['attributes']);
    gcm_render_character_culture_features(character['culture_features']);
    gcm_render_character_advantages(character['advantages']);
    gcm_render_character_skills(character['skills']);
    gcm_render_character_disadvantages(character['disadvantages']);
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
    var fluency_modifier = LANGUAGE_FLUENCY_COST_MAP[language['fluency']];
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
            cp_cost += gcm_skill_cp_cost(skills[i]);
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
}

function gcm_render_character_attributes(attributes) {
    for (var attr_key in attributes) {
        var target_element = '#' + attr_key + '_value';
        $(target_element).html(attributes[attr_key]);
    }
}

function gcm_render_character_culture_features(culture_features) {
    gcm_render_character_languages(culture_features['languages']);
    gcm_render_character_culture_familiarities(culture_features['familiarities']);
}

function gcm_render_character_languages(languages) {
    $.get('./templates/language_table.template.html', function (template) {
        var html = '';

        for (var i in languages) {
            html += gcm_process_template(template, languages[i]);
        }

        $('#language_tables_tbody').html(html);
    });
}

function gcm_render_character_culture_familiarities(culture_familiarities) {
    $.get('./templates/culture_familiarity_table.template.html', function (template) {
        var html = '';

        for (var i in culture_familiarities) {
            html += gcm_process_template(template, culture_familiarities[i]);
        }

        $('#cluture_familiaritiy_tables_pane').html(html);
    });
}

function gcm_render_character_advantages(advantages) {
    $.get('./templates/advantage_table.template.html', function (template) {
        var html = '';

        for (var i in advantages) {
            html += gcm_process_template(template, advantages[i]);
        }

        $('#advantage_tables_pane').html(html);
    });
}

function gcm_render_character_advantages(advantages) {
    $.get('./templates/advantage_table.template.html', function (template) {
        var html = '';

        for (var i in advantages) {
            html += gcm_process_template(template, advantages[i]);
        }

        $('#advantage_tables_pane').html(html);
    });
}

function gcm_render_character_skills(skills) {
    $.get('./templates/skill_table.template.html', function (template) {
        var html = '';

        for (var i in skills) {
            var skill = skills[i];
            skill['cp_cost'] = gcm_skill_cp_cost(skill);

            html += gcm_process_template(template, skill);
        }

        $('#skill_tables_pane').html(html);
    });
}

function gcm_render_character_disadvantages(disadvantage) {
    $.get('./templates/disadvantage_table.template.html', function (template) {
        var html = '';

        for (var i in disadvantage) {
            html += gcm_process_template(template, disadvantage[i]);
        }

        $('#disadvantage_tables_pane').html(html);
    });
}
